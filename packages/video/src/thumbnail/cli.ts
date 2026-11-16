import { ThumbnailShooter } from './thumbnail.service.ts';
import { thumbnailOf } from './thumbnail.utils.ts';

/** How the command is called. */
const USAGE =
  'usage: pnpm video:thumbnail <city> [--plan <id>] [--title "KYIV METRO"] [--year 2070] [--hook "WHAT IF?"] [--no-words] [--origin http://localhost:5180] [--out file.jpg]';

try {
  // pnpm runs the command in the package's folder: a path given is read from where it was typed.
  await new ThumbnailShooter({ report: console.log }).shoot(thumbnailOf(process.argv.slice(2), process.env.INIT_CWD ?? process.cwd()));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(USAGE);
  console.error('The app is served by pnpm dev.');
  process.exitCode = 1;
}
