import type { Recording } from './recorder.types.ts';

/** The largest side a video may have, pixels: 4K's. */
export const LARGEST_SIDE = 3840;

/**
 * The longest a video may run, seconds: an hour, past any city's history at the slowest speed and a
 * plan after it. Only a runaway's stop: a video ends itself, its length known only as it plays.
 */
export const LONGEST_SECONDS = 60 * 60;

/**
 * A recording's settings where none are given: the video page, laid out at 1080p and drawn at twice
 * that (4K, as sharp as a Retina screen shows it), at 60 frames a second, from the app as it is served
 * in development, for as long as it plays, up to `LONGEST_SECONDS`. The command's defaults and the video
 * page's alike: this file takes nothing of Node's, so the page reads it too.
 */
export const RECORDING_DEFAULTS: Omit<Recording, 'city' | 'out' | 'status'> = {
  page: 'video',
  rehearse: true,
  fps: 60,
  width: 1920,
  height: 1080,
  scale: 2,
  seconds: LONGEST_SECONDS,
  origin: 'http://localhost:5180',
  query: '',
};
