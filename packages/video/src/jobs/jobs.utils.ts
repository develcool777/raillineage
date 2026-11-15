import type { RecordingStatus } from '../recorder/recorder.types.ts';
import { LARGEST_SIDE, LONGEST_SECONDS, MOST_FPS, MOST_SCALE, RECORDER_GONE, RUNNING_PHASES } from './jobs.constants.ts';
import type { ByteRange, RecordingRequest } from './jobs.types.ts';

/** A city's id, as the address names it. */
const CITY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** An address's query as a page asks for its video: names and values of letters, digits and `-._~%+`, joined by `=` and `&`. */
const QUERY = /^[\w%.~+=&-]*$/;

/** A video's file name: letters, digits, `-`, `_` and `.`, ending `.mp4`, never hidden, never a path. */
const VIDEO_NAME = /^[\w-]+(?:\.[\w-]+)*\.mp4$/;

/**
 * Whether a name is one a video may be saved as: a file in the videos folder, never a path out of it,
 * nor one hidden, as a video is while it is written.
 *
 * @param name - The name.
 * @returns Whether it is.
 */
export const isVideoName = (name: string): boolean => VIDEO_NAME.test(name);

/**
 * Whether a recording is still under way, as its status says.
 *
 * @param status - Its status; `null` for none started.
 * @returns Whether it is.
 */
export const isRunning = (status: RecordingStatus | null): boolean => status !== null && RUNNING_PHASES.has(status.phase);

/**
 * A recording's status as it truly is: one that says it is under way, whose process has gone, failed.
 *
 * @param status - What its status file says; `null` for none.
 * @param alive - Whether a process is still running.
 * @returns The status.
 */
export const statusAsSeen = (status: RecordingStatus | null, alive: (pid: number) => boolean): RecordingStatus | null => {
  if (status === null) return null;
  if (!isRunning(status)) return status;
  if (alive(status.pid)) return status;
  return { ...status, phase: 'failed', error: RECORDER_GONE };
};

/**
 * What the recorder's command is given to record a video: the arguments one would type after
 * `pnpm video:record`, which `recordingOf` reads back.
 *
 * @param request - The video asked for.
 * @param files - Where it writes the video and how far it has got.
 * @param files.out - The video.
 * @param files.status - Its status file.
 * @returns The command's arguments.
 */
export const argsOf = (request: RecordingRequest, files: { out: string; status: string }): string[] => [
  request.city,
  '--fps',
  String(request.fps),
  '--size',
  `${request.width}x${request.height}`,
  '--scale',
  String(request.scale),
  '--seconds',
  String(request.seconds),
  ...(request.rehearse ? [] : ['--no-rehearse']),
  ...(request.query ? ['--query', request.query] : []),
  '--out',
  files.out,
  '--status',
  files.status,
];

/**
 * A whole number in a range, from what a request gave.
 *
 * @param given - What it gave.
 * @param name - What it is, for the error.
 * @param largest - The largest it may be.
 * @returns The number.
 * @throws {Error} For anything else.
 */
const wholeOf = (given: unknown, name: string, largest: number): number => {
  if (typeof given !== 'number' || !Number.isSafeInteger(given) || given < 1 || given > largest)
    throw new Error(`${name} is a whole number from 1 to ${largest}`);
  return given;
};

/**
 * Text that matches a pattern, from what a request gave.
 *
 * @param given - What it gave.
 * @param pattern - What it must match.
 * @param what - What it is, for the error.
 * @returns The text.
 * @throws {Error} For anything else.
 */
const textOf = (given: unknown, pattern: RegExp, what: string): string => {
  if (typeof given !== 'string' || !pattern.test(given)) throw new Error(what);
  return given;
};

/**
 * What a request to record asks for, checked: it starts a process, so nothing unchecked reaches its arguments.
 *
 * @param body - The request's body.
 * @returns The request.
 * @throws {Error} Saying what is wrong, for anything else.
 */
export const requestOf = (body: unknown): RecordingRequest => {
  if (typeof body !== 'object' || body === null) throw new TypeError('say what to record');
  const given = body as Record<string, unknown>;
  if (typeof given.rehearse !== 'boolean') throw new TypeError('rehearse is true or false');
  const scale = wholeOf(given.scale, 'the scale', MOST_SCALE);
  // The video's sides, the page's drawn at its scale, are what may be no larger than 4K's.
  const largest = Math.floor(LARGEST_SIDE / scale);
  return {
    city: textOf(given.city, CITY_ID, 'the city is an id, as an address names it'),
    query: textOf(given.query, QUERY, "the query is an address's, plan=…&view=…"),
    fps: wholeOf(given.fps, 'the frame rate', MOST_FPS),
    width: wholeOf(given.width, 'the width', largest),
    height: wholeOf(given.height, 'the height', largest),
    scale,
    seconds: wholeOf(given.seconds, 'the longest it runs, in seconds,', LONGEST_SECONDS),
    rehearse: given.rehearse,
    name: textOf(given.name, VIDEO_NAME, 'the file is a name ending .mp4, of letters, digits, - and _'),
  };
};

/**
 * The part of a file a request's `Range` header asks for, so a video can be played from anywhere in it.
 *
 * @param header - The header, if any (`bytes=0-`, `bytes=100-199`, `bytes=-500`).
 * @param size - The file's size, bytes.
 * @returns Its first and last byte; `null` for the whole file, for no header or one this does not read.
 */
export const byteRangeOf = (header: string | undefined, size: number): ByteRange | null => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!match) return null;
  const [, first = '', last = ''] = match;
  if (first === '') {
    const suffix = Number(last);
    return suffix > 0 && size > 0 ? { start: Math.max(0, size - suffix), end: size - 1 } : null;
  }
  const start = Number(first);
  const end = last === '' ? size - 1 : Math.min(Number(last), size - 1);
  return start <= end ? { start, end } : null;
};
