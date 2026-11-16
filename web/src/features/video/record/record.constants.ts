import type { RecordSize } from './record.types';

/**
 * Where the video page asks the dev server to record (`POST`), how it goes (`GET`) and to stop it
 * (`DELETE`), and fetches a video (`GET …/videos/<name>`): under `pnpm dev` only (`modules/videoRecorder.ts`).
 */
export const RECORD_ROUTE = '/_video/record';

/**
 * The video's sizes offered, for YouTube and its Shorts: 4K, a 1080p page drawn twice as sharp (as a
 * Retina screen draws it), or a pixel to a pixel, which records faster (the Size tip says so). Each 4K
 * lays out as its 1080p.
 */
export const RECORD_SIZES: RecordSize[] = [
  { label: '4K · 16:9 · 3840 × 2160', width: 1920, height: 1080, scale: 2 },
  { label: '1080p · 16:9 · 1920 × 1080', width: 1920, height: 1080, scale: 1 },
  { label: '720p · 16:9 · 1280 × 720', width: 1280, height: 720, scale: 1 },
  { label: 'Shorts 4K · 9:16 · 2160 × 3840', width: 1080, height: 1920, scale: 2 },
  { label: 'Shorts · 9:16 · 1080 × 1920', width: 1080, height: 1920, scale: 1 },
];

/**
 * The longest a recording from the setup page may run, seconds: only a runaway's stop, as a video ends
 * itself, its length known only as it plays (each camera move as long as its way). An hour, past any
 * city's history at the slowest speed and a plan after it.
 */
export const RECORD_LIMIT_SECONDS = 60 * 60;

/** The frame rates offered. */
export const RECORD_FPS = [60, 30];

/** How often the page asks how a recording goes, ms. */
export const RECORD_POLL_MS = 1000;
