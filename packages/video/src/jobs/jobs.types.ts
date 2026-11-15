import type { Readable } from 'node:stream';
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
  /** The video's size, in pixels. */
  width: number;
  height: number;
  /** The longest it runs, seconds: it ends with the video before then. */
  seconds: number;
  /** Played through once first, so the take finds every tile in the cache. */
  rehearse: boolean;
  /** The file, in the videos folder. */
  name: string;
};

/** A video in the videos folder. */
export type RecordedVideo = {
  name: string;
  bytes: number;
  /** When it was written, ms since 1970. */
  modified: number;
};

/** The recordings as `RecordingJobs` says them: the one last started, as it goes or as it ended; and the videos made, newest first. */
export type RecorderState = {
  status: RecordingStatus | null;
  videos: RecordedVideo[];
};

/** Part of a file asked for (an HTTP range), its first and last byte. */
export type ByteRange = { start: number; end: number };

/** A video read for a player: its size, the part asked for (`null` for all of it), and those bytes. */
export type VideoRead = { size: number; range: ByteRange | null; stream: Readable };

/** Where `RecordingJobs` finds the recorder's command and keeps its status, its log and its videos: the package's own, unless a test gives others. */
export type RecordingJobsOptions = {
  command?: string;
  statusFile?: string;
  logFile?: string;
  videosFolder?: string;
  /** Whether a process is still running: asked of the system, unless a test gives a stand-in. */
  alive?: (pid: number) => boolean;
};
