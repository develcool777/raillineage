# Conventions

How the code is written. The conventions follow `dataroom-ui`'s, and ESLint enforces them:
`pnpm eslint-check` must pass. Each convention below names the rule that checks it, so a report points
back here. The rules are in `eslint/`, a file a subject (`imports.config.js`, `tests.config.js`,
`vue.config.js`…), each saying, beside every rule it turns off, why; `eslint.config.js` puts them in
order, the later winning where two set one rule. Where a change goes, and the contract between the
parts, is [ARCHITECTURE.md](../ARCHITECTURE.md); how a test is written, [TESTING.md](TESTING.md).

## Enforced

- **Arrow functions only.** `const name = (…): Type => …`; no `function`, declaration or expression
  (`func-style`, `no-restricted-syntax`).
- **A store is a setup store, laid out as `dataroom-ui`'s**: `defineStore(STORE_IDS.NAME, () => …)`, its
  id in `STORE_IDS` (`web/src/constants/store.constants.ts`, where a test finds every store's); inside,
  in this order, each under its heading comment: `// ---- State`, its refs; `// ---- Getters`, its
  computed; `// ---- Actions`, named in capitals (`OPEN`, `SET_TIME`, `RESET` where it needs one), so a
  call reads as one wherever it is made; then what it returns, in the same order, all its state among
  it (`house/store-returns-state`): Pinia keeps only what a setup store returns, and a ref left out is
  invisible to its devtools and plugins, and lost in server rendering. The headings' order, each part
  under its own, what it returns in that order and an action's capitals are `house/store-shape`'s. Its
  state changes only by its actions: a component or composable reads it and calls them, which no rule
  can see, as Pinia hands out its refs. An action is a block,
  `(next) => { time.value = next; }`: it returns nothing (`jsdoc/require-returns` asks a `@returns` of
  one that does).
- **Loops say what they loop over.** No `for (;;)` or `while (true)`;
  `for (const [place, stop] of run.entries())`, never `forEach` (`unicorn/no-for-each`), nor
  `reduce` (`unicorn/no-array-reduce`): a sum or a fold is a loop and a `let`. A queue is read from its
  head, never `shift`ed, and a list built from its end is pushed then `toReversed()`, never
  `unshift`ed: each copies the whole array, so the loop is O(n²) (`unicorn/no-array-front-mutation`).
  Promises that need not wait for one another run together, `Promise.all` (`no-await-in-loop`; off for
  the data and video commands, which drive one page or a service asking for a pause between requests).
- **Imports in one block, in order** (`import-x/order`; `pnpm eslint-fix` sorts them): packages, `node:`
  among them, then the app's own (`#imports`, `~/`, `@test/`), then relative, each group alphabetical,
  no blank lines. No module imports itself round a circle (`import-x/no-cycle`), and a module's exports
  are constants (`import-x/no-mutable-exports`).
- **Modern JavaScript** (`unicorn`): an array is never sorted or reversed in place, as a statement of its
  own either: `toSorted`, `toReversed` (`unicorn/no-array-sort`, `no-array-reverse`, `allowExpressionStatement`
  off), with a comparator always
  (`require-array-sort-compare`, strings' sorts too: `byCodeUnits` from
  `@raillineage/core/text.utils` for ids and ISO dates, `localeCompare` for a name a reader sees);
  `list.at(-1)`, `replaceAll`, `Number.isSafeInteger`, `Set` methods (`difference`); a callback that does
  nothing is `() => {}`. Each thing said one way: `===` (`eqeqeq`), `Boolean(x)` or a comparison for
  `!!x` (`no-implicit-coercion`), a template literal for `'a' + b` (`prefer-template`), `{ bounds }`
  (`object-shorthand`), `x += 1`, `Object.hasOwn`, `{ ...a }`. Nothing goes to the console but from a
  command (`no-console`). A parameter is never written over (`no-param-reassign`), nor a name hidden by
  an inner one (`no-shadow`); a member nothing writes after the constructor is `readonly`
  (`prefer-readonly`). The slips the language lets through are each refused: a `map` callback that
  returns nothing, `x === x`, a loop whose condition nothing in it changes, a `${}` in a plain string,
  `eval`. The rules that argue with the house style are off, each with its reason.
- **What the types say holds** (`typescript-eslint`'s strict, type-checked rules): no condition the types
  already answer (`no-unnecessary-condition`), `??` over `||` for a value that may be missing
  (`prefer-nullish-coalescing`), no promise left floating (`no-floating-promises`: awaited, or `void`
  where it is meant to run on its own), no `any` from `JSON.parse` or an untyped `new Map()` (say what
  it holds: `as CityIndex`, `new Map<string, string>()`), no assertion the types make needless. A
  `switch` over a union names each member or says `default` and why
  (`switch-exhaustiveness-check`): a new kind of step or overlay cannot slip past one. The compiler
  refuses what is never read or never returned (`tsconfig.base.json`: `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`; web's
  too). A global type a library leans on is loaded where it is used (the renderer's `geojson`): left
  out, `skipLibCheck` turns it to `any` and says nothing.
- **A condition is a boolean** (`strict-boolean-expressions`), or a value whose truth cannot mislead:
  an object, a string, or one that may be missing (an id, a date, a name, a flag; never `''`). A
  number is compared, never taken for true: `0` is a count, an option, and the timestamp of
  1 January 1970 (`closes !== null`, `option > 0`). A sort's tie-breaks are `firstDifference(a - b,
nameCompare)` (`@raillineage/core/collection.utils`), not `a - b || nameCompare`.
- **An id is its kind's** (`StationId`, `LineId`, `NetworkId`, `PlanId`: `Brand<string, …>`, in
  `schema`'s format): a line's id where a station's goes does not compile, and a map or set of them
  says which (`Map<StationId, number>`). A string becomes an id only where it is checked: `parseNetwork`
  for a city's file, `isStationIn`/`isLineIn`/`isPlanIn` (`facts.findStation`, `findLine`, `planToOpen`)
  for an address; never by `as` elsewhere, a template's expressions included (`house/checked-ids`). A
  city's file becomes a `Network` or a `CityBoundary` at a door: `parseNetwork`/`parseBoundary`, which
  check it, or in the browser `servedNetwork`/`servedBoundary` (`@raillineage/schema/served.utils`), which
  trust what CI checked; never by `as` or a fetch's type argument elsewhere (`house/served-files`). A record keyed by ids is walked with
  `keysOf`/`entriesOf` and made with `fromEntriesOf` (`@raillineage/core/collection.utils`), which keep the
  key's kind, where `Object.keys` makes it `string` (`house/branded-record-keys`). An id key beside a
  spread, `{ ...plans, [id]: plan }`, is one TypeScript checks nothing under: copy, then set it by key
  (`house/branded-spread-key`). A test names its ids with `stationId('a')`, `lineId('red')`, and writes a
  network as its file is, `asNetwork({…})` (`@raillineage/schema/testing/ids`), helpers that trust what
  they are given, which source never imports (`house/test-helpers`). The house's rules read types, and
  live, tested, in `packages/tooling/src/lint/`.
- **A key left out is not a key given `undefined`** (`exactOptionalPropertyTypes`, in the packages):
  `{ plan?: string }` takes no `plan: undefined`; pass it on as `...(plan && { plan })`, and leave a
  key out with `const { plans: _plans, ...rest } = network`. Where `undefined` does mean "not given",
  the type says so (`MapPropsUpdate`, the props `TransitMap.update` takes), and the code drops it,
  never spreads it over a default. Zod's `.exactOptional()` reads the files so. Web leaves this off: a
  template passes `undefined` to an optional prop to mean it is not given, as Vue and Nuxt UI read it.
- **Guard clauses**: an early `return` ends the case, with no `else` after it (`no-else-return`), each
  guard on its own line, never folded into one condition or a ternary.
- **A function a reader takes in at once** (`sonarjs/cognitive-complexity`, 15, as `dataroom-ui`'s): past
  that, it splits into named steps.
- **Classes live in `*.service.ts`**, helpers in `*.utils.ts`; a file may hold several classes of
  one subject (a base and its kinds). Types and constants keep files of their own, beside the code
  they belong to (`camera.types.ts` next to `camera.service.ts`): when code merges, its types and
  constants merge into the merged file's. No `types/` folders, no barrels (`check-file`). No source file
  passes 500 lines, comments counted (`max-lines`; a test may): a subject that big splits by job, never by role.
  A page's script bundled for the browser is a `*.entry.ts` (`preview/page.entry.ts`), typed as any other. A `*.utils.ts` is pure: it takes no store,
  composable, Vue or map at run time (`house/pure-utils`), only their types.
- **Every class member has an access modifier** (`public`, `protected`, `private`), and every class,
  member, function, constant and type at a module's top has a JSDoc comment (`jsdoc/require-jsdoc`).
  A JSDoc mirrors its signature, a component's functions' too: a `@param name - what` for each
  parameter, a `@returns what` for a value (none for `void`, nor beside a getter, whose doc says what it
  is), no `{type}`, `[optional]` or default, which TypeScript says (`jsdoc/require-param`,
  `require-returns`, `no-types`); and it parses, naming no type it cannot find (`jsdoc/valid-types`,
  `no-undefined-types`): a `@throws` says what in words, `@throws Zod's error, if …`.
- **Names say what they hold**: three letters at least, but for `id`, `x`, `y`, `km`, `on`, `to` (`id-length`).
- **Strict indexing** (`noUncheckedIndexedAccess`): a lookup by an id the network supplied goes
  through `required()` (or `NetworkIndex.stationOf`/`lineOf`), which fails loudly; in source, `!` only on a
  numeric index a loop's head bounds, with a `// Within bounds:` comment saying why (`house/bounded-assertion`);
  anything else is restructured so the types see it. A test may: a `!` that is wrong fails it.
- **A command is a feature's `cli.ts`** (`packages/data/src/boundary/cli.ts`, `pnpm data:boundary`): it
  reads its arguments, calls the feature in a `try`, and on an error says it, with its usage, and sets
  `process.exitCode = 1`. The feature knows nothing of the command: it takes typed arguments, says how it
  goes through the `report` it is given, throws what went wrong, and closes what it opened; only a
  `cli.ts` touches the console (`no-console`). A function in the feature's utils, or a service where it
  holds state (`PreviewRenderer`: a server, Chrome, a page); beside it one types and one constants file.
- **Erasable TypeScript only** (`erasableSyntaxOnly`): scripts run directly under Node's type
  stripping, so no enums or constructor parameter properties; and in the code they run (`core`,
  `schema`, `network`, `data/src`) a runtime import names its file, `.ts` included (ESLint).
- **A package through its door**: another package is imported by its `exports` (`@raillineage/<package>/…`),
  never by a path into its folders (ESLint); what its tests share, from `@raillineage/<package>/testing/…`.
  `@raillineage/network/engine.*` is the renderer's alone, `web`'s and `data`'s code and tests kept out (ESLint):
  `engineOf(facts)` is the one way from a network's facts to the engine. One exception the fence does not
  see: `data`'s `london.test.ts` and `lineSplits` read the raw `index` and `timeline` that `playbackOf`
  (`@raillineage/renderer/testing/playback`) hands over, for what no fact says: which stretch a step opens, a
  segment's direction, a line's track holding together past a junction its trains pass. Else they ask the facts.
  No package takes Vue (its stores, Nuxt), and `core`, `schema` and `network` take no map either: the
  renderer is the one that draws (ESLint).

## Folders and files

- **A folder per subject, of two files or more** (a single file joins the nearest subject's folder);
  files named for what they are, not the folder again (`overlay/route.service.ts`, `RouteLayer`),
  but for the folder's main class and its one shared types, constants or utils file, which take
  its name (`engine/engine.service.ts`, `overlay/overlay.utils.ts`). Classes keep their full names.
- **The web app** follows the investors site's layout, in `web/src/`:

  ```text
  pages/  css/            routes, styles
  components/ui/          components every surface uses (SiteHeader, MapCredits, the charts: GrowthChart,
                          DecadeChart, CoverageChart, on YearChart's round years…; a number on rolling reels: ReelNumber draws a count,
                          CountingNumber counts to each value on the page's clock, which a recorder moves)
  constants/  utils/      what more than one surface needs: the city catalogue (CITIES, city.utils,
                          its outline fetched), plans' statuses, how a number, a share, a walk, a day
                          or what a plan adds is written, the changes by decade, a measure's growth
  features/<name>/        one product surface each: explorer (a city's map), landing (the city list),
                          overview (a city's network on one page to read, set as a long read, `/<city>/overview/`: its
                          lines, every change and its plans, worked out as the site is built by the
                          build's own server, `web/server/api/overviews/`, which nothing serves once
                          published), seo, video (a city's history as a video, to record, a script of beats worked
                          out up front, `videoScriptOf`: its title, the history to today, the whole
                          network flat, its numbers on `insights/` panels round it, its coverage drawn,
                          and the end card over them; with `?plan=<id>` on past them, the plan played
                          from today, the network with it built flat, and its end card beside it, what it
                          changes rolling on from today's figures;
                          `pnpm dev` only, the built site leaves it out; its state a store,
                          `video.store.ts`, its rules in `video.utils.ts`, its map an effect,
                          `video.composable.ts`, as the explorer's; watched, a panel over it,
                          `record/`, sets it up, previews it and records it; what it moves itself is worked out
                          from the page's clock each frame, never a CSS transition, which no recorder
                          can step);
                          its components in components/, the rest flat beside them
  features/<name>/<part>/ a big feature in parts, as dataroom-ui's modules/fileRenderer: each part
                          (explorer's map/, time/, panel/, lines/…) its own components/ and files;
                          the feature's top holds the frame and what the parts share, and a
                          _README.md maps it
  ```

  Components are used by tag, never imported (`nuxt.config.ts` scans every `components/` under
  `features/`); anything else in a feature is imported by its path
  (`~/features/explorer/time/timeline.utils`), so what one feature or part takes from another can be
  searched for. Something one surface uses goes in its feature; it moves to the top when a second needs it.

## Vue

- Vue: `<script setup lang="ts">`, block order template → script → style, a blank line between
  them, `defineProps` before `defineEmits`, `props`/`emit`/`slots`/`attrs` names, camelCase attributes
  and events (`eslint-plugin-vue`). A template says a thing one way: `disabled`, not `:disabled="true"`,
  a static `class` apart from `:class`. An element's ref is `useTemplateRef<HTMLElement>('name')`; a
  child's, the type of what it exposes (`PanelListHandle`, beside its `defineExpose`). Nothing declared
  and unused: a prop, an event, a ref. A component's parts are declared and typed, as a function's:
  each prop with a JSDoc (`vue/require-prop-comment`), read as `props.name`, never destructured; its
  slots by `defineSlots` (`vue/require-explicit-slots`); a model its parent always binds is
  `required`, never given a default. A prop or ref read once at setup keeps the value it had
  (`vue/no-setup-props-reactivity-loss`): what follows it is a `computed`, a `watch` or read where it is
  used; a page mounted afresh for each city (its `key`) holds its city as a constant. An event never
  takes a browser's name (`select`, `change`, `play`): it says what it carries (`station`, `pick`,
  `togglePlay`) (`vue/no-shadow-native-events`). The same component in a `v-if` and its `v-else` is
  keyed apart, so one never takes the other's state (`vue/v-if-else-key`). A template's expressions
  are held to a script's (`vue/eqeqeq`, `vue/no-implicit-coercion`…), but for its guard clauses: the
  empty state first, `v-if="!from"`, what it shows in `v-else`.
- **A Tailwind class is its token** (`better-tailwindcss/enforce-canonical-classes`,
  `enforce-shorthand-classes`, `eslint/tailwind.config.js`): `w-5.5`, not `w-[22px]`; `size-full`, not
  `w-full h-full`; read against the theme in `web/src/css/main.css`, Nuxt UI's included. `pnpm eslint-fix`
  rewrites them.
