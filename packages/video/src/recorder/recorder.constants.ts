import { fileURLToPath } from 'node:url';

/** The package's own folder, whatever folder the command is run from. */
const PACKAGE_FOLDER = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Chrome's own profile for recording, in the package's `.cache/`: its cache keeps the map's tiles
 * between recordings (served to be kept a day), so a city recorded again fetches none it has.
 */
export const BROWSER_PROFILE = `${PACKAGE_FOLDER}.cache/chrome`;

/** Where a video goes: `videos/<city>.mp4` where the command names no file, `videos/<name>` where it names one bare. */
export const VIDEOS_FOLDER = `${PACKAGE_FOLDER}videos`;

/** The command itself, for what starts it as its own process (the video page's Record button): run by Node. */
export const RECORDER_COMMAND = `${PACKAGE_FOLDER}src/recorder/cli.ts`;

/** Where the video page's recording writes how far it has got (`--status`), in the package's `.cache/`. */
export const STATUS_FILE = `${PACKAGE_FOLDER}.cache/recording.json`;

/** Where the video page's recording says what it says as it goes, for when one fails: in the package's `.cache/`. */
export const LOG_FILE = `${PACKAGE_FOLDER}.cache/recording.log`;

/** Virtual seconds the page runs before playback starts: its map drawn, the camera settled. */
export const WARM_UP_SECONDS = 2;

/** Real milliseconds between looks at whether a frame is drawn. */
export const DRAWN_POLL_MS = 16;

/** The longest one frame waits to be drawn, real milliseconds: a tile that never comes is drawn without. */
export const DRAWN_TIMEOUT_MS = 15_000;

/** How long the page may take to open, real milliseconds. */
export const OPEN_TIMEOUT_MS = 60_000;

/** Where ffmpeg is installed, looked for in this order: Homebrew's, on Apple silicon and on Intel; the system's. */
export const FFMPEG_LOCATIONS = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'];

/** A frame's JPEG quality: high enough that the encoder, not the frame, decides what is lost. */
export const FRAME_QUALITY = 95;
