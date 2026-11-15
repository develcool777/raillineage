# Architecture

How the code is divided, the contract between its parts, and the rules a change keeps. `README.md`
says how to run things; each package's `_README.md` says what is inside it. A feature that needs a
rule here broken changes this file first.

## The packages: one job each

| Package    | Job                                                                           | Depends on                                 |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| `core`     | **Helpers about nothing in rail**: dates, geometry, `required`, lists         | —                                          |
| `schema`   | **The format**: a network's types, and the validation that enforces them      | core                                       |
| `network`  | **The facts**: the network through time, and every number and answer about it | core, schema                               |
| `renderer` | **Drawing**: a network on a map, and playing its history                      | core, network, schema, MapLibre            |
| `data`     | **Storage**: every city's files, and the commands that keep them              | core, schema, network, renderer (pictures) |
| `web`      | **The app**: what is open, the layout, how numbers and dates are written      | all of them                                |
| `video`    | **Videos of the app**: a page of it recorded frame by frame, as an MP4        | — (the app, served; Chrome; ffmpeg)        |
| `tooling`  | **The repo's own tools**: `pnpm test-mutation`, the house's typed lint rules  | — (ESLint and Stryker read it)             |

- **A fact is asked of `network`, never worked out where it is needed.** A count, a length, a
  station's neighbours, a route, a caption, what a plan adds: `web` and `data` ask `network`. What
  stays in `web` is presentation: formatting, grouping a list A to Z, the search.
- **`schema` is the format and nothing else.** Building a plan stays in it: its validation builds every
  plan to check it fits, so `network` cannot hold it without a cycle.
- **`renderer` draws and plays, and knows nothing it can ask `network`.**
- **`video` records, and knows nothing of what it records.** It takes a page of the app by its address,
  on a clock it moves a frame at a time; what a video shows is the app's, in `web`. The two meet on
  the page's `window`, in one contract `video` defines (`@raillineage/video/videoPage.types`): the
  recorder's clock, and the page's handle saying where it is, starting it, and saying when a frame is
  drawn. The video page and the explorer each keep one, so `--page` only picks an address. The video
  page's Record button records through `video` too: `web/modules/videoRecorder.ts`, under `pnpm dev`
  only, carries its requests to `RecordingJobs`, which runs each recording as the command, a process of
  its own. `video` owns recording whole, its arguments, defaults, checks and status; `web` sends a city
  and its page's query.
- **A helper used in two packages lives once, in `core`, the bottom of the stack.** Never a copy: a
  date, a distance, a bounding box, `clamp`, `pushTo`, `required`, and the coordinate and date types.
  Within one package, one helper too: the app's counts and numbers are `web/src/utils/format.utils.ts`.

## `network`: the facts

`NetworkFacts.create(network, { plan, today })` is a city's network as stored, its history, its plans
and every fact about them: made once, and asked by everyone. Pure: no map, no clock, so the app,
`data` and the tests use it alike, before any map exists.

```ts
NetworkFacts.planToOpen(network, asked); // the plan a city opens on, before its facts are made with it
const facts = NetworkFacts.create(network, { plan, hidden, today }); // the network as stored; a plan built on it, if asked for; lines hidden left out
facts.range; // { start, end, today }
facts.plan; // the plan built, or null (none where it builds on a line hidden)
facts.hidden; // the lines hidden
facts.planOnly; // never built: only plans
facts.plans(); // every plan, with what it would add
facts.summary(); // the city summed up, for a list of cities: what today().stats() counts (a network never built: its first plan whole)
facts.sketch(); // each line's track open today (a network never built: its first plan's), for a picture
facts.findStation(id);
facts.findLine(id); // a string from outside (an address) as an id: { id, name }, or null
facts.stationOfCity(id); // the same among what the city has, whatever is hidden now: what a link is kept by
facts.lines();
facts.changes();
facts.change(index);
facts.growth();
facts.hasHistory();
facts.today(); // the questions below, for today
const then = facts.asOf(time); // a FactsAt; time: a Playhead { cursor, time, progress }, as the map's `time` event gives it
then.stations();
then.station(id);
then.line(id);
then.directions(id);
then.records(5);
then.stats(); // how many stations, km and lines: a change partway counted as far as it is drawn, what the map's `time` says too
then.routes(from, to);
then.reach(from);
then.linesOpened(); // the lines opened as themselves by then; in a plan, every line
then.trains(); // the trains it runs then: a TrainService
facts.coverage(boundary).info(cursor, metres);
facts.coverage(boundary).history(metres);
facts.coverage(boundary).stationsHeld(); // the share of its stations the outline holds
```

An id is its kind's: a `StationId`, a `LineId`, a `NetworkId`, a `PlanId` (`schema`'s format), each a
string no other string is, so a line's id given where a station's goes does not compile. A string
becomes one only where it is checked: `parseNetwork` reading a city's file, `findStation`/`findLine`
and `planToOpen` taking an address's (`isStationIn`, `isLineIn`, `isPlanIn` beneath them). Every answer
gives ids already typed, and every question takes them; a test names its own (`stationId('a')`,
`@raillineage/schema/testing/ids`). A city's file is checked where it is kept: `data`'s tests read every
one through `parseNetwork` and `parseBoundary`, so CI refuses what the schema does. The browser takes
what we serve at one named door, `servedNetwork` and `servedBoundary` (`@raillineage/schema/served.utils`),
validated in CI, trusted here, as parsing the largest city again would take a visitor 110 to 160 ms and
Zod's 97 KB (gzipped).

Every answer at a moment says what the map draws then: a line drawn as another (`LineAlias`) is that
line, in a station's lines, a route's legs (riding from one to the other is no change), a line's stops
and the records. A route's ride is timed as the line's trains run it (`TRAIN_PROFILES`, the motion
rules), the way they go: a line's `way` is part of its track, which routes, directions and trains share.

Every question takes the moment it is about as an argument. A Vue computed over
`facts.asOf(store.time)` changes when it does, and at no other time: nothing is read only so that
something re-runs. No answer depends on the theme: a line's colour comes in both (`LineColor`,
`{ light, dark }`), and what shows it picks one (the renderer by its `theme` prop, the app by CSS
`light-dark()`, `lineColor`).

The package has two doors, an object behind each. `NetworkFacts` (`facts.service`, `facts.types`) is
for everyone. `NetworkEngine` (`engine.service`, `engine.types`), which `NetworkFacts` builds on and
hands over only through `engineOf(facts)` (`engine.utils`), is the raw network the renderer plays and
draws: the index (track, stations), the timeline (its steps, and each opening's growth) and the dates it
runs between. ESLint keeps `web`, `data` and `video`, their tests too, from importing it, and that import
is the only way to it; a city's test reads it as the renderer's playback hands it over. What the renderer draws over the network comes as answers, as the app's do: a route's
segments, a reach's `track` in its `bands`, coverage's `cells(cursor)`; it works no fact out itself.

## `renderer`: the contract

Everything an app does with the map goes through exactly one of three channels; questions go to the
network's `NetworkFacts`. A feature picks its channel by what it is.

| Channel      | What goes through it                                           | Who owns it  | Shape               |
| ------------ | -------------------------------------------------------------- | ------------ | ------------------- |
| **Props**    | How the map is set: anything the app decides and the map shows | the app      | `map.update(props)` |
| **Commands** | Moving through time; one-off camera moves                      | —            | methods             |
| **Events**   | What happened: time moving, a click, a result worked out       | the renderer | listeners           |

### Props: `update(props: Partial<MapProps>)`

`facts`, `arrival` (where the map stands on a network as it is given it), `padding`, `cover`, `theme`,
`viewMode`, `stationLabels`, `streetLabels`, `boldPlans`, `trains`, `focusedLines`, `speed`, `camera`,
`boundary`, `selectedStation`, `overlay` (a route, a reach, coverage).

- **The app owns them; the map never changes one.** It acts on them and reports facts as events;
  whether a fact changes a prop is the app's to decide.
- **Idempotent and order-free.** The same props again do nothing; any subset, at any time, before the
  style loads too. The map compares each with what it last applied and acts on what differs, in the
  props' own order: the room the camera keeps first, what it frames last, so nothing cancels a move.
- A prop names _what_, never _how_ or _when_: `selectedStation`, not `flyToStation`.
- **What belongs together is said together.** A network and where to stand on it are two props in one
  update, so no command has to catch the network up: `facts`' effect reads `arrival`, before the map is
  ready as after. `focusedLines` are read as each frame draws them: a line drawn as another then is that
  line, by whichever id it is named, so what is in focus is what is drawn. `arrival` is a moment (`Playheads.moment`), which means the same on any network, or
  `null` for where the network rests (today, or a plan built). Read then and at no other time: moving
  through time after that is a command's. The app reads the new network from the same moment, with
  `arrivalTimeOf` (`@raillineage/renderer/transitMap.utils`): what the map's next `time` will say, so no
  cursor of the last network is read against the new one's facts.
- **A command acts on the props the map has.** One that follows a prop its store just changed goes
  after `update`, which the store calls itself (a video's beat: `video.store.ts`); the effect gives the
  same props again, which does nothing. Never `nextTick`, which waits on a watcher in another file.
  Before the map is ready `facts`' effect waits, but a command through time does not: it takes up the
  network the props name there and then.

### Commands

```ts
seek(playhead); // a Playhead { cursor, time, progress }, from facts.playheads or a TimeState; playing, it plays on
play(playhead?); // on from here, or from a playhead; at the end, again from history's start (a plan's: today)
pause();
stop(); // stop: pause, the camera back to the whole network
skip();
previousChange();
stepYear(-1 | 1);
zoomIn();
zoomOut();
fitNetwork();
jumpTo(view);
destroy();
```

Time is the renderer's: the clock moves each frame while playing. The app does not hold the date; it
hears it (`time`) and asks to move it.

### Events

`status` (`ready`), `time`, `step` (the change playing, its caption), `stepProgress`, `end`,
`stationClick`, `selectionGone`, `overlay` (what the overlay came to), `view`.

- **Delivered at the end of a frame, never inside a call.** A listener may call any method.
- **Given at construction, and only then** (`on`), so nothing the map says while starting is missed:
  the map has no `on()` to subscribe later.
- **`time` first comes once the map is ready**, its stats the network's, never zeros.
- **An event is a fact, not a request.** `selectionGone`: the station left the map at this moment;
  its ring is hidden while it is away; the prop stays the app's.

### Lifecycle

```ts
const map = new TransitMap({ container, props: { facts, … }, on: { time, step, … }, view, minimapContainer });
```

The network is a prop (`facts`), compared by instance: another (a plan shown, or none) is drawn on the
same map, its player where `arrival` says, the camera where it was, the basemap kept. Loading, then ready (the style loaded, the layers drawn as the props say), then destroyed (`destroy`:
the frame loop, the map, the minimap and every listener gone; any later call does nothing). Props and
commands are taken at once in any state. There is nothing else to call; to ask, `status`, `credits`,
`drawn`: what the camera looks at now is drawn (the style, what was last sent to it and the tiles in
view loaded, the minimap's too), moving or not, which is what a recorder holding its clock can wait for;
and `settled`: drawn, and nothing moves on its own (the camera, a station popping in or pulsing), which
needs the clock to run. A history playing can be settled: its clock is the app's to run.

### Inside

```text
TransitMap            facade: owns MapLibre, the frame loop and the event queue; hands each call to its part
├─ PropsReconciler    the props, and one effect per prop, run in the props' order
├─ Playback           the history on the map: each frame, each command through time, another network or view
│  ├─ NetworkParts       what one network is drawn with, made again for another (`facts`):
│  │  ├─ Player             the clock and each step's phases, moved only by its commands; reads `speed` from the props
│  │  └─ FrameRenderer      each frame on the layers; nothing sent when nothing changed
│  └─ OverlayController  a route, a reach or coverage at the moment shown: drawn, framed when new, reported
├─ CameraDirector     every move of the camera: where it opens, frames steps, follows in 3D; reads its settings from the props
└─ MapLayers, Minimap the layer groups in their order, and the inset: draw what they are given
```

One owner per value, inside as out; data flows one way: props and commands in, events out. What
describes the map outlasts a network, so it lives with what lasts as long as the map: what the camera
last framed in `OverlayController`, what moves on the map in `MotionLayer`, whether a change is on
the inset in `Minimap`. Nothing outside `NetworkParts` is made again for another network. A layer is
written to only once installed (`PropsReconciler` holds every effect until then), so it keeps nothing
to draw later.
`TransitMap` takes its MapLibre map and frame scheduler from factories, so its contract is tested
whole on the stand-in map (`test/unit/transitMap.service.spec.ts`).

## Where a change goes

- **A fact is `network`'s.** A count, a length, a station's neighbours, a route, a caption: a method
  on `NetworkFacts` (or the `FactsAt` its `asOf` gives, `facts/moment.service.ts`), tested in `packages/network`; `web` and `data`
  ask it, never work it out, and never import its `engine.*` (`NetworkEngine`, `engineOf`, ESLint), which is the
  renderer's: a city's test reads the raw network only as the renderer's playback hands it over.
  Every answer at a moment says what the map draws then: a line drawn as another (`LineAlias`) is that line, in a
  station, a route (with no change between them), a line and the records (`Timeline.drawnAs`). No
  answer takes a theme: a line's colour is a `LineColor` in both, and what shows it picks one. `web` keeps presentation: formatting, grouping, the search.
- **The renderer has no UI and no facts.** Controls, captions and panels are Nuxt UI components in
  `web`; the renderer takes props, commands and listeners (`transitMap.types.ts`, `ARCHITECTURE.md`)
  and never imports Vue. A setting it shows is a prop, never a `setX` method.
- **Pure first.** All of `packages/network`, the renderer's player, `steps/` and every `*.utils.ts`
  take no map: keep new logic there and test it (docs/TESTING.md). A layer
  group is tested on the stand-in map (`test/support/factories/fakeMap.utils.ts`), which refuses what
  MapLibre would: a layer the style spec does not allow, data that is not GeoJSON features, and a
  layer reading (`['get', name]`) a property no feature of its source has.
- **A new kind of step** is its times in `STEP_TIMES` and a case in `StepAnimation`'s `cameraPoints`,
  `baseAt` and `draw` (`steps/animation.service.ts`): one class for every kind, its pure parts in
  `animation.utils.ts`.
- **A new group of map layers** is a `MapLayer` subclass installed by `MapLayers` (`layers/stack.service.ts`).
- **Something that moves every frame** (the trains, and whatever comes to move) is a kind of mover: a
  `MoverKind` with its `MoverStyle`, its movers given each frame to `MotionLayer.show`
  (`motion/motion.service.ts`), which the map draws itself, in its own WebGL, as it draws a frame. Never
  a GeoJSON source sent each frame: MapLibre cuts a source's tiles again in a worker for every send, so
  what moves would lag and stutter.
- **Trains on the map are an illustration, run by what real lines do.** The network keeps no timetable, so
  `network`'s `trains/` works one out as an operator does, the same way for any city, and never a number
  tuned for one. `TRAIN_PROFILES` says how each `Mode` runs, in real units: a figure from a published source where one
  exists, cited, and the rest fitted, each saying so (`trains.constants.ts`); a city's test holds them to its
  real times (Kyiv's average speed, Glasgow's lap, the Victoria line end to end). A route's ride is timed from them too,
  by the same motion rules (`RouteFinder`), so a route and the trains agree.
  Every way along a line from end to end (`routes.utils.ts`): a branch goes on past its fork towards the core,
  the side more lines meet, never doubling back. A train pulls away, runs and brakes (`motion.utils.ts`).
  The timetable repeats each hour (`CYCLE_SECONDS`), and is the tracks' (`TrackTimetable`, `tracks.service.ts`): a
  track is a segment's, any line's on it unless its `tracks` part them, and has room for as many trains an hour as its
  most cautious kind's signals let come (`closestSeconds`), but for a margin (`TRACK_USE`). A route runs at its kind's
  headway where its tracks have room; where one has not, its routes share it evenly, the leftover a train at a time to
  the line running fewest. The busiest routes are placed first, each train out as near its even time as is clear of
  every train already on each track it takes, whichever line's, and back as soon as it has turned; a train with no
  clear time is squeezed in least close. A line's platforms at an end are its own. `TrainService` turns the trains: at
  each end of a line every train coming in takes the next one out, whichever route, first in first out, standing at
  its platform until then, never out of sight; so how many trains run comes out of the timetable, never aimed at. A
  loop has no terminus: trains go on round, each way its own, or the one way a line's `way` says, where a circle's two
  directions are two lines. `TrainService` (`engine.trainService`) says where each train is, from the clock
  alone, so a recorder can step them. The clock is real time: how
  much faster to show it is the map's (`TRAIN_TIME_LAPSE`). The renderer only draws them: each a stretch of its
  line's track, not a point, so it sits where its line is drawn on shared track, a mover of `MotionLayer`'s. The map's `trains` prop turns
  them on, the app takes them off while history plays, and where lines are brought forward only theirs run.

## `web`: stores, and effects

- **Stores are the one source of truth.** Every value lives in exactly one store, with all that is
  worked out from it (its getters), and changes only by that store's actions; their rules are pure
  functions in `*.utils.ts`, tested, and each store is tested (`test/unit/…/<name>.store.test.ts`, on a
  stand-in map, `@test/support/factories/transitMap.utils`). Stores read one another one way only,
  never in a circle. The explorer's: `network.store.ts` (the network shown, its facts, the plan and
  the lines hidden), `map/map.store.ts` (the map, its credits, where it looks, its camera's commands)
  and `layout.store.ts` (how the page fits the screen: a phone's or not, the panel's width, the sheet)
  read none; `time/time.store.ts` (the time control, playback, every command through time) reads the
  network and the map; `tools.store.ts` (a route, a reach, coverage and the city's outline) the network;
  `explorer.store.ts` (what is open, how the map is seen, `mapProps`, `address`, and the actions that
  span the others: a page opening, a plan or lines shown, a station clicked, a network swapped: the
  facts, where to stand on them and `time`, in one action) reads them all; `panel/panel.store.ts` (getters only: what the panel shows) reads the rest, and nothing
  reads it. Buttons and keys call their
  actions; time's and the map store's send the map its commands.
- **The address names a moment, never a cursor**: `at` is a day, and how far through its changes
  (`Playheads.moment`, `atMoment`), so it holds whatever lines are hidden, which it does not say, and
  however a city's file is edited.
  What is looked at and how it is set goes in the address; dark or light, the one preference, in the
  browser (`features/explorer/_README.md`).
- **A composable is an effect, and nothing else**: it ties something outside Vue to the stores (the
  map, the browser, the keys, the address bar), reading stores and calling their actions; it holds no
  state and works nothing out (ESLint refuses a `ref`, `computed` or `reactive` in one).
  `map/transitMap.composable.ts` makes the map with `mapProps` and listeners that call the stores'
  actions, gives it each change of `mapProps`, and destroys it;
  `layout.composable.ts` gives the stores the screen and the theme, and drags the panel;
  `shortcuts.composable.ts` the keys; `address/address.composable.ts` writes the explorer's `address`
  to the address bar, its only writer; `recorded.composable.ts` gives a recorder its handle, under
  `pnpm dev`. A component lays out what stores hold and calls their actions.

## Ownership

| Fact                                               | Owner                         | Others                               |
| -------------------------------------------------- | ----------------------------- | ------------------------------------ |
| The network, its plans, its history, every answer  | `NetworkFacts` (`network`)    | —                                    |
| The clock, the cursor, playing, the step playing   | `Player` (`renderer`)         | time's store: a copy, `time`, `step` |
| How the map is set (`MapProps`)                    | the explorer's store (`web`)  | `TransitMap`: the props last applied |
| The camera between commands                        | MapLibre, and the user's hand | the map store: a copy, `view`        |
| What is open: tabs, panels, dialogs, the time card | the explorer's and time's     | the address                          |

## Adding a feature

| You want                                    | Do                                                                                                                                                                                             | Never                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| A number, a list, an answer about a network | a method on `NetworkFacts` (or `asOf`), tested in `network`                                                                                                                                    | working it out in `web` or `data`                 |
| A setting the user sees on the map          | a field in `MapProps`, its effect in `TransitMap`, a test; in the explorer store's `mapPropsOf`                                                                                                | a `setX` method; a watcher in the app             |
| A new way to move through time              | a `Player` command, then a `TransitMap` command over it, a store action                                                                                                                        | the app driving the clock                         |
| Something drawn over the network            | a kind of `OverlayRequest`/`OverlayResult`, in `OverlayController`                                                                                                                             | a layer the app shows and hides by hand           |
| A new kind of change in the history         | `network`: its step in the timeline and its caption; `renderer`: its times in `STEP_TIMES` and a case in `StepAnimation` (what it frames, what it asks of the network under it, what it draws) | a branch in the player, the frame or the snapshot |
| Something a button opens or sets            | state and an action in the store; the button calls the action                                                                                                                                  | a ref in a component that another part reads      |
