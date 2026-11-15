# @raillineage/video

A city's video page (`web`'s `/video/<city>`, under `pnpm dev` only) recorded frame by frame into an
MP4: from the page itself, its panel's Record button, or from the command. What a video shows is
`web`'s (`features/video/`); this package only records a page, by its city and its address's query.

```bash
pnpm dev                                         # the app; open /video (the header's Video) to record from the page
pnpm video:record kyiv                           # or by the command: into packages/video/videos/kyiv.mp4
pnpm video:record kyiv --query "plan=<id>" --out kyiv-plan.mp4   # a plan of the city's as its ending; a bare name goes in videos/
pnpm video:record kyiv --page explorer --query "mapOnly=1" --seconds 60
pnpm video:record kyiv --query "view=2d"         # flat
pnpm video:record kyiv --scale 1                 # 1080p a pixel to a pixel, faster, rather than 4K
```

Its arguments are read in `recorder.utils.ts` (`recordingOf`); its defaults, the command's and the
page's alike, are `recording.constants.ts`'s, which takes nothing of Node's, so the page reads it too.

| Where                            | What                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `recorder/recorder.service.ts`   | `VideoRecorder`: records one video, the page on a clock only it moves                                      |
| `recorder/statusFile.service.ts` | `StatusFile`: the one way a recording's status file is written and read                                    |
| `recorder/cli.ts`                | `pnpm video:record`: the arguments in, Ctrl+C as a cancel                                                  |
| `jobs/jobs.service.ts`           | `RecordingJobs`: recordings started from elsewhere (the video page, through the dev server), one at a time |
| `jobs/jobs.utils.ts`             | Pure, the page's too: a request checked, the command's arguments for it, whether one runs, a file's range  |

## How it records (`recorder.service.ts`, `VideoRecorder`)

- **A clock only it moves.** The page runs on a clock the recorder installs: each frame it moves it on
  by one frame's time, waits for the page to say the frame is drawn, takes the picture, and hands it to
  ffmpeg. A slow frame makes the recording slower, never the video uneven.
- **A page by its handle alone.** It knows the page only by `VideoPageHandle` (`videoPage.types.ts`): it
  starts the page, says when it is over, and says when a frame is drawn: the map answering for the
  tiles in view, never for motion, which stands still with the clock.
- **A rehearsal first.** The page plays through once with no frame taken, so every tile the camera will
  look at is in Chrome's cache; the clock moves the same way both times, so the take finds them there.
  Chrome's profile is kept between recordings (`packages/video/.cache/`), so a city recorded again
  finds them already.
- **As sharp as a Retina screen.** The page is laid out at its size (`--size`, 1920 × 1080) and drawn
  at twice it (`--scale 2`, Chrome's device pixels), so the video is 4K and shows the page as a Retina
  screen does, its text and lines as fine; `--scale 1` draws a pixel to a pixel, faster.
- **HD's colour.** ffmpeg writes BT.709, video range, and says so in the file (`ffmpegArgsOf`): a JPEG's
  own colour, kept, is full range by an older standard, which players guess at, many wrongly.
- **Nothing lost.** The video is written beside its file, hidden (`videos/.kyiv.mp4`), and takes its
  name only once whole: a video already of that name stays until a finished one replaces it, never lost
  to one cancelled or failed.
- **Saying how it goes.** With `--status <file>` it writes how far it has got (`RecordingStatus`:
  starting, rehearsing, recording, encoding; done, failed or cancelled) to that file as it goes.
- **Cancelled** by Ctrl+C (or a stop signal): at the next frame, Chrome closed, ffmpeg killed, nothing written.
- **Never reloaded.** The page's live connections to the server are answered by nothing, so a file
  saved under `pnpm dev` mid-take does not reload it; a page that loads again by itself anyway stops
  the recording, saying so, rather than leaving it waiting on a page that has started over.

## From the video page (`jobs/jobs.service.ts`, `RecordingJobs`)

The video page's panel records through the dev server (`web/modules/videoRecorder.ts`, which only
carries requests here). Each recording is the command run as a process of its own, as one would type
it (`argsOf`, which `recordingOf` reads back), so a restart of the dev server stops none; its status file
(`.cache/recording.json`) says how it goes, its log (`.cache/recording.log`) what it said, for one that
fails; Cancel is Ctrl+C. One records at a time.

## Traps

- **The Chrome installed on this machine**, through `playwright-core`: no browser is downloaded.
- **ffmpeg installed** where Homebrew or the system puts it (`FFMPEG_LOCATIONS`): `brew install ffmpeg`.
- **The app served by `pnpm dev`**: the built site leaves the video pages out.
- **Ctrl+C is the recorder's own** (`launchOptionsOf`: Playwright's would end the process before it
  could cancel), and ffmpeg cut short is killed, never asked to stop: it hears a stop only between
  frames, so one waiting on its open input for the next would never end.
