import { keysOf } from '@raillineage/core/collection.utils';
import type { LngLat } from '@raillineage/core/geometry.types';
import { boundsOf } from '@raillineage/core/geometry.utils';
import { required } from '@raillineage/core/required.utils';
import { isPlanIn } from '@raillineage/schema/ids.utils';
import type { Network } from '@raillineage/schema/network.types';
import { buildPlan } from '@raillineage/schema/plan.utils';
import { parseArgs } from 'node:util';
import { fileIn, originOf } from '../recorder/recorder.utils.ts';
import { RECORDING_DEFAULTS } from '../recorder/recording.constants.ts';
import {
  BARE_SOURCE_LAYERS,
  CAPITAL_WIDTH,
  MAX_THUMBNAIL_ZOOM,
  RAILLINEAGE_MARK,
  THUMBNAIL_YELLOW,
  WORDS_LAYOUT,
  WORDS_SIZES,
  WORDS_WIDTH,
  WORLD_SIZE,
} from './thumbnail.constants.ts';
import type { BasemapStyle, MapFraming, PageSize, PictureArea, Thumbnail, ThumbnailWords } from './thumbnail.types.ts';

/**
 * What the command's arguments ask for.
 *
 * @param args - The arguments after the command: the city, then its options.
 * @param cwd - The folder the command was run in, which a path given is read from.
 * @returns The thumbnail: `videos/<city>.thumbnail.jpg`, or `videos/<city>-<plan>.thumbnail.jpg` with a plan, unless one is named; with its words, unless `--no-words`.
 * @throws {Error} For no city, an option it does not know, or an origin it cannot read.
 */
export const thumbnailOf = (args: string[], cwd: string): Thumbnail => {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    allowNegative: true,
    options: {
      plan: { type: 'string' },
      origin: { type: 'string' },
      out: { type: 'string' },
      words: { type: 'boolean' },
      title: { type: 'string' },
      year: { type: 'string' },
      hook: { type: 'string' },
    },
  });
  const [city] = positionals;
  if (!city || positionals.length > 1) throw new Error('name one city');
  const plan = values.plan ?? null;
  const name = plan === null ? city : `${city}-${plan}`;
  return {
    city,
    plan,
    origin: originOf(values.origin ?? RECORDING_DEFAULTS.origin),
    out: fileIn(values.out, `${name}.thumbnail.jpg`, cwd),
    words: values.words === false ? null : { title: values.title ?? null, year: values.year ?? null, hook: values.hook ?? null },
  };
};

/** A year written in a plan's name (`Kyiv 2070`). */
const YEAR_IN_NAME = /\b(\d{4})\b/;

/**
 * A thumbnail's words, the city's own where none was given: the network's name for the title, and for
 * the year the one in the plan's name, or, with no plan, the year the network opened.
 *
 * @param network - The city's network.
 * @param plan - The plan shown, by id; `null` for the network today.
 * @param asked - The words given, each `null` for the city's own.
 * @returns The words: the title always, the year if there is one, the hook if one was given.
 */
export const wordsOf = (network: Network, plan: string | null, asked: ThumbnailWords): ThumbnailWords => {
  const [brand] = Object.values(network.networks);
  const planName = plan !== null && isPlanIn(network, plan) ? network.plans?.[plan]?.name : undefined;
  const ownYear = plan === null ? network.meta.start.slice(0, 4) : (YEAR_IN_NAME.exec(planName ?? '')?.[1] ?? null);
  return {
    title: (asked.title ?? brand?.name ?? `${network.meta.city} Metro`).toUpperCase(),
    year: asked.year ?? ownYear,
    hook: asked.hook,
  };
};

/**
 * Text written into HTML, its markup's characters escaped.
 *
 * @param text - The text.
 * @returns It, safe to write between tags.
 */
const escapedOf = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/**
 * The size a line of capitals is written at to fit `WORDS_WIDTH`: as large as asked, smaller for a long
 * line, never smaller than `WORDS_SIZES.smallest` (a line longer still wraps).
 *
 * @param text - The line.
 * @param largest - Its size at most, px.
 * @returns Its size, px.
 */
export const fittingSizeOf = (text: string, largest: number): number =>
  Math.max(WORDS_SIZES.smallest, Math.min(largest, Math.floor(WORDS_WIDTH / (text.length * CAPITAL_WIDTH))));

/**
 * One line of a thumbnail's words.
 *
 * @param text - Its text; `null` for none.
 * @param style - How it is written.
 * @returns Its HTML, or nothing for no text.
 */
const lineOf = (text: string | null, style: string): string =>
  text === null ? '' : `<p style="margin: 0; max-width: ${WORDS_WIDTH}px; ${style}">${escapedOf(text)}</p>`;

/**
 * A thumbnail's words and RailLineage's mark, laid over the map as the thumbnails are designed: the
 * title, the year in big yellow and the hook down the left, the mark bottom-left. Laid out at
 * `WORDS_LAYOUT` and scaled onto the page, so the design's sizes hold.
 *
 * @param words - The words.
 * @param page - The page's size.
 * @returns The layer's HTML.
 */
export const wordsLayerOf = (words: ThumbnailWords, page: PageSize): string => {
  const scale = page.width / WORDS_LAYOUT.width;
  const lines = [
    lineOf(words.title, `font-size: ${fittingSizeOf(words.title ?? '', WORDS_SIZES.title)}px; line-height: 1; letter-spacing: 1px;`),
    lineOf(words.year, `margin: -10px 0 -6px; font-size: ${WORDS_SIZES.year}px; line-height: 0.9; letter-spacing: -6px; color: ${THUMBNAIL_YELLOW};`),
    lineOf(words.hook, `font-size: ${fittingSizeOf(words.hook ?? '', WORDS_SIZES.hook)}px; line-height: 1.02;`),
  ].join('');
  const mark = `<div style="position: absolute; left: 80px; bottom: 44px; display: flex; align-items: center; gap: 12px">${RAILLINEAGE_MARK}<p style="margin: 0; font-size: 25px; line-height: 1; font-weight: 600; letter-spacing: -0.3px">Rail<span style="color: #00C16A">Lineage</span></p></div>`;
  const column = `<div style="position: absolute; left: 80px; top: 0; height: 630px; display: flex; flex-direction: column; justify-content: center; gap: 22px; font-weight: 800; text-shadow: 0 4px 24px rgba(4, 10, 22, 0.7)">${lines}</div>`;
  return `<div style="position: fixed; left: 0; top: 0; width: ${WORDS_LAYOUT.width}px; height: ${WORDS_LAYOUT.height}px; transform: scale(${scale}); transform-origin: 0 0; z-index: 2147483647; pointer-events: none; font-family: Outfit, system-ui, sans-serif; color: #FFFFFF">${column}${mark}</div>`;
};

/**
 * The points a thumbnail frames: every segment's track of the network, with the plan built on it if one
 * is asked for.
 *
 * @param network - The city's network.
 * @param plan - One of its plans, by id; `null` for the network today.
 * @returns The track's points.
 * @throws {Error} For a plan the city does not have, or a network with no track to frame.
 */
export const networkPointsOf = (network: Network, plan: string | null): LngLat[] => {
  if (plan !== null && !isPlanIn(network, plan)) {
    const plans = keysOf(network.plans ?? {});
    const which = plans.length > 0 ? `its plans are ${plans.join(', ')}` : 'it has none';
    throw new Error(`no plan ${plan} here: ${which}`);
  }
  const built = plan === null ? network : buildPlan(network, plan).network;
  const points = built.segments.flatMap(segment => segment.coordinates);
  if (points.length === 0) throw new Error('no track to frame: a network never built shows only with one of its plans (--plan)');
  return points;
};

/**
 * A point on MapLibre's world at zoom 0 (Web Mercator, `WORLD_SIZE` pixels across).
 *
 * @param point - The point.
 * @returns Its pixel, from the world's top-left.
 */
const worldPixelOf = ([longitude, latitude]: LngLat): [number, number] => [
  ((longitude + 180) / 360) * WORLD_SIZE,
  ((Math.PI - Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360))) / (2 * Math.PI)) * WORLD_SIZE,
];

/**
 * The point at a pixel of MapLibre's world at zoom 0.
 *
 * @param pixel - The pixel, from the world's top-left.
 * @returns The point.
 */
const pointOf = ([x, y]: [number, number]): LngLat => [
  (x / WORLD_SIZE) * 360 - 180,
  ((2 * Math.atan(Math.exp(Math.PI - (y / WORLD_SIZE) * 2 * Math.PI)) - Math.PI / 2) * 180) / Math.PI,
];

/**
 * Where the map looks so that the points fill a part of the page, whole: as deep as both their width and
 * their height fit it, and centred on it.
 *
 * @param points - The points; at least one.
 * @param page - The page's size.
 * @param area - The part of it they fill.
 * @returns The map's zoom and centre.
 */
export const framingOf = (points: LngLat[], page: PageSize, area: PictureArea): MapFraming => {
  const [[west, south], [east, north]] = required(boundsOf(points) ?? undefined, 'points to frame');
  const [left, top] = worldPixelOf([west, north]);
  const [right, bottom] = worldPixelOf([east, south]);
  const width = (area.right - area.left) * page.width;
  const height = (area.bottom - area.top) * page.height;
  const zoom = Math.min(Math.log2(Math.min(width / (right - left), height / (bottom - top))), MAX_THUMBNAIL_ZOOM);
  const scale = 2 ** zoom;
  // The points' middle sits at the area's middle, which lies this far from the page's.
  const offsetX = ((area.left + area.right) / 2 - 0.5) * page.width;
  const offsetY = ((area.top + area.bottom) / 2 - 0.5) * page.height;
  return { zoom, center: pointOf([(left + right) / 2 - offsetX / scale, (top + bottom) / 2 - offsetY / scale]) };
};

/**
 * Where a point lands on the page, with the map looking as framed.
 *
 * @param point - The point.
 * @param framing - Where the map looks.
 * @param page - The page's size.
 * @returns Its pixel, from the page's top-left.
 */
export const pagePixelOf = (point: LngLat, framing: MapFraming, page: PageSize): [number, number] => {
  const scale = 2 ** framing.zoom;
  const [x, y] = worldPixelOf(point);
  const [centerX, centerY] = worldPixelOf(framing.center);
  return [(x - centerX) * scale + page.width / 2, (y - centerY) * scale + page.height / 2];
};

/**
 * The explorer's address showing the network as framed: map only, at the plan's end if one is asked for.
 *
 * @param thumbnail - The thumbnail.
 * @param framing - Where the map looks.
 * @returns The address.
 */
export const thumbnailAddressOf = (thumbnail: Thumbnail, framing: MapFraming): string => {
  const [longitude, latitude] = framing.center;
  const plan = thumbnail.plan === null ? '' : `plan=${encodeURIComponent(thumbnail.plan)}&at=plan&`;
  return `${thumbnail.origin}/${thumbnail.city}/?${plan}map=${framing.zoom.toFixed(2)}/${latitude.toFixed(5)}/${longitude.toFixed(5)}&mapOnly=1`;
};

/**
 * A basemap's style, bare: no layer of `BARE_SOURCE_LAYERS`, and none that writes a name.
 *
 * @param style - The style, as its server gives it.
 * @returns The same style with only its land and water.
 */
export const bareStyleOf = <Style extends BasemapStyle>(style: Style): Style => ({
  ...style,
  layers: style.layers.filter(layer => !BARE_SOURCE_LAYERS.has(layer['source-layer'] ?? '') && layer.layout?.['text-field'] === undefined),
});
