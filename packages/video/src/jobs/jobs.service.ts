import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LOG_FILE, RECORDER_COMMAND, STATUS_FILE, VIDEOS_FOLDER } from '../recorder/recorder.constants.ts';
import { StatusFile } from '../recorder/statusFile.service.ts';
import type { RecorderState, RecordingJobsOptions, RecordingRequest } from './jobs.types.ts';
import { argsOf, isRunning, statusAsSeen } from './jobs.utils.ts';

/**
 * Whether a process is still running: one asked for no signal answers if it is there.
 *
 * @param pid - The process.
 * @returns Whether it runs.
 */
const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Recordings as jobs, for what starts them from elsewhere (the video page, through the dev server):
 * one at a time, each the recorder's command run as a process of its own, as one would type it, so it
 * goes on whatever started it does; how far it has got, from the status file it writes (`StatusFile`);
 * stopped as Ctrl+C stops it. Each video is saved in the videos folder. What it says goes to a log, for one that fails. It knows a recording by its page's city and query: what the page shows is
 * the app's.
 */
export class RecordingJobs {
  /** The recorder's command, run by Node. */
  private readonly command: string;
  /** Where the recording says how far it has got. */
  private readonly status: StatusFile;
  /** The status file's path, for the command. */
  private readonly statusPath: string;
  /** Where what the recording says goes. */
  private readonly logFile: string;
  /** Where the videos are saved. */
  private readonly videosFolder: string;
  /** Whether a process is still running. */
  private readonly alive: (pid: number) => boolean;

  public constructor(options: RecordingJobsOptions = {}) {
    this.command = options.command ?? RECORDER_COMMAND;
    this.statusPath = options.statusFile ?? STATUS_FILE;
    this.status = new StatusFile(this.statusPath);
    this.logFile = options.logFile ?? LOG_FILE;
    this.videosFolder = options.videosFolder ?? VIDEOS_FOLDER;
    this.alive = options.alive ?? isAlive;
  }

  /**
   * The recording last started, as it goes or as it ended.
   *
   * @returns The state.
   */
  public state(): RecorderState {
    return { status: statusAsSeen(this.status.read(), this.alive) };
  }

  /**
   * Starts recording a video: the recorder's command, run on its own, said to be starting until it says
   * more. A video already of the name stays until the new one is whole.
   *
   * @param request - The video, and how to record it.
   * @returns The state, the recording started.
   * @throws {Error} While another records, or for a command that does not start.
   */
  public start(request: RecordingRequest): RecorderState {
    if (isRunning(this.state().status)) throw new Error('a video is being recorded: cancel it first');
    const out = join(this.videosFolder, request.name);
    mkdirSync(dirname(this.logFile), { recursive: true });
    const log = openSync(this.logFile, 'w');
    try {
      const recorder = spawn(process.execPath, [this.command, ...argsOf(request, { out, status: this.statusPath })], {
        detached: true,
        stdio: ['ignore', log, log],
      });
      recorder.unref();
      if (recorder.pid === undefined) throw new Error('the recorder did not start');
      this.status.write({ pid: recorder.pid, city: request.city, out, phase: 'starting', seconds: 0, limit: request.seconds, error: null });
    } finally {
      // The recorder has its own hold on the log.
      closeSync(log);
    }
    return this.state();
  }

  /**
   * Stops the recording under way, as Ctrl+C would: it closes Chrome and ffmpeg, writes nothing, and
   * says it was cancelled.
   *
   * @returns The state.
   */
  public cancel(): RecorderState {
    const { status } = this.state();
    if (status && isRunning(status)) process.kill(status.pid, 'SIGINT');
    return this.state();
  }
}
