import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import type { BrowserContext } from 'playwright-core';
import { describe, expect, onTestFinished, test, vi } from 'vitest';
import { OPEN_TIMEOUT_MS, WARM_UP_SECONDS } from '../../../src/recorder/recorder.constants.ts';
import { VideoRecorder } from '../../../src/recorder/recorder.service.ts';
import type { Recording, RecordingPhase, RecordingStatus } from '../../../src/recorder/recorder.types.ts';
import { drawnOnceHeld, pageUrlOf, recordingOf, writingOf } from '../../../src/recorder/recorder.utils.ts';
import type { RecordedWindow, VideoPageState } from '../../../src/recorder/videoPage.types.ts';

/** The folder the command was typed in. */
const TYPED_IN = '/home/someone/raillineage';

/** A frame's picture, as the stand-in page takes it. */
const FRAME = Buffer.from('frame');

/** Frames a second: few, so the warm-up and a whole recording take no time. */
const FPS = 4;

/**
 * What a page does under recording, on the clock only the recorder moves.
 *
 * @param behaviour - How it goes.
 * @param behaviour.readyAfter - How many frames it loads for.
 * @param behaviour.playsFor - How long it plays, ms, once started; for ever if not said.
 * @param behaviour.drawnAfter - How many times it is asked after each frame before it is drawn.
 * @param behaviour.onFrame - What else a frame moves.
 * @param behaviour.shotMs - How long a picture takes, ms.
 * @param behaviour.picture - What a picture is: a few bytes unless said.
 * @returns A browser with that page in it, and what was done to the page.
 */
const browserWith = ({ readyAfter = 2, playsFor = Infinity, drawnAfter = 0, onFrame = () => {}, shotMs = 0, picture = FRAME }) => {
  const seen = {
    loads: [] as string[],
    starts: 0,
    frameTimes: [] as number[],
    shots: 0,
    shotsUndrawn: 0,
    framesWhenStarted: [] as number[],
    closes: 0,
    socketsRouted: 0,
  };
  let state: VideoPageState = 'loading';
  let framesLoading = 0;
  let playedMs = 0;
  let timesAsked = 0;
  const scope: RecordedWindow = {
    raillineageRecorder: {
      advance: milliseconds => {
        if (milliseconds === 0) return;
        seen.frameTimes.push(milliseconds);
        timesAsked = 0;
        onFrame();
        framesLoading += 1;
        if (state === 'loading' && framesLoading >= readyAfter) state = 'ready';
        if (state !== 'playing') return;
        playedMs += milliseconds;
        if (playedMs >= playsFor) state = 'done';
      },
    },
    raillineageVideo: {
      state: () => state,
      start: () => {
        seen.starts += 1;
        seen.framesWhenStarted.push(seen.frameTimes.length);
        state = 'playing';
      },
      drawn: () => {
        timesAsked += 1;
        return timesAsked > drawnAfter;
      },
    },
  };
  vi.stubGlobal('window', scope);
  const listeners = new Map<string, () => void>();
  const page = {
    setDefaultTimeout: () => {},
    on: (event: string, listener: () => void) => {
      listeners.set(event, listener);
    },
    routeWebSocket: () => {
      seen.socketsRouted += 1;
      return Promise.resolve();
    },
    addInitScript: () => Promise.resolve(),
    goto: (url: string) => {
      seen.loads.push(url);
      listeners.get('domcontentloaded')?.();
      state = 'loading';
      framesLoading = 0;
      playedMs = 0;
      return Promise.resolve();
    },
    evaluate: (script: string | ((argument?: unknown) => unknown), argument?: unknown) => {
      if (typeof script !== 'string') return Promise.resolve(script(argument));
      // The one thing the recorder runs in the page as text.
      if (script !== `(${drawnOnceHeld.toString()})(window)`) throw new Error(`what is this? ${script}`);
      return Promise.resolve(drawnOnceHeld(scope));
    },
    screenshot: async () => {
      seen.shots += 1;
      if (timesAsked <= drawnAfter) seen.shotsUndrawn += 1;
      await sleep(shotMs);
      return picture;
    },
  };
  const context = {
    pages: () => [page],
    close: () => {
      seen.closes += 1;
      return Promise.resolve();
    },
  };
  /** The page loading again by itself, as a dev server has it when a file it serves changes. */
  const reload = () => listeners.get('domcontentloaded')?.();
  return { context: context as unknown as BrowserContext, seen, reload };
};
/**
 * A folder of the test's own, taken away after it.
 *
 * @returns Its path.
 */
const folderApart = (): string => {
  const folder = mkdtempSync(join(tmpdir(), 'raillineage-'));
  onTestFinished(() => {
    rmSync(folder, { recursive: true });
  });
  return folder;
};

/**
 * A recording of a page served by nothing real, into a folder of the test's own, with a stand-in for
 * ffmpeg there that does as it is told.
 *
 * @param script - What the stand-in ffmpeg does, in `sh`; its last argument is the file to write.
 * @param overrides - What differs from a short recording rehearsed first.
 * @returns The recording, and where the stand-in is.
 */
const recordingApart = (script: string, overrides: Partial<Recording> = {}) => {
  const folder = folderApart();
  const ffmpeg = join(folder, 'ffmpeg');
  writeFileSync(ffmpeg, `#!/bin/sh\nfor out; do :; done\n${script}\n`);
  chmodSync(ffmpeg, 0o755);
  vi.stubGlobal('fetch', () => Promise.resolve(new Response()));
  return { ffmpeg, recording: { ...recordingOf(['kyiv', '--fps', String(FPS), '--seconds', '20'], TYPED_IN), out: join(folder, 'kyiv.mp4'), ...overrides } };
};
/** A stand-in ffmpeg that keeps what it is given. */
const KEEPS_FRAMES = 'cat > "$out"';

/**
 * What a recording's status file says now.
 *
 * @param recording - The recording, which names its status file.
 * @returns The status.
 */
const statusNow = (recording: Recording): RecordingStatus => JSON.parse(readFileSync(String(recording.status), 'utf8')) as RecordingStatus;

describe('VideoRecorder', () => {
  test('says to start the app when nothing serves it, before starting Chrome', async () => {
    const launch = vi.fn();
    // Port 9 (discard) has nothing listening on it.
    const recording = recordingOf(['kyiv', '--origin', 'http://127.0.0.1:9'], TYPED_IN);
    await expect(new VideoRecorder({ launch, report: vi.fn() }).record(recording)).rejects.toThrow('nothing serves the app at http://127.0.0.1:9: start it');
    expect(launch).not.toHaveBeenCalled();
  });

  test('rehearses, no frame taken, then loads the page afresh and takes each frame, until the page says it is over', async () => {
    const { context, seen } = browserWith({ playsFor: 2000 });
    const { recording, ffmpeg } = recordingApart(KEEPS_FRAMES);
    const said: string[] = [];
    const report = (line: string) => {
      said.push(line);
    };
    await new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report }).record(recording);
    const frames = (2000 / 1000) * FPS;
    expect(seen.loads).toEqual([pageUrlOf(recording), pageUrlOf(recording)]);
    expect(seen.starts).toBe(2);
    expect(seen.shots).toBe(frames);
    expect(readFileSync(recording.out)).toEqual(Buffer.concat(Array.from({ length: frames }, () => FRAME)));
    expect(said).toEqual(['rehearsing, to fetch the tiles the camera will look at', 'rehearsed 2 s; recording', `${recording.out}: ${frames} frames, 2.0 s`]);
    expect(seen.closes).toBe(1);
  });

  test('writes the video hidden until it is whole, then in the place of one of its name', async () => {
    const { context } = browserWith({ playsFor: 1000 });
    const { recording, ffmpeg } = recordingApart(KEEPS_FRAMES, { rehearse: false });
    writeFileSync(recording.out, 'the video made before');
    await new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording);
    expect(readFileSync(recording.out)).toEqual(Buffer.concat(Array.from({ length: FPS }, () => FRAME)));
    expect(existsSync(writingOf(recording.out))).toBe(false);
  });

  test("cuts the page's live connections to the server, which would have it reload when a file changes", async () => {
    const { context, seen } = browserWith({ playsFor: 1000 });
    const { recording, ffmpeg } = recordingApart(KEEPS_FRAMES, { rehearse: false });
    await new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording);
    expect(seen.socketsRouted).toBe(1);
  });

  test('stops, and says so, when the page loads again by itself mid-take, Chrome closed and nothing written', async () => {
    let frames = 0;
    let reloadPage = () => {};
    const { context, seen, reload } = browserWith({
      onFrame: () => {
        frames += 1;
        if (frames === 20) reloadPage();
      },
    });
    reloadPage = reload;
    const { recording, ffmpeg } = recordingApart(KEEPS_FRAMES, { rehearse: false, seconds: 600 });
    await expect(new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording)).rejects.toThrow(
      'the page loaded again while it was recorded',
    );
    expect(frames).toBe(20);
    expect(seen.closes).toBe(1);
    expect(existsSync(recording.out)).toBe(false);
  });

  test('stops at the longest the recording runs, for a page that never says it is over', async () => {
    const { context, seen } = browserWith({});
    const { recording, ffmpeg } = recordingApart(KEEPS_FRAMES, { rehearse: false, seconds: 3 });
    await new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording);
    expect(seen.shots).toBe(3 * FPS);
  });

  test('skips the rehearsal when told, the page loaded once', async () => {
    const { context, seen } = browserWith({ playsFor: 1000 });
    const { recording, ffmpeg } = recordingApart(KEEPS_FRAMES, { rehearse: false });
    await new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording);
    expect(seen.loads).toHaveLength(1);
    expect(seen.starts).toBe(1);
  });

  test('moves the clock a frame at a time, until the page is ready and for the warm-up after, before starting it', async () => {
    const { context, seen } = browserWith({ readyAfter: 5, playsFor: 1000 });
    const { recording, ffmpeg } = recordingApart(KEEPS_FRAMES, { rehearse: false });
    await new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording);
    expect(seen.framesWhenStarted).toEqual([5 + WARM_UP_SECONDS * FPS]);
    expect(new Set(seen.frameTimes)).toEqual(new Set([1000 / FPS]));
  });

  test('takes no frame until the page says it is drawn', async () => {
    const { context, seen } = browserWith({ drawnAfter: 2, playsFor: 1000 });
    const { recording, ffmpeg } = recordingApart(KEEPS_FRAMES, { rehearse: false });
    await new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording);
    expect(seen.shots).toBe(FPS);
    expect(seen.shotsUndrawn).toBe(0);
  });

  test('says so of a page that never gets ready, and closes Chrome', async () => {
    let clock = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    const { context, seen } = browserWith({
      readyAfter: Infinity,
      onFrame: () => {
        clock += OPEN_TIMEOUT_MS / 2;
      },
    });
    const { recording, ffmpeg } = recordingApart(KEEPS_FRAMES, { rehearse: false });
    await expect(new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording)).rejects.toThrow(
      `the page never got ready to play: ${pageUrlOf(recording)}`,
    );
    expect(seen.shots).toBe(0);
    expect(seen.closes).toBe(1);
  });

  test('stops taking frames once ffmpeg has gone, and says what it said, Chrome closed', async () => {
    const { context, seen } = browserWith({ shotMs: 5 });
    const { recording, ffmpeg } = recordingApart('echo no codec >&2; exit 3', { rehearse: false, seconds: 600 });
    await expect(new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording)).rejects.toThrow(
      'ffmpeg failed (3): no codec',
    );
    expect(seen.shots).toBeLessThan(600 * FPS);
    expect(seen.closes).toBe(1);
  });

  // A frame bigger than ffmpeg's input holds waits for it to be read; ffmpeg gone then breaks its input
  // under it (EPIPE), and what ffmpeg said is still what is said.
  test('says what ffmpeg said when it goes while a frame waits to be written', async () => {
    const { context } = browserWith({ picture: Buffer.alloc(4 * 1024 * 1024) });
    const { recording, ffmpeg } = recordingApart('sleep 0.2; echo no codec >&2; exit 3', { rehearse: false, seconds: 600 });
    await expect(new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg, report: vi.fn() }).record(recording)).rejects.toThrow(
      'ffmpeg failed (3): no codec',
    );
  });

  test('writes how far it has got to its status file as it goes, each phase in turn, ending done', async () => {
    const phases: RecordingPhase[] = [];
    let recording: Recording | null = null;
    const { context } = browserWith({
      playsFor: 2000,
      onFrame: () => {
        if (recording && existsSync(String(recording.status))) phases.push(statusNow(recording).phase);
      },
    });
    const apart = recordingApart(KEEPS_FRAMES);
    recording = { ...apart.recording, status: `${apart.recording.out}.status.json` };
    await new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg: apart.ffmpeg, report: vi.fn() }).record(recording);
    expect([...new Set(phases)]).toEqual(['rehearsing', 'recording']);
    expect(statusNow(recording)).toEqual({ pid: process.pid, city: 'kyiv', out: recording.out, phase: 'done', seconds: 2, limit: 20, error: null });
  });

  test('says in its status file why it failed', async () => {
    // Port 9 (discard) has nothing listening on it.
    const recording = { ...recordingOf(['kyiv', '--origin', 'http://127.0.0.1:9'], TYPED_IN), status: join(folderApart(), 'status.json') };
    await expect(new VideoRecorder({ launch: vi.fn(), report: vi.fn() }).record(recording)).rejects.toThrow('nothing serves the app');
    expect(statusNow(recording)).toMatchObject({ phase: 'failed', error: expect.stringContaining('nothing serves the app at http://127.0.0.1:9') });
  });

  test('stops at the next frame when cancelled, Chrome and ffmpeg closed, nothing written, a video of its name kept, and says so', async () => {
    let recorder: VideoRecorder | null = null;
    let frames = 0;
    const { context, seen } = browserWith({
      onFrame: () => {
        frames += 1;
        if (frames === 30) recorder?.cancel();
      },
    });
    // As ffmpeg, it hears no request to stop while it waits for the next frame.
    const apart = recordingApart(`trap '' TERM; ${KEEPS_FRAMES}`, { rehearse: false, seconds: 600 });
    const recording = { ...apart.recording, status: `${apart.recording.out}.status.json` };
    writeFileSync(recording.out, 'the video made before');
    recorder = new VideoRecorder({ launch: () => Promise.resolve(context), ffmpeg: apart.ffmpeg, report: vi.fn() });
    await expect(recorder.record(recording)).rejects.toThrow('cancelled');
    expect(frames).toBe(30);
    expect(seen.closes).toBe(1);
    expect(readFileSync(recording.out, 'utf8')).toBe('the video made before');
    expect(existsSync(writingOf(recording.out))).toBe(false);
    expect(statusNow(recording)).toMatchObject({ phase: 'cancelled', error: 'cancelled' });
  });
});
