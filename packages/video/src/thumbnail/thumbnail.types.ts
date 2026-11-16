import type { LngLat } from '@raillineage/core/geometry.types';
import type { Network } from '@raillineage/schema/network.types';
import type { Browser } from 'playwright-core';

/** One thumbnail's picture: a city's network, today's or with a plan built, from the app, and where it goes. */
export type Thumbnail = {
  /** The city, by its id in the address (`kyiv`). */
  city: string;
  /** A plan of the city's built on its network, by id; `null` for the network today. */
  plan: string | null;
  /** Where the app is served. */
  origin: string;
  /** The JPEG written. */
  out: string;
  /** The words asked for over the map, each left `null` for the city's own; `null` for the map alone. */
  words: ThumbnailWords | null;
};

/** A thumbnail's words, top to bottom: what the network is, the year in big yellow, and a short hook. */
export type ThumbnailWords = {
  /** `KYIV METRO`: the network's name, as its data has it, unless one is given. */
  title: string | null;
  /** `2070`: the year in the plan's name, or the year the network opened, unless one is given; none for a plan with none. */
  year: string | null;
  /** `WHAT IF?`: none unless one is given. */
  hook: string | null;
};

/** A page's size, in its own pixels (CSS's). */
export type PageSize = { width: number; height: number };

/** A part of the picture, as fractions of its width and height from its left and top. */
export type PictureArea = { left: number; right: number; top: number; bottom: number };

/** Where the map looks: its zoom (MapLibre's, a 512-pixel world at 0) and the point at its centre. */
export type MapFraming = { zoom: number; center: LngLat };

/** A basemap's style as the thumbnail reads it: its layers, each perhaps of a tile layer and with a name to draw. */
export type BasemapStyle = { layers: { 'source-layer'?: string; layout?: Record<string, unknown> }[] };

/** What a `ThumbnailShooter` is made with. */
export type ThumbnailOptions = {
  /** What it says as it goes. */
  report: (line: string) => void;
  /** Starts the browser: the Chrome installed on this machine, unless a test gives a stand-in. */
  launch?: () => Promise<Browser>;
  /** A city's network, by its id: read from `@raillineage/data`, unless a test gives a stand-in. */
  networkOf?: (city: string) => Network;
};
