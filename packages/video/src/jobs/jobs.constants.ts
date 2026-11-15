import type { RecordingPhase } from '../recorder/recorder.types.ts';

/** The phases of a recording still under way. */
export const RUNNING_PHASES: ReadonlySet<RecordingPhase> = new Set(['starting', 'rehearsing', 'recording', 'encoding']);

/** What a recording that stopped without saying how it ended is said to have done. */
export const RECORDER_GONE = 'The recorder stopped before it finished: what it said is in packages/video/.cache/recording.log.';

/** The largest side a video may have, pixels: 4K's. */
export const LARGEST_SIDE = 3840;

/** The longest a video may run, seconds: an hour. */
export const LONGEST_SECONDS = 60 * 60;

/** The most frames a second a video may have. */
export const MOST_FPS = 120;
