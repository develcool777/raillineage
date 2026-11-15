import { VideoRecorder } from './recorder.service.ts';
import { recordingOf } from './recorder.utils.ts';

/** How the command is called. */
const USAGE =
  'usage: pnpm video:record <city> [--page video|explorer] [--no-rehearse] [--fps 60] [--size 1920x1080] [--scale 2] [--seconds 900] [--query "mapOnly=1"] [--origin http://localhost:5180] [--out file.mp4] [--status status.json]';

/** The recorder, saying how it goes on the console. */
const recorder = new VideoRecorder({ report: console.log });
// Ctrl+C, or the video page's Cancel, stops it at the next frame: Chrome and ffmpeg closed, no video left.
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => recorder.cancel());

try {
  // pnpm runs the command in the package's folder: a path given is read from where it was typed.
  await recorder.record(recordingOf(process.argv.slice(2), process.env.INIT_CWD ?? process.cwd()));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(USAGE);
  console.error('The app is served by pnpm dev.');
  process.exitCode = 1;
}
