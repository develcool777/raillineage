# CLAUDE.md

Guidance for Claude Code in this repository: what it is, the checks, where the conventions are, the
traps. ESLint enforces the conventions (`pnpm eslint-check` must pass), each named with its rule in
[docs/CONVENTIONS.md](docs/CONVENTIONS.md), so a report points back there.

## What this is

A pnpm monorepo, a job to each part (`ARCHITECTURE.md`): `packages/core` (helpers about nothing in
rail, used by more than one package: dates, geometry, `required`; a helper is never copied, it moves
here), `packages/schema` (the format: `format/` its
types, `validation/` the Zod shape and the checks between parts, `plan/` building a plan on a network),
`packages/network` (the facts: `NetworkFacts` for everyone, every answer about the network, its history
and its plans; `NetworkEngine`, `engineOf(facts)`, the raw network the renderer plays and draws),
`packages/renderer` (drawing: the MapLibre engine, `TransitMap`), `packages/data` (storage: every
city's files in `cities/<country>/<city>/`, its network `<city>.json`, outline and pictures; the index
of them, `cities/cities.json`; and the commands that keep them, a folder each in `src/`: `summary/`,
`boundary/`, `preview/`), `packages/tooling` (the repo's own tools: `pnpm test-mutation`, and the house's typed lint rules),
`packages/video` (videos of the app: `pnpm video:record <city>` records its video page frame by frame,
on a clock only it moves, into an MP4 with ffmpeg, after a rehearsal that fetches every map tile the
camera will look at into Chrome's own cache; it knows a page by its handle alone, which starts it, says
when it is over, and says a frame is drawn, the map answering: the tiles in view, never motion, which
stands still with the clock; what a video shows stays in `web`) and `web` (the app: the Nuxt 4 + Nuxt UI
explorer, and the video page, `/video/<city>`, in 3D or flat with `?view=2d`, under `pnpm dev` only;
`pnpm video:record <city> --query "plan=<id>"` records a plan of the city's as its ending).
`README.md` has the commands; `ARCHITECTURE.md` the contract between the parts;
`packages/network/_README.md` steps and cursors; `packages/renderer/_README.md` the frame model.

## Checks

`pnpm type-check` (each package's own, by `pnpm -r`: a new package gives itself one), `pnpm test-unit-ci`,
`pnpm eslint-check`, `pnpm format-check`, `pnpm code-quality:dead-code` (knip),
`pnpm code-quality:duplication` (jscpd: a helper copied rather than moved to `core` fails it),
`pnpm audit` and `pnpm --filter @railtime/web test-e2e` (the built site in Chromium, `web/test/e2e/`) must
all pass; CI runs them on every pull request. An advisory with no fix to take is listed under
`auditConfig` in `pnpm-workspace.yaml` with its reason, never left failing. Node 24.15 or later
(`.nvmrc` the line CI installs, `engines` its floor) and pnpm 11.9 (`packageManager`), required, not
warned of (`engineStrict`): on an older Node, pnpm runs nothing.
ESLint reads every file with its package's types (web's from `.nuxt/`, which `pnpm install` writes),
so the rules that need them hold too; `pnpm eslint-fix` sorts imports and fixes what a rule can.
Nothing is a warning: a rule is an error, or off with its reason, and `pnpm eslint-check` fails on a
warning too (`--max-warnings 0`), so a plugin's rule left on `warn` cannot slip by. Nor is a rule turned
off by a comment in the code (`noInlineConfig`): an exemption is a block in `eslint/`, with its reason.
After adding a city or changing one's lines, stations or plans, run `pnpm data:summaries` (the landing
page's list); after changing its track or lines' colours, `pnpm data:previews <city>` too (it draws the
landing page's pictures in Chrome).

## Conventions

Read the one a change touches before writing it:

- [docs/CONVENTIONS.md](docs/CONVENTIONS.md): how the code is written, each convention with the ESLint
  rule that checks it; files and folders, the web app's layout, Vue and Tailwind.
- [ARCHITECTURE.md](ARCHITECTURE.md): the packages' jobs, the contract between them, where a change goes
  (a fact is `network`'s, the renderer has no UI, pure first, steps, layers, movers, trains), the stores
  and effects, and who owns what.
- [docs/TESTING.md](docs/TESTING.md) and [docs/DATA.md](docs/DATA.md), below; each package's `_README.md`
  says what is inside it.

## Tests

[docs/TESTING.md](docs/TESTING.md): where each package's tests live, a file's name picking its
environment, the rules a test keeps (no `vi.mock`, `describe('<Module>')`, `test`, a matcher that says
what it checks), the browser tests, coverage, mutation testing and benchmarks. Read it before writing a
test.

## Data

[docs/DATA.md](docs/DATA.md): a city's network as its source of truth (edited directly, never
regenerated), what the schema holds its track, stations and plans to, hidden lines and networks, the
dates each city's test lists, and its outline. Read it before editing anything in `packages/data/cities/`.

## Traps

- `typescript` resolves to 6 through the override in `pnpm-workspace.yaml`: vue-tsc and `nuxt typecheck`
  do not load on 7 yet. `overrides`, `patchedDependencies` and `auditConfig` are read from that file only.
- `minimatch` is 11 throughout (a security override): a plugin that asks for an older one must still load
  on 11 (`pnpm eslint-check` fails to start if not), or it needs a patch in `patches/`.
- The required check on `main` is named `CI`: the gate job in `.github/workflows/test.yml` keeps that
  name. Requiring a job by its own name pins it: renamed, its check never reports again.
- Run Prettier from the root: inside a package it misses the root's `.prettierignore` and rewrites the
  cities' files, which keep a line per station and segment.
- A city's page is published at its address with a slash (`/kyiv/`): a link or a navigation the app
  makes says it so, as the site redirects to it.

## Pull requests

One small PR per change, branched from `main`. Never force-push: fix with a follow-up commit. No
`Co-Authored-By` trailers or tool footers.
