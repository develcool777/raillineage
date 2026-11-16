import { yearOf } from '@raillineage/core/date.utils';
import { COVERAGE_DEFAULT_METRES } from '@raillineage/network/coverage.constants';
import type { ChangeInfo, PlanInfo } from '@raillineage/network/facts.types';
import type { MapProps } from '@raillineage/renderer/transitMap.types';
import { videoPagePathOf } from '@raillineage/video/recording.utils';
import type { VideoPageState } from '@raillineage/video/videoPage.types';
import { FADE_MS, PLAN_INTRO_MS, SCENE_MS, VIDEO_PADDING_SHARES, VIDEO_SPEED, VIDEO_SPEEDS } from '~/features/video/video.constants';
import type {
  VideoAsked,
  VideoBeat,
  VideoFraming,
  VideoLayers,
  VideoMapInput,
  VideoMoment,
  VideoPadding,
  VideoScene,
  VideoSize,
} from '~/features/video/video.types';
import { fadedIn } from '~/utils/motion.utils';

/**
 * A video's script, every beat in order: its title and history, the whole network flat, then its
 * numbers round it, which its end card comes in over. With a plan it goes on past them: the plan
 * played from today, the network with it built flat, and the plan's end card beside it.
 *
 * @param plan - The plan it plays; `null` for none.
 * @returns The beats.
 */
export const videoScriptOf = (plan: PlanInfo | null): VideoBeat[] => {
  const asBuilt = (scene: VideoScene, framing: VideoFraming): VideoBeat => ({ scene, plan: null, framing });
  const opening = [
    asBuilt('ready', 'playing'),
    asBuilt('title', 'playing'),
    asBuilt('history', 'playing'),
    asBuilt('overview', 'whole'),
    asBuilt('insights', 'insights'),
  ];
  if (!plan) return [...opening, asBuilt('end', 'insights'), asBuilt('done', 'insights')];
  const ending = (['end', 'done'] as const).map((scene): VideoBeat => ({ scene, plan, framing: 'ending' }));
  return [...opening, { scene: 'plan', plan, framing: 'playing' }, { scene: 'overview', plan, framing: 'whole' }, ...ending];
};

/**
 * Whether a scene has shown as long as it shows (`SCENE_MS`). The history and the plan end when their
 * playback does, which the map says (`end`), not the time.
 *
 * @param scene - The scene shown.
 * @param elapsed - How long it has shown, ms.
 * @returns Whether its time is up.
 */
export const sceneEnded = (scene: VideoScene, elapsed: number): boolean => {
  const length = SCENE_MS[scene];
  return length !== undefined && elapsed >= length;
};

/**
 * The plan a video plays after its history: the one its address names, whatever its status, if the
 * network has it. None otherwise: a video ends on today unless asked. A network never built plays its
 * plan as its history, and none after.
 *
 * @param plans - The network's plans.
 * @param planOnly - Whether the network was never built.
 * @param asked - The plan its address names; `null` for none.
 * @returns The plan, or `null` for none.
 */
export const videoPlanOf = (plans: PlanInfo[], planOnly: boolean, asked: string | null): PlanInfo | null =>
  planOnly ? null : (plans.find(plan => plan.id === asked) ?? null);

/**
 * Where the video is, as the page tells a recorder (`VideoPageHandle`): ready only once the city's
 * outline has come, or is known to be missing, so the panels' coverage is never left out of a take.
 *
 * @param scene - The scene shown.
 * @param outlineSettled - Whether the outline has come, or is known to be missing.
 * @returns Loading, ready, playing, or over.
 */
export const pageStateOf = (scene: VideoScene, outlineSettled: boolean): VideoPageState => {
  if (scene === 'ready') return outlineSettled ? 'ready' : 'loading';
  if (scene === 'loading' || scene === 'done') return scene;
  return 'playing';
};

/**
 * How much of something shown for a while shows now: fading in at its start and out at its end.
 *
 * @param elapsed - How long since it started to show, ms.
 * @param length - How long it shows, ms, its fades included.
 * @param fadeMs - How long each fade takes.
 * @returns Its opacity, 0 to 1.
 */
export const shownFor = (elapsed: number, length: number, fadeMs: number): number => Math.min(fadedIn(elapsed, fadeMs), fadedIn(length - elapsed, fadeMs));

/**
 * How much of the minimap shows in a scene: in while the history or a plan plays, the camera close in,
 * and out as the whole network comes into view, which it has nothing to add to.
 *
 * @param scene - The scene shown.
 * @param elapsed - How long it has shown, ms.
 * @returns Its opacity, 0 to 1.
 */
const minimapShownIn = (scene: VideoScene, elapsed: number): number => {
  if (scene === 'history' || scene === 'plan') return fadedIn(elapsed, FADE_MS);
  return scene === 'overview' ? 1 - fadedIn(elapsed, FADE_MS) : 0;
};

/**
 * How much of the year card shows in a scene: in with the history, and on to the video's end; out as
 * a plan's end card comes, which says all it does.
 *
 * @param scene - The scene shown.
 * @param elapsed - How long it has shown, ms.
 * @param planned - Whether a plan is laid on the network.
 * @returns Its opacity, 0 to 1.
 */
const yearShownIn = (scene: VideoScene, elapsed: number, planned: boolean): number => {
  switch (scene) {
    case 'history': {
      return fadedIn(elapsed, FADE_MS);
    }
    case 'end': {
      return planned ? 1 - fadedIn(elapsed, FADE_MS) : 1;
    }
    case 'done': {
      return planned ? 0 : 1;
    }
    case 'insights':
    case 'plan':
    case 'overview': {
      return 1;
    }
    case 'loading':
    case 'ready':
    case 'title': {
      return 0;
    }
  }
};

/**
 * How much of the year card's totals show, of the card: out as the panels come, which say them, and
 * back as a plan plays; gone with the panels' end card, staying while a plan's takes the card away.
 *
 * @param scene - The scene shown.
 * @param elapsed - How long it has shown, ms.
 * @param planned - Whether a plan is laid on the network.
 * @returns Their opacity, 0 to 1.
 */
const totalsShownIn = (scene: VideoScene, elapsed: number, planned: boolean): number => {
  if (scene === 'insights') return 1 - fadedIn(elapsed, FADE_MS);
  if (scene === 'plan') return fadedIn(elapsed, FADE_MS);
  if (scene === 'end' || scene === 'done') return planned ? 1 : 0;
  return 1;
};

/**
 * How much of each piece over the map shows at a moment: the title over its scene, and the plan's
 * name as it starts to play, fading in and out; the minimap (`minimapShownIn`); the year (`yearShownIn`) and its totals (`totalsShownIn`); a caption in as its change starts,
 * out once it goes, and never more than the year; the end card in at its scene, staying when the video
 * is over.
 *
 * @param moment - The scene and how long it has shown, and how long since the caption came and went.
 * @returns Each piece's opacity, 0 to 1.
 */
export const videoLayersOf = (moment: VideoMoment): VideoLayers => {
  const { scene, planned, elapsed, sinceCaption, sinceCaptionGone } = moment;
  const title = scene === 'title' ? shownFor(elapsed, SCENE_MS.title ?? 0, FADE_MS) : 0;
  const planIntro = scene === 'plan' ? shownFor(elapsed, PLAN_INTRO_MS, FADE_MS) : 0;
  const minimap = minimapShownIn(scene, elapsed);
  const year = yearShownIn(scene, elapsed, planned);
  const totals = totalsShownIn(scene, elapsed, planned);
  const captionGone = sinceCaptionGone === null ? 1 : 1 - fadedIn(sinceCaptionGone, FADE_MS);
  const caption = Math.min(fadedIn(sinceCaption, FADE_MS), captionGone, year);
  let end = 0;
  if (scene === 'done') end = 1;
  else if (scene === 'end') end = fadedIn(elapsed, FADE_MS);
  return { title, planIntro, minimap, year, totals, caption, end };
};

/**
 * The years a history spans, for its title: from its first change's to its last's.
 *
 * @param changes - Its changes, in order; a planned one, undated, is left out.
 * @returns "1960 – 2023", the one year for a history of one, or nothing for none.
 */
export const historySpan = (changes: ChangeInfo[]): string => {
  const years = changes.flatMap(change => (change.time === null ? [] : [yearOf(change.time)]));
  const first = years[0];
  const last = years.at(-1);
  if (first === undefined || last === undefined) return '';
  return first === last ? String(first) : `${first} – ${last}`;
};

/**
 * Room the camera keeps clear on a video of a size, so what it frames is never under what lies over
 * the map: the year and a caption, the panels, or a plan's end card.
 *
 * @param size - The video's size.
 * @param framing - How the map is seen.
 * @returns The room at each edge, pixels.
 */
export const videoPaddingOf = (size: VideoSize, framing: VideoFraming): VideoPadding => {
  const shares = VIDEO_PADDING_SHARES[framing];
  return {
    top: Math.round(size.height * shares.top),
    bottom: Math.round(size.height * shares.bottom),
    left: Math.round(size.width * shares.left),
    right: Math.round(size.width * shares.right),
  };
};

/**
 * What a video's address asks it to show: the plan after its history (its id as written, not yet checked
 * against the network: `videoPlanOf`), in 3D unless it asks for flat (`view=2d`), at the speed it asks if
 * one offered (`VIDEO_SPEEDS`), else the video's own. A value repeated is none.
 *
 * @param query - The address's query.
 * @returns What it asks.
 */
export const videoAskedOf = (query: Record<string, unknown>): VideoAsked => ({
  plan: typeof query.plan === 'string' ? query.plan : null,
  view: query.view === '2d' ? '2d' : '3d',
  speed: VIDEO_SPEEDS.find(offered => String(offered) === query.speed) ?? VIDEO_SPEED,
});

/**
 * A video's address query, as `videoAskedOf` reads it back: the plan, flat if not 3D, and the speed if
 * not the video's own. The recorder is asked to record the video at it.
 *
 * @param asked - The plan, the view and the speed.
 * @returns The query, without its `?`; empty for none of them.
 */
export const videoQueryOf = (asked: VideoAsked): string => {
  const query = new URLSearchParams();
  if (asked.plan !== null) query.set('plan', asked.plan);
  if (asked.view === '2d') query.set('view', '2d');
  if (asked.speed !== VIDEO_SPEED) query.set('speed', String(asked.speed));
  return query.toString();
};

/**
 * A page's address with a video's query, if it has one.
 *
 * @param path - The page's path.
 * @param asked - The plan, the view and the speed.
 * @returns The address.
 */
const addressOf = (path: string, asked: VideoAsked): string => {
  const query = videoQueryOf(asked);
  return query ? `${path}?${query}` : path;
};

/**
 * A city's video as it is recorded (`videoPagePathOf`), as asked to show: what the recorder records,
 * and its setup page frames.
 *
 * @param city - The city, by its id.
 * @param asked - The plan, the view and the speed.
 * @returns Its address.
 */
export const videoAddressOf = (city: string, asked: VideoAsked): string => addressOf(videoPagePathOf(city), asked);

/**
 * A city's video setup page (`/<city>/video/`), set up as asked.
 *
 * @param city - The city, by its id.
 * @param asked - The plan, the view and the speed.
 * @returns Its address.
 */
export const videoSetupAddressOf = (city: string, asked: VideoAsked): string => addressOf(`/${encodeURIComponent(city)}/video/`, asked);

/**
 * What the map shows in a video: the network, dark, at the pace asked, without the basemap's street
 * names, framing clear of what lies over it; seen as asked while it plays, otherwise flat, with the
 * panels round it the city's coverage drawn within its outline, and beside a plan's end card the plan bold.
 *
 * @param input - The network shown, the frame's size, how it was asked to be seen, the beat's framing, the outline.
 * @returns The map's props.
 */
export const videoMapPropsOf = (input: VideoMapInput): Pick<MapProps, 'facts'> & Partial<MapProps> => ({
  facts: input.facts,
  theme: 'dark',
  viewMode: input.framing === 'playing' ? input.viewMode : '2d',
  overlay: input.framing === 'insights' && input.boundary ? { kind: 'coverage', metres: COVERAGE_DEFAULT_METRES } : null,
  boundary: input.boundary,
  speed: input.speed,
  streetLabels: false,
  boldPlans: input.framing === 'ending',
  padding: videoPaddingOf(input.size, input.framing),
});

/**
 * The site's address as a video says it: without its scheme or its last slash.
 *
 * @param url - The address (`https://example.org/`).
 * @returns As written (`example.org`).
 */
export const spokenAddress = (url: string): string => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
