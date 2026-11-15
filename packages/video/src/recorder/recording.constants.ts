import type { Recording } from './recorder.types.ts';

/**
 * A recording's settings where none are given: the video page, 1080p at 60 frames a second, from the app
 * as it is served in development, for up to 15 minutes, long enough for a city's history and a plan
 * after it. The command's defaults and the video page's alike: this file takes nothing of Node's, so the
 * page reads it too.
 */
export const RECORDING_DEFAULTS: Omit<Recording, 'city' | 'out' | 'status'> = {
  page: 'video',
  rehearse: true,
  fps: 60,
  width: 1920,
  height: 1080,
  seconds: 15 * 60,
  origin: 'http://localhost:5180',
  query: '',
};
