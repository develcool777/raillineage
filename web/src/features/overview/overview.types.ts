import type { ChangeInfo, LineColor, NetworkGrowth, NetworkStats, PlanInfo, Stop } from '@raillineage/network/facts.types';
import type { LineId, StationId } from '@raillineage/schema/network.types';
import type { ChangeGroup } from '~/utils/changes.types';

/** One line on a city's overview, as it runs on the network described. */
export type OverviewLine = {
  id: LineId;
  name: string;
  /** The brand it runs under. */
  networkName: string;
  color: LineColor;
  /** When it first opened as itself, as a timestamp; `null` for a line only a plan builds. */
  opened: number | null;
  /** Its stops. */
  stations: number;
  /** Its track, km. */
  km: number;
  /** Its stops in the order it runs, as runs of track: the longest first, then each branch, from the station it leaves. */
  runs: Stop[][];
};

/**
 * A city's network on one page, for reading rather than exploring: worked out as the site is built,
 * from its facts, so the page is all there before any script runs. The network described is the one
 * the explorer opens on: as built today, or one never built with its first plan whole.
 */
export type CityOverview = {
  /** The city's id. */
  city: string;
  /** Its first opening: the day, and the stations it opened with; `null` for a network never built. */
  opening: ChangeInfo | null;
  /** Its stations, track and lines. */
  stats: NetworkStats;
  /** Its lines, in the network's order: those that run on it. */
  lines: OverviewLine[];
  /** Where more than one line is to be had, at the station or a transfer away: the lines there, by their ids. */
  interchanges: Partial<Record<StationId, LineId[]>>;
  /** How it grew, year by year and by decade; `null` for a network never built. */
  growth: NetworkGrowth | null;
  /** Every dated change, under its decade. */
  history: ChangeGroup[];
  /** Every plan the city has, with what each would add. */
  plans: PlanInfo[];
};

/** Where a link into the explorer goes, as `NuxtLink` takes it. */
export type MapLink = { path: string; query: Record<string, string> };

/** One section of an overview: its anchor, how its contents name it, and how it heads itself. */
export type OverviewContentsEntry = {
  /** The section's anchor. */
  id: string;
  /** Its name in the contents: "Lines". */
  label: string;
  /** How many it lists: "21 lines"; none for a chart. */
  count?: string;
  /** Its heading: "Its lines today". */
  title: string;
  /** What it holds, in a line under its heading; none for the opening, which has no heading of its own. */
  description?: string;
};
