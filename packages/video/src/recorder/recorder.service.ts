import { type ChildProcessByStdio, spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import { type BrowserContext, chromium, type Page } from 'playwright-core';
import { BROWSER_PROFILE, DRAWN_POLL_MS, DRAWN_TIMEOUT_MS, FRAME_QUALITY, OPEN_TIMEOUT_MS, WARM_UP_SECONDS } from './recorder.constants.ts';
import type { RecorderOptions, Recording, RecordingPhase } from './recorder.types.ts';
import {
  drawnOnceHeld,
  ffmpegArgsOf,
  ffmpegPathOf,
  installRecordingClock,
  launchOptionsOf,
  pageUrlOf,
  statusOf,
  untilDrawn,
  writingOf,
} from './recorder.utils.ts';
import { StatusFile } from './statusFile.service.ts';
import type { RecordedWindow, VideoPageState } from './videoPage.types.ts';

/**
 * Records a city's page playing its history as a video: the page, in the Chrome installed on this
 * machine, runs on a clock only the recorder moves (`installRecordingClock`); each frame it is moved
 * on by one frame's time, held until the page says it is drawn, and taken as a picture, which ffmpeg
 * encodes. A slow frame makes the recording slower, never the video uneven. It records from the app as
 * it is served, and knows a page only by its handle (`VideoPageHandle`): from when it
 * starts it until the page says it is over.
 *
 * Before the take it rehearses: the page plays through once, no frame taken, so every tile the
 * camera will look at is fetched. The clock moves the same way both times, so the camera takes the
 * same path, and the take finds its tiles in the browser's cache: Chrome's own profile, kept between
 * recordings (`BROWSER_PROFILE`), so a city recorded again finds them there already.
 *
 * As it goes it writes how far it has got to the recording's status file, if it names one: what started
 * it as a process of its own (the video page's Record button) reads it. The video is written beside its
 * file, hidden (`writingOf`), and takes its name only once whole: a video already there is replaced by a
 * finished one, never lost to one cancelled or failed. Cancelled, it stops at the next frame and closes
 * Chrome and ffmpeg.
 */
export class VideoRecorder {
  /** Starts the browser. */
  private readonly launch: (recording: Recording) => Promise<BrowserContext>;
  /** Finds ffmpeg, or says how to install it. */
  private readonly ffmpegPath: () => string;
  /** What it says as it goes. */
  private readonly report: RecorderOptions['report'];
  /** The browser, once started: Chrome on its own profile, which keeps its cache. */
  private context: BrowserContext | null = null;
  /** ffmpeg, while it encodes. */
  private encoder: ChildProcessByStdio<Writable, null, Readable> | null = null;
  /** Settles when ffmpeg is done: its exit code, or what kept it from starting. */
  private encoded: Promise<number | Error | null> = Promise.resolve(null);
  /** What ffmpeg said went wrong. */
  private encoderSaid: string[] = [];
  /** Asked to stop: it does at the next frame. */
  private cancelled = false;
  /** Loads of the page the recorder asked for, not yet come: a document loaded beyond them is a reload it did not ask for. */
  private loadsAsked = 0;
  /** The page loaded again when not asked to: what it showed is gone. */
  private reloaded = false;

  public constructor(options: RecorderOptions) {
    this.report = options.report;
    this.launch = options.launch ?? (recording => chromium.launchPersistentContext(BROWSER_PROFILE, launchOptionsOf(recording)));
    this.ffmpegPath = () => options.ffmpeg ?? ffmpegPathOf(existsSync);
  }

  /**
   * Records the video and writes it: rehearsed first, unless asked not to. Its status file, if it has
   * one, ends saying it is done, failed or cancelled.
   *
   * @param recording - The page, its size, the frames a second, the longest it runs, the file.
   * @throws {Error} For no app at the origin, no ffmpeg installed, a page that never plays, a video ffmpeg did not write, or cancelled; Chrome and ffmpeg are closed, and a video already at its file kept, either way.
   */
  public async record(recording: Recording): Promise<void> {
    this.tell(recording, 'starting', 0);
    try {
      const seconds = await this.take(recording);
      this.tell(recording, 'done', seconds);
    } catch (error) {
      rmSync(writingOf(recording.out), { force: true });
      this.tell(recording, this.cancelled ? 'cancelled' : 'failed', 0, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /** Stops the recording at its next frame: `record` then throws, Chrome and ffmpeg closed, nothing written. */
  public cancel(): void {
    this.cancelled = true;
  }

  /**
   * Records the video: rehearsed first, unless asked not to.
   *
   * @param recording - The recording.
   * @returns How long the video is, seconds.
   */
  private async take(recording: Recording): Promise<number> {
    await this.checkServed(recording.origin);
    const ffmpeg = this.ffmpegPath();
    try {
      const page = await this.open(recording);
      if (recording.rehearse) {
        this.report('rehearsing, to fetch the tiles the camera will look at');
        this.tell(recording, 'rehearsing', 0);
        await this.load(page, recording);
        const rehearsed = await this.play(page, recording, null);
        this.report(`rehearsed ${(rehearsed / recording.fps).toFixed(0)} s; recording`);
      }
      this.tell(recording, 'recording', 0);
      await this.load(page, recording);
      const encoder = this.startEncoder({ ...recording, out: writingOf(recording.out) }, ffmpeg);
      const frames = await this.play(page, recording, async frame => {
        // ffmpeg gone (not installed, or failed) is said by `finish`.
        if (encoder.stdin.destroyed) return false;
        if (!encoder.stdin.write(frame)) await Promise.race([this.drained(encoder.stdin), this.encoded]);
        return true;
      });
      this.tell(recording, 'encoding', frames / recording.fps);
      await this.finish();
      renameSync(writingOf(recording.out), recording.out);
      this.report(`${recording.out}: ${frames} frames, ${(frames / recording.fps).toFixed(1)} s`);
      return frames / recording.fps;
    } finally {
      // Whatever started is closed, or the command would never end. ffmpeg cut short is killed, never
      // asked to stop: it hears a stop only between frames, so one waiting on its open input for the next
      // would never end. What it was writing is thrown away, and it is waited for, so nothing writes once
      // that is gone.
      if (this.encoder) {
        this.encoder.stdin.destroy();
        this.encoder.kill('SIGKILL');
        await this.encoded;
      }
      this.encoder = null;
      await this.context?.close();
      this.context = null;
    }
  }

  /**
   * Writes how far the recording has got to its status file, if it names one.
   *
   * @param recording - The recording.
   * @param phase - How far it has got.
   * @param seconds - How far it has played, seconds of video.
   * @param error - What went wrong, once it failed.
   */
  private tell(recording: Recording, phase: RecordingPhase, seconds: number, error: string | null = null): void {
    if (recording.status === null) return;
    new StatusFile(recording.status).write(statusOf(recording, process.pid, phase, seconds, error));
  }

  /**
   * Fails at once, and says what to do, when nothing serves the app.
   *
   * @param origin - Where the app should be served.
   * @throws {Error} When nothing answers there.
   */
  private async checkServed(origin: string): Promise<void> {
    try {
      await fetch(origin, { method: 'HEAD' });
    } catch (error) {
      throw new Error(`nothing serves the app at ${origin}: start it, or give another origin`, { cause: error });
    }
  }

  /**
   * Starts Chrome, with a page that runs on the recording clock.
   *
   * @param recording - The recording.
   * @returns The page.
   */
  private async open(recording: Recording): Promise<Page> {
    this.context = await this.launch(recording);
    const page = this.context.pages()[0] ?? (await this.context.newPage());
    page.setDefaultTimeout(OPEN_TIMEOUT_MS);
    page.on('pageerror', error => this.report(`recorded page: ${error.message}`));
    // A document loaded, not the page changing its own address, which it may as it starts.
    page.on('domcontentloaded', () => {
      if (this.loadsAsked > 0) this.loadsAsked -= 1;
      else this.reloaded = true;
    });
    // Its live connections to the server are answered by nothing: a dev server tells a page to reload
    // when a file it serves changes, which would lose the take.
    await page.routeWebSocket(
      () => true,
      () => {},
    );
    // Run in the page as written, on its own `window`, before any of its scripts, each time it loads.
    await page.addInitScript({ content: `(${installRecordingClock.toString()})(window);` });
    return page;
  }

  /**
   * Loads the city's page afresh, and runs it until it can play.
   *
   * @param page - The page.
   * @param recording - The recording.
   * @throws {Error} For a page that never gets ready.
   */
  private async load(page: Page, recording: Recording): Promise<void> {
    this.loadsAsked += 1;
    await page.goto(pageUrlOf(recording), { waitUntil: 'domcontentloaded' });
    // Its frames run only as the clock moves: moved on until it is ready, then a little more.
    const frameMs = 1000 / recording.fps;
    const deadline = Date.now() + OPEN_TIMEOUT_MS;
    while ((await this.stateOf(page)) !== 'ready') {
      if (Date.now() > deadline) throw new Error(`the page never got ready to play: ${pageUrlOf(recording)}`);
      await this.step(page, frameMs);
    }
    for (let frame = 0; frame < WARM_UP_SECONDS * recording.fps; frame++) await this.step(page, frameMs);
  }

  /**
   * Plays the page a frame at each step of the clock, until it says it is over, or the longest the
   * recording runs: each frame taken, or, rehearsing, only drawn.
   *
   * @param page - The page, ready to play.
   * @param recording - The recording.
   * @param take - What is done with each frame's picture, saying whether to go on; `null` to take none.
   * @returns How many frames it played.
   */
  private async play(page: Page, recording: Recording, take: ((frame: Buffer) => Promise<boolean>) | null): Promise<number> {
    const frameMs = 1000 / recording.fps;
    await page.evaluate(() => (window as RecordedWindow).raillineageVideo?.start());
    let played = 0;
    while (played < recording.seconds * recording.fps) {
      await this.step(page, frameMs);
      if (take && !(await take(await page.screenshot({ type: 'jpeg', quality: FRAME_QUALITY })))) break;
      played++;
      // Once a second, whether it still plays, and how far it has got.
      if (played % recording.fps !== 0) continue;
      this.tell(recording, take ? 'recording' : 'rehearsing', played / recording.fps);
      if ((await this.stateOf(page)) === 'done') break;
      if (played % (recording.fps * 10) === 0) this.report(`${(played / recording.fps).toFixed(0)} s ${take ? 'recorded' : 'rehearsed'}`);
    }
    return played;
  }

  /**
   * Starts ffmpeg, taking frames on its input; what it says and how it ends are kept for `finish`.
   *
   * @param recording - The recording.
   * @param ffmpeg - Where ffmpeg is.
   * @returns ffmpeg.
   */
  private startEncoder(recording: Recording, ffmpeg: string): ChildProcessByStdio<Writable, null, Readable> {
    mkdirSync(dirname(recording.out), { recursive: true });
    const encoder = spawn(ffmpeg, ffmpegArgsOf(recording), { stdio: ['pipe', 'ignore', 'pipe'] });
    this.encoder = encoder;
    this.encoderSaid = [];
    encoder.stderr.on('data', (chunk: Buffer) => {
      this.encoderSaid.push(chunk.toString());
    });
    // Its input closes under a frame being written when it stops: said by how it ended.
    encoder.stdin.on('error', () => {});
    this.encoded = new Promise(resolve => {
      encoder.on('error', resolve);
      encoder.on('close', resolve);
    });
    return encoder;
  }

  /**
   * Waits for ffmpeg to read a frame its input could not hold yet. ffmpeg gone breaks the input under
   * it (EPIPE), which ends the wait too: the next frame sees the input destroyed, and `finish` says what
   * ffmpeg said, where the error would have said only "write EPIPE".
   *
   * @param input - ffmpeg's input.
   */
  private async drained(input: Writable): Promise<void> {
    try {
      await once(input, 'drain');
    } catch {
      // ffmpeg is gone: said by how it ended.
    }
  }

  /**
   * Ends ffmpeg's input and waits for it to write the video.
   *
   * @throws {Error} For no ffmpeg, or one that failed: what it said.
   */
  private async finish(): Promise<void> {
    if (!this.encoder) return;
    this.encoder.stdin.end();
    const ended = await this.encoded;
    this.encoder = null;
    if (ended instanceof Error) throw new Error(`ffmpeg did not start: ${ended.message}`, { cause: ended });
    if (ended !== 0) throw new Error(`ffmpeg failed (${ended}): ${this.encoderSaid.join('').trim()}`);
  }

  /**
   * Where the page is, as its handle says.
   *
   * @param page - The page.
   * @returns Where it is, or `null` before it has a handle.
   */
  private stateOf(page: Page): Promise<VideoPageState | null> {
    return page.evaluate(() => (window as RecordedWindow).raillineageVideo?.state() ?? null);
  }

  /**
   * Moves the page's clock on by one frame, then holds it there until the page says all of it is drawn:
   * asked with the clock held, so what the page waits on is what comes by itself, its tiles, never what
   * only the clock can finish.
   *
   * @param page - The page.
   * @param milliseconds - The frame's time.
   */
  private async step(page: Page, milliseconds: number): Promise<void> {
    if (this.cancelled) throw new Error('cancelled');
    if (this.reloaded) throw new Error('the page loaded again while it was recorded, so what it showed is gone: record it again');
    await page.evaluate(time => (window as RecordedWindow).raillineageRecorder?.advance(time), milliseconds);
    const deadline = Date.now() + DRAWN_TIMEOUT_MS;
    await untilDrawn(
      () => page.evaluate(`(${drawnOnceHeld.toString()})(window)`),
      () => sleep(DRAWN_POLL_MS),
      () => Date.now() > deadline,
    );
  }
}
