import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { describe, expect, onTestFinished, test } from 'vitest';
import { RECORDER_GONE } from '../../../src/jobs/jobs.constants.ts';
import { RecordingJobs } from '../../../src/jobs/jobs.service.ts';
import type { RecordingRequest } from '../../../src/jobs/jobs.types.ts';
import { argsOf } from '../../../src/jobs/jobs.utils.ts';
import { StatusFile } from '../../../src/recorder/statusFile.service.ts';

/** What the video page asks to record. */
const REQUEST: RecordingRequest = {
  city: 'kyiv',
  query: 'plan=kyiv-2070',
  fps: 60,
  width: 1920,
  height: 1080,
  seconds: 900,
  rehearse: true,
  name: 'kyiv-2070.mp4',
};

/**
 * A stand-in for the recorder's command: it keeps the arguments it was given, says something, and on
 * Ctrl+C says in its status file that it was cancelled, and ends, as the command does.
 */
const STAND_IN = `
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
writeFileSync(new URL('./args.json', import.meta.url), JSON.stringify(args));
console.log('rehearsing');
const status = args[args.indexOf('--status') + 1];
process.on('SIGINT', () => {
  writeFileSync(status, JSON.stringify({ pid: process.pid, city: args[0], out: '', phase: 'cancelled', seconds: 0, limit: 0, error: 'cancelled' }));
  process.exit(0);
});
setInterval(() => {}, 1000);
`;

/**
 * Jobs in a folder of the test's own, with a stand-in for the command there.
 *
 * @param alive - Whether a process still runs; the system's answer unless given.
 * @returns The jobs, and where the stand-in, its status, its log and the videos are.
 */
const jobsApart = (alive?: (pid: number) => boolean) => {
  const folder = mkdtempSync(join(tmpdir(), 'raillineage-'));
  onTestFinished(() => {
    rmSync(folder, { recursive: true });
  });
  const command = join(folder, 'recorder.mjs');
  writeFileSync(command, STAND_IN);
  const statusFile = join(folder, '.cache', 'recording.json');
  const logFile = join(folder, '.cache', 'recording.log');
  const videosFolder = join(folder, 'videos');
  mkdirSync(videosFolder);
  const jobs = new RecordingJobs({ command, statusFile, logFile, videosFolder, ...(alive && { alive }) });
  return { jobs, folder, statusFile, logFile, videosFolder };
};

/**
 * Writes a video, written at a given time.
 *
 * @param videosFolder - Where the videos are.
 * @param name - Its name.
 * @param seconds - When it was written, seconds since 1970.
 */
const writeVideo = (videosFolder: string, name: string, seconds: number) => {
  const path = join(videosFolder, name);
  writeFileSync(path, '0123456789');
  utimesSync(path, seconds, seconds);
};

describe('RecordingJobs', () => {
  test('starts the command on its own as asked, says it is starting, logs what it says, refuses another meanwhile, and stops it as Ctrl+C would', async () => {
    const { jobs, folder, statusFile, logFile, videosFolder } = jobsApart();
    const started = jobs.start(REQUEST);
    const pid = started.status?.pid ?? 0;
    onTestFinished(() => {
      if (jobs.state().status?.phase !== 'cancelled') process.kill(pid);
    });
    const out = join(videosFolder, 'kyiv-2070.mp4');
    expect(started.status).toEqual({ pid: expect.any(Number), city: 'kyiv', out, phase: 'starting', seconds: 0, limit: 900, error: null });
    await expect.poll(() => existsSync(join(folder, 'args.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(folder, 'args.json'), 'utf8'))).toEqual(argsOf(REQUEST, { out, status: statusFile }));
    await expect.poll(() => readFileSync(logFile, 'utf8')).toBe('rehearsing\n');
    expect(() => jobs.start(REQUEST)).toThrow('a video is being recorded: cancel it first');
    jobs.cancel();
    await expect.poll(() => jobs.state().status?.phase).toBe('cancelled');
  });

  test('lists the videos made, newest first, but one being written, which is hidden', () => {
    const { jobs, videosFolder } = jobsApart();
    writeVideo(videosFolder, 'kyiv.mp4', 1000);
    writeVideo(videosFolder, 'london.mp4', 3000);
    writeVideo(videosFolder, '.kyiv-2070.mp4', 4000);
    writeVideo(videosFolder, 'notes.txt', 5000);
    expect(jobs.state()).toEqual({ status: null, videos: ['london.mp4', 'kyiv.mp4'].map(name => expect.objectContaining({ name, bytes: 10 })) });
  });

  test('says a recording whose process has gone failed', () => {
    const { jobs, statusFile } = jobsApart(() => false);
    new StatusFile(statusFile).write({ pid: 42, city: 'kyiv', out: '/videos/kyiv.mp4', phase: 'recording', seconds: 12, limit: 900, error: null });
    expect(jobs.state().status).toMatchObject({ phase: 'failed', error: RECORDER_GONE });
  });

  test('reads a video made by its name, whole or the part asked for, never by a path out of the folder', async () => {
    const { jobs, videosFolder } = jobsApart();
    writeVideo(videosFolder, 'kyiv.mp4', 1000);
    const whole = jobs.read('kyiv.mp4', undefined)!;
    expect({ size: whole.size, range: whole.range }).toEqual({ size: 10, range: null });
    await expect(text(whole.stream)).resolves.toBe('0123456789');
    const part = jobs.read('kyiv.mp4', 'bytes=2-4')!;
    expect(part.range).toEqual({ start: 2, end: 4 });
    await expect(text(part.stream)).resolves.toBe('234');
    expect(jobs.read('london.mp4', undefined)).toBeNull();
    expect(jobs.read('../recorder.mjs', undefined)).toBeNull();
  });
});
