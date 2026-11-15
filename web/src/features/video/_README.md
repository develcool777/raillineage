# Video

A city's history as a video, to record (`pnpm video:record <city>`). The feature's top holds the frame
and the script; `insights/` is the panels round the map.

Numbers roll on the app's reels, and there is one clock: a recorder replaces `performance.now` and
`requestAnimationFrame`, and the store's frames and `CountingNumber` both read them. So the year card is
`CountingNumber` on where the history is, counting to each value as the explorer's does. What has a
fixed start and end, a panel's number or an end card's, is `countOf` on its scene's time, with
`ReelNumber`. A viewer who asks for less motion gets the year card's numbers straight away; a recording
still rolls, as Playwright's Chrome reports no preference whatever the machine's is.

Where things lie is said once. A width over the map (`INSIGHTS_COLUMN_VW`, `PLAN_END_VW`) is a constant
that lays the piece out and gives the map its padding; a plan's name stands under the minimap by the
minimap's own measures (`PLAN_INTRO_TOP_VMIN`); the right-hand panels start where the year ends,
as they follow it in one column; and a chart measures what its panel leaves (`VideoPanelChart`), as
the panel mounts, long before it shows.

| Where                        | What                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `video.utils.ts`             | The rules: the script (`videoScriptOf`, each beat's scene, plan and framing), what shows when                   |
| `video.store.ts`             | The state: walks the script, one beat at a time; `layers`, `insights` and `mapProps` follow the beat            |
| `video.composable.ts`        | The effect: makes the map, gives the store each frame's clock, tells a recorder where it is, and when drawn     |
| `components/`                | The frame, and what shows over the map: title, minimap, year, caption, the plan's name, the end cards           |
| `insights/insights.utils.ts` | The panels' numbers, asked of the network, and how each panel comes in                                          |
| `insights/components/`       | The panels, a column each side; their charts are the app's own (`components/ui/`), as the explorer's            |
| `record/`                    | The panel over the video, watched (a recording never shows it): what it shows, preview, record, the videos made |

Watched, the video waits on its panel (`record/components/VideoRecordPanel.vue`): the city, the plan and
the view open the page afresh at their address (`videoAddressOf`), Preview plays it here (Esc stops it),
and Record asks the dev server to record it (`record.store.ts`), which `@raillineage/video`'s
`RecordingJobs` does, through `web/modules/videoRecorder.ts`; the page asks how it goes each second while
it records. What it sends is the page's city and query, never a plan or a view: those are the page's
address, which only the app reads. `/video` opens the first city's.

A beat gives the map its props itself before what it commands (`ADVANCE`): a command acts on the props
the map has, so the plan plays on the plan's network, and the whole network is framed flat.

A new moment in a video is a beat in `videoScriptOf` and, if it needs one, a `VideoScene`.
