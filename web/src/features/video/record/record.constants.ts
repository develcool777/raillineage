import type { RecordSize } from './record.types';

/**
 * Where the video setup page asks the dev server to record (`POST`), how it goes (`GET`) and to stop it
 * (`DELETE`): under `pnpm dev` only (`modules/videoRecorder.ts`).
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

/** The frame rates offered. */
export const RECORD_FPS = [60, 30];

/** How often the page asks how a recording goes, ms. */
export const RECORD_POLL_MS = 1000;
