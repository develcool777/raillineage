import type { RecordingStatus } from '../recorder/recorder.types.ts';

/**
 * What one asks to record, as the video page does: a page of the app, by its city and its address's
 * query, how to record it, and the file. Nothing of what the page shows: that is the app's.
 */
export type RecordingRequest = {
  /** The city, by its id in the address. */
  city: string;
  /** More of the page's address (`plan=kyiv-2070&view=2d`), or empty. */
  query: string;
  /** Frames a second. */
  fps: number;
  /** The page's size, in its own pixels; the video's is this times `scale`. */
  width: number;
  height: number;
  /** Pixels drawn to each of the page's, each way: 2 for 4K from 1080p. */
  scale: number;
  /** The longest it runs, seconds: it ends with the video before then. */
  seconds: number;
  /** Played through once first, so the take finds every tile in the cache. */
  rehearse: boolean;
  /** The file, in the videos folder. */
  name: string;
};

/** The recordings as `RecordingJobs` says them: the one last started, as it goes or as it ended. */
export type RecorderState = {
  status: RecordingStatus | null;
};

/** Where `RecordingJobs` finds the recorder's command and keeps its status, its log and its videos: the package's own, unless a test gives others. */
export type RecordingJobsOptions = {
  command?: string;
  statusFile?: string;
  logFile?: string;
  videosFolder?: string;
  /** Whether a process is still running: asked of the system, unless a test gives a stand-in. */
  alive?: (pid: number) => boolean;
};
