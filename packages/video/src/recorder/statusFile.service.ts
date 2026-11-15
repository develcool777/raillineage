import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RecordingStatus } from './recorder.types.ts';

/**
 * A recording's status file (`Recording.status`), the one way it is written and read: the recorder
 * writes it as it goes, what starts the recorder (`RecordingJobs`) writes it starting and reads it.
 * Written whole, never half, as it may be read at any moment.
 */
export class StatusFile {
  /** Where it is. */
  private readonly path: string;

  public constructor(path: string) {
    this.path = path;
  }

  /**
   * What it says.
   *
   * @returns The status; `null` for none written, or one that cannot be read.
   */
  public read(): RecordingStatus | null {
    try {
      return JSON.parse(readFileSync(this.path, 'utf8')) as RecordingStatus;
    } catch {
      return null;
    }
  }

  /**
   * Says a recording's status, whole: written beside the file, then put in its place.
   *
   * @param status - The status.
   */
  public write(status: RecordingStatus): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const unfinished = `${this.path}.part`;
    writeFileSync(unfinished, JSON.stringify(status));
    renameSync(unfinished, this.path);
  }
}
