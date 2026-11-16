import type { RecordingPhase } from '../recorder/recorder.types.ts';

/** The phases of a recording still under way. */
export const RUNNING_PHASES: ReadonlySet<RecordingPhase> = new Set(['starting', 'rehearsing', 'recording', 'encoding']);

/** What a recording that stopped without saying how it ended is said to have done. */
export const RECORDER_GONE = 'The recorder stopped before it finished: what it said is in packages/video/.cache/recording.log.';

/** The most pixels drawn to each of the page's, each way: a Retina screen's. */
export const MOST_SCALE = 2;

/** The most frames a second a video may have. */
export const MOST_FPS = 120;
