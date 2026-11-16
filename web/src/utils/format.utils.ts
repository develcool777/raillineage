import { decadeOf, yearOf } from '@raillineage/core/date.utils';
import type { LineColor, NetworkStats } from '@raillineage/network/facts.types';
import { shareNumberOf } from '~/utils/count.utils';

/** The months' names, January first. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * A number as the site writes it: whole, with thousands marked.
 *
 * @param value - The value.
 * @returns "1,284".
 */
export const formatNumber = (value: number): string => Math.round(value).toLocaleString('en-GB');

/**
 * A noun as a count of it reads.
 *
 * @param count - The count.
 * @param noun - The noun: "station".
 * @returns "station", or "stations".
 */
export const pluralOf = (count: number, noun: string): string => `${noun}${Math.round(count) === 1 ? '' : 's'}`;

/**
 * A count of something, the noun in the plural but for one.
 *
 * @param count - How many.
 * @param noun - What, in the singular.
 * @returns "1 line", "12 lines", "1,284 stations".
 */
export const counted = (count: number, noun: string): string => `${formatNumber(count)} ${pluralOf(count, noun)}`;

/**
 * A line's colour as CSS, in whichever theme the page is in: the browser picks by the page's
 * `color-scheme` (`main.css`), so it changes with the theme without asking the network again.
 *
 * @param color - The line's colour in each theme.
 * @returns A `light-dark()` colour.
 */
export const lineColor = (color: LineColor): string => `light-dark(${color.light}, ${color.dark})`;

/**
 * A share as a whole percentage, or with one decimal while it is under 10.
 *
 * @param share - 0..1.
 * @returns "34%", "4.2%", "0%"; "10%" for 9.96%.
 */
export const formatShare = (share: number): string => {
  const { value, decimals } = shareNumberOf(share);
  return `${(value / 10 ** decimals).toFixed(decimals)}%`;
};

/**
 * A walk from a station, as the coverage switch and its sentences say it.
 *
 * @param metres - The distance.
 * @returns "400 m", "1.2 km".
 */
export const formatWalk = (metres: number): string => (metres < 1000 ? `${metres} m` : `${metres / 1000} km`);

/**
 * What a plan adds, in a line.
 *
 * @param stations - Its new stations.
 * @param km - Its new track, km.
 * @returns "adds 4 stations · 6 km", leaving out what it adds none of; empty if it adds neither.
 */
export const formatPlanFacts = (stations: number, km: number): string => {
  const facts: string[] = [];
  if (stations > 0) facts.push(counted(stations, 'station'));
  if (Math.round(km) > 0) facts.push(`${Math.round(km)} km`);
  return facts.length > 0 ? `adds ${facts.join(' · ')}` : '';
};

/**
 * A day as people write it.
 *
 * @param time - A timestamp.
 * @returns "1 December 1968".
 */
export const formatDay = (time: number): string => {
  const date = new Date(time);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

/**
 * What is on the map, in a line.
 *
 * @param stats - Its stations, track and lines.
 * @param short - For a narrow screen: the stations abbreviated, the lines left out.
 * @returns "384 stations · 745 km · 20 lines", or "384 st. · 745 km".
 */
export const formatStats = (stats: NetworkStats, short = false): string => {
  const km = `${Math.round(stats.km)} km`;
  if (short) return `${stats.stations} st. · ${km}`;
  return `${counted(stats.stations, 'station')} · ${km} · ${counted(stats.lines, 'line')}`;
};

/**
 * The decade a timestamp falls in, as a heading.
 *
 * @param time - A timestamp; `null` for a plan's change, which has no date.
 * @returns "1930s", or "Plan" for a plan's change, which has no date.
 */
export const decadeHeading = (time: number | null): string => (time === null ? 'Plan' : `${decadeOf(yearOf(time))}s`);
