import type { RecordScale, RecordSize } from './record.types';

/**
 * Where the video page asks the dev server to record (`POST`), how it goes (`GET`) and to stop it
 * (`DELETE`), and fetches a video (`GET …/videos/<name>`): under `pnpm dev` only (`modules/videoRecorder.ts`).
 */
export const RECORD_ROUTE = '/_video/record';

/** The page's sizes offered, which it lays out for: YouTube's video, its Shorts, and a smaller one that records faster. */
export const RECORD_SIZES: RecordSize[] = [
  { label: '16:9, for YouTube (1920 × 1080)', width: 1920, height: 1080 },
  { label: 'Vertical 9:16, for Shorts (1080 × 1920)', width: 1080, height: 1920 },
  { label: '16:9, smaller, records faster (1280 × 720)', width: 1280, height: 720 },
];

/** The sharpnesses offered: as a Retina screen draws the page (1080p into 4K), or a pixel to a pixel, faster. */
export const RECORD_SCALES: RecordScale[] = [
  { label: 'Sharp: twice the pixels, as a Retina screen', scale: 2 },
  { label: 'Standard: a pixel to a pixel, faster', scale: 1 },
];

/** The frame rates offered. */
export const RECORD_FPS = [60, 30];

/** How often the page asks how a recording goes, ms. */
export const RECORD_POLL_MS = 1000;
