import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { BrowserType } from 'playwright-core';
import { FFMPEG_LOCATIONS, VIDEOS_FOLDER } from './recorder.constants.ts';
import type { DrawnScope, RecordedPageKind, Recording, RecordingPhase, RecordingScope, RecordingStatus } from './recorder.types.ts';
import { RECORDING_DEFAULTS } from './recording.constants.ts';

/**
 * A whole number at least 1, from an argument.
 *
 * @param name - The argument's name, for the error.
 * @param text - What was given, or nothing for the default.
 * @param fallback - The default.
 * @returns The number.
 * @throws {Error} For anything else.
 */
const countOf = (name: string, text: string | undefined, fallback: number): number => {
  if (text === undefined) return fallback;
  const count = Number(text);
  if (!Number.isSafeInteger(count) || count < 1) throw new Error(`--${name} takes a whole number, not ${text}`);
  return count;
};

/**
 * Whether an argument names a kind of page.
 *
 * @param text - What was given.
 * @returns Whether it is `video` or `explorer`.
 */
const isPageKind = (text: string): text is RecordedPageKind => text === 'video' || text === 'explorer';

/**
 * Where the app is served, from an argument.
 *
 * @param text - What was given.
 * @returns Its origin (`http://localhost:5180`), whatever path followed it.
 * @throws {Error} For anything that is not an address.
 */
const originOf = (text: string): string => {
  try {
    return new URL(text).origin;
  } catch (error) {
    throw new Error(`--origin takes an address (http://localhost:5180), not ${text}`, { cause: error });
  }
};

/**
 * Where the video goes: `videos/<city>.mp4` for none named, `videos/<name>` for a name alone, and a path
 * from the folder the command was run in.
 *
 * @param out - What `--out` says, if anything.
 * @param city - The city.
 * @param cwd - The folder the command was run in.
 * @returns The file's path.
 */
const outOf = (out: string | undefined, city: string, cwd: string): string => {
  if (out === undefined) return join(VIDEOS_FOLDER, `${city}.mp4`);
  if (basename(out) === out) return join(VIDEOS_FOLDER, out);
  return resolve(cwd, out);
};

/**
 * What the command's arguments ask to record.
 *
 * @param args - The arguments after the command: the city, then its options.
 * @param cwd - The folder the command was run in, which a path given is read from (pnpm runs it in the package's).
 * @returns The recording, its defaults filled in.
 * @throws {Error} For no city, an option it does not know, or a value it cannot read.
 */
export const recordingOf = (args: string[], cwd: string): Recording => {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    allowNegative: true,
    options: {
      page: { type: 'string' },
      rehearse: { type: 'boolean' },
      fps: { type: 'string' },
      size: { type: 'string' },
      scale: { type: 'string' },
      seconds: { type: 'string' },
      query: { type: 'string' },
      origin: { type: 'string' },
      out: { type: 'string' },
      status: { type: 'string' },
    },
  });
  const [city] = positionals;
  if (!city || positionals.length > 1) throw new Error('name one city');
  const size = /^(\d+)x(\d+)$/.exec(values.size ?? `${RECORDING_DEFAULTS.width}x${RECORDING_DEFAULTS.height}`);
  if (!size) throw new Error(`--size takes width x height (1920x1080), not ${values.size}`);
  const page = values.page ?? RECORDING_DEFAULTS.page;
  if (!isPageKind(page)) throw new Error(`--page takes video or explorer, not ${page}`);
  return {
    city,
    page,
    rehearse: values.rehearse ?? RECORDING_DEFAULTS.rehearse,
    fps: countOf('fps', values.fps, RECORDING_DEFAULTS.fps),
    width: countOf('size', size[1], RECORDING_DEFAULTS.width),
    height: countOf('size', size[2], RECORDING_DEFAULTS.height),
    scale: countOf('scale', values.scale, RECORDING_DEFAULTS.scale),
    seconds: countOf('seconds', values.seconds, RECORDING_DEFAULTS.seconds),
    origin: originOf(values.origin ?? RECORDING_DEFAULTS.origin),
    query: (values.query ?? RECORDING_DEFAULTS.query).replace(/^\?/, ''),
    out: outOf(values.out, city, cwd),
    status: values.status === undefined ? null : resolve(cwd, values.status),
  };
};

/**
 * Where a video is written until it is whole: beside its file, hidden, so nothing lists it and a video
 * already at the file stays until the new one takes its place.
 *
 * @param out - The video's file.
 * @returns Where it is written meanwhile (`videos/.kyiv.mp4`).
 */
export const writingOf = (out: string): string => join(dirname(out), `.${basename(out)}`);

/**
 * A recording as its status file says it.
 *
 * @param recording - The recording.
 * @param pid - The recorder's process.
 * @param phase - How far it has got.
 * @param seconds - How far it has played, seconds of video.
 * @param error - What went wrong, once it failed.
 * @returns Its status.
 */
export const statusOf = (recording: Recording, pid: number, phase: RecordingPhase, seconds: number, error: string | null = null): RecordingStatus => ({
  pid,
  city: recording.city,
  out: recording.out,
  phase,
  seconds,
  limit: recording.seconds,
  error,
});

/**
 * The address of the page recorded.
 *
 * @param recording - The recording.
 * @returns The city's video page or explorer, with the query given.
 */
export const pageUrlOf = (recording: Recording): string => {
  const city = encodeURIComponent(recording.city);
  const url = new URL(recording.page === 'video' ? `/video/${city}` : `/${city}`, recording.origin);
  url.search = recording.query;
  return url.href;
};

/**
 * Where ffmpeg is: the first of the places it is installed to that has it.
 *
 * @param installed - Whether a file is there.
 * @returns Its path.
 * @throws {Error} For none, saying how to install it.
 */
export const ffmpegPathOf = (installed: (path: string) => boolean): string => {
  const found = FFMPEG_LOCATIONS.find(installed);
  if (!found) throw new Error(`no ffmpeg in ${FFMPEG_LOCATIONS.join(', ')}: install it (brew install ffmpeg)`);
  return found;
};

/**
 * How ffmpeg is called to make the video: JPEG frames on its input, one each frame, into an H.264
 * MP4 every player and YouTube take (4:2:0 colour, its index at the front), near lossless. Its colour
 * is HD's standard, said in the file (BT.709, video range): a JPEG's own, kept, is full range by an older
 * standard, which players guess at, and many guess wrong, showing it washed out or its reds shifted.
 *
 * @param recording - The recording.
 * @returns ffmpeg's arguments.
 */
export const ffmpegArgsOf = (recording: Recording): string[] => [
  '-y',
  '-loglevel',
  'error',
  '-f',
  'image2pipe',
  '-framerate',
  String(recording.fps),
  '-c:v',
  'mjpeg',
  '-i',
  '-',
  '-vf',
  'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '18',
  '-movflags',
  '+faststart',
  recording.out,
];

/**
 * Puts a page on a clock only the recorder moves: its time stands still, and the frames it asks for
 * wait, until `raillineageRecorder.advance` moves it on one frame and runs them. A frame can then take as
 * long as it needs to draw and be taken, and the video still plays at an even pace. It is run in the
 * page before any of its own scripts, so it uses nothing from outside itself.
 *
 * @param scope - The page's globals: its `window`.
 */
export const installRecordingClock = (scope: RecordingScope): void => {
  const started = scope.Date.now();
  let elapsed = 0;
  let nextHandle = 1;
  let waiting = new Map<number, (time: number) => void>();
  scope.performance.now = () => elapsed;
  scope.Date.now = () => started + elapsed;
  scope.requestAnimationFrame = callback => {
    const handle = nextHandle++;
    waiting.set(handle, callback);
    return handle;
  };
  scope.cancelAnimationFrame = handle => waiting.delete(handle);
  scope.raillineageRecorder = {
    advance: milliseconds => {
      elapsed += milliseconds;
      // Those asked for while these run wait for the next frame, as in a browser.
      const due = waiting;
      waiting = new Map();
      for (const callback of due.values()) callback(elapsed);
    },
  };
};

/**
 * Draws the page again at the moment it is held at, and says whether that is all of it: the frames it
 * asked for run first, as what came meanwhile is drawn by them or asks for more, and the question is
 * asked in the same turn, so nothing can land between the drawing and the answer. A page with no handle
 * yet has nothing to wait for. Run in the page, so it uses nothing from outside itself.
 *
 * @param scope - The page's globals: its `window`.
 * @returns Whether a frame can be taken.
 */
export const drawnOnceHeld = (scope: DrawnScope): boolean => {
  scope.raillineageRecorder?.advance(0);
  return scope.raillineageVideo?.drawn() ?? true;
};

/**
 * Waits for a frame to be drawn, or for as long as a frame may wait.
 *
 * @param drawn - Draws the frame again, saying whether it is whole.
 * @param wait - Waits a little.
 * @param timedOut - Whether the frame has waited as long as it may.
 */
export const untilDrawn = async (drawn: () => Promise<boolean>, wait: () => Promise<unknown>, timedOut: () => boolean): Promise<void> => {
  while (!(await drawn()) && !timedOut()) await wait();
};

/**
 * How Chrome is started for a recording: the one installed, the page at its size, drawn at its scale, and
 * asking for all the motion there is, whatever the machine's own setting: what rolls in the video
 * follows the preference (`CountingNumber`), and the recording says what it wants. Ctrl+C and a stop
 * signal are the recorder's own (`cli.ts`): Playwright's would end the process before it could cancel.
 *
 * @param recording - The recording.
 * @returns The options.
 */
export const launchOptionsOf = (recording: Recording): Parameters<BrowserType['launchPersistentContext']>[1] => ({
  channel: 'chrome',
  viewport: { width: recording.width, height: recording.height },
  deviceScaleFactor: recording.scale,
  reducedMotion: 'no-preference',
  handleSIGINT: false,
  handleSIGTERM: false,
});
