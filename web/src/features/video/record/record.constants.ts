import type { RecordSize } from './record.types';

/**
 * Where the video page asks the dev server to record (`POST`), how it goes (`GET`) and to stop it
 * (`DELETE`), and fetches a video (`GET …/videos/<name>`): under `pnpm dev` only (`modules/videoRecorder.ts`).
 */
export const RECORD_ROUTE = '/_video/record';

/** The sizes offered: YouTube's video, its Shorts, and a smaller one that records faster. */
export const RECORD_SIZES: RecordSize[] = [
  { label: '1080p, 16:9 (1920 × 1080)', width: 1920, height: 1080 },
  { label: 'Vertical, 9:16 (1080 × 1920), for Shorts', width: 1080, height: 1920 },
  { label: '720p, 16:9 (1280 × 720)', width: 1280, height: 720 },
];

/** The frame rates offered. */
export const RECORD_FPS = [60, 30];

/** How often the page asks how a recording goes, ms. */
export const RECORD_POLL_MS = 1000;
