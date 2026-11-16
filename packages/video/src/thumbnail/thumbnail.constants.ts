import type { PageSize, PictureArea } from './thumbnail.types.ts';

/**
 * The page a thumbnail is taken of, in CSS pixels: 16:9 and small, so the map's lines and stations,
 * drawn at their usual size, come out bold in the picture, as a thumbnail seen at phone size needs.
 */
export const THUMBNAIL_PAGE: PageSize = { width: 512, height: 288 };

/** Device pixels per CSS pixel: the page drawn at 3840 × 2160, the 4K YouTube recommends for a thumbnail. */
export const THUMBNAIL_SCALE = 7.5;

/**
 * Where the network is fitted, whole: the picture's right side, clear of the thumbnail's words on the
 * left and of its edges, which a phone may crop.
 */
export const NETWORK_AREA: PictureArea = { left: 0.41, right: 0.96, top: 0.07, bottom: 0.93 };

/** The deepest a thumbnail zooms, for a network of one short line. */
export const MAX_THUMBNAIL_ZOOM = 15;

/** The width of MapLibre's world at zoom 0, in pixels: at zoom n it is this times 2ⁿ. */
export const WORLD_SIZE = 512;

/** The basemap's style, as the app asks its tile server for it: answered with a bare one (`bareStyleOf`). */
export const STYLE_ADDRESS = /\/styles\/[^/?]+(?:\?.*)?$/;

/**
 * The basemap's tile layers left out (OpenMapTiles' names): roads, buildings, borders, airports and
 * places, so only land and water stay behind the lines. Every layer that writes a name goes too.
 */
export const BARE_SOURCE_LAYERS: ReadonlySet<string> = new Set([
  'transportation',
  'transportation_name',
  'building',
  'boundary',
  'aeroway',
  'aerodrome_label',
  'poi',
  'housenumber',
  'place',
  'mountain_peak',
  'water_name',
]);

/** The deep navy of a thumbnail's ground: apart from YouTube's near-black dark mode, under the lines' colours. */
const THUMBNAIL_NAVY = '#0C172B';

/**
 * Laid over the page: everything but the map hidden (its buttons, links and the map's controls; Nuxt's
 * devtools), and the map tinted navy. `lighten` keeps whichever is lighter, so only its darkest, the
 * ground and water, takes the navy, and the lines and stations keep their colours.
 */
export const THUMBNAIL_CSS = `
  button, a, .maplibregl-control-container, [id^='nuxt-devtools'], nuxt-devtools-frame { visibility: hidden !important; }
  body::after { content: ''; position: fixed; inset: 0; background: ${THUMBNAIL_NAVY}; mix-blend-mode: lighten; pointer-events: none; z-index: 2147483646; }
`;

/** How long the page may take to load and draw, real milliseconds. */
export const THUMBNAIL_TIMEOUT_MS = 60_000;

/** After the page says the map is drawn, the time anything fading in takes to finish, ms. */
export const THUMBNAIL_SETTLE_MS = 1500;

/** The picture's JPEG quality, 0..100. */
export const THUMBNAIL_QUALITY = 92;

/**
 * The size a thumbnail's words are laid out at, in CSS pixels: YouTube's 1280 × 720, as the thumbnails
 * were designed, scaled down onto the page (`THUMBNAIL_PAGE`) and drawn sharp at its 4K.
 */
export const WORDS_LAYOUT: PageSize = { width: 1280, height: 720 };

/** The widest a line of words may be in that layout, so it stays clear of the network on the right. */
export const WORDS_WIDTH = 440;

/** A capital's average width in Outfit's heavy weight, as a share of its size: how a line's size is chosen to fit. */
export const CAPITAL_WIDTH = 0.64;

/** The words' sizes in that layout, px: the title's and the hook's at most and at least, the year's. */
export const WORDS_SIZES = { title: 58, hook: 84, smallest: 40, year: 196 } as const;

/** The accent the year is written in: a yellow that stands out on the navy and in YouTube's dark mode. */
export const THUMBNAIL_YELLOW = '#FFD400';

/** The typeface of a thumbnail's words, RailLineage's wordmark's: from Google Fonts. */
export const WORDS_FONT_STYLESHEET = 'https://fonts.googleapis.com/css2?family=Outfit:wght@600;800&display=block';

/** RailLineage's mark (the app's `LogoMark`), drawn bottom-left on every thumbnail. */
export const RAILLINEAGE_MARK =
  '<svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 46H58" stroke="#00a155"/><path d="M17 46L31 32H58" stroke="#00c16a"/><path d="M31 32L45 18H58" stroke="#75edae"/></g><circle cx="5" cy="46" r="5" fill="#00a155"/><circle cx="58" cy="46" r="5" fill="#00a155"/><circle cx="58" cy="32" r="5" fill="#00c16a"/><circle cx="58" cy="18" r="5" fill="#75edae"/><circle cx="17" cy="46" r="6" fill="#152030" stroke="#ffffff" stroke-width="3"/><circle cx="31" cy="32" r="6" fill="#152030" stroke="#ffffff" stroke-width="3"/></svg>';
