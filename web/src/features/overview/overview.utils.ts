import { yearOf } from '@raillineage/core/date.utils';
import type { CityIndexEntry } from '@raillineage/schema/cityIndex.types';
import { PLAN_STATUSES } from '~/constants/plan.constants';
import type { ExplorerUrlState } from '~/features/explorer/address/address.types';
import { formatExplorerQuery, parseExplorerQuery } from '~/features/explorer/address/address.utils';
import { OVERVIEW_SECTIONS, UNFOLDED_LINES } from '~/features/overview/overview.constants';
import type { CityOverview, MapLink, OverviewContentsEntry, OverviewLine } from '~/features/overview/overview.types';
import { counted, formatDay } from '~/utils/format.utils';

/**
 * What a city's overview says first, as an article's opening paragraphs: when its network opened and
 * with what, and what it has now; then the decade it grew most, and its plans. For one never built, what
 * its first plan would give it, and how many it has had.
 *
 * @param name - The city's name.
 * @param entry - Its entry in the index of cities.
 * @param overview - Its overview.
 * @returns The paragraphs.
 */
export const overviewIntroOf = (name: string, entry: CityIndexEntry, overview: CityOverview): string[] => {
  const { stats, opening, growth, plans } = overview;
  const size = `${counted(stats.lines, 'line')}, ${counted(stats.stations, 'station')} and ${Math.round(stats.km)} km of track`;
  const [first] = plans;
  if (entry.planOnly && first) {
    const status = PLAN_STATUSES[first.status].label.toLowerCase();
    const others = plans.length > 1 ? [`It has had ${counted(plans.length, 'plan')} in all.`] : [];
    return [[`${name} has never built a metro.`, `The first of its plans, ${first.name} (${status}), would give it ${size}.`, ...others].join(' ')];
  }
  const story: string[] = [];
  if (opening && opening.time !== null) {
    const [from] = opening.stations;
    const to = opening.stations.at(-1);
    const ends = from && to && opening.stations.length > 1 ? `, from ${from} to ${to}` : '';
    story.push(`${name}'s first line opened on ${formatDay(opening.time)} with ${counted(opening.stations.length, 'station')}${ends}.`);
  }
  story.push(`Today the network has ${size}.`);
  const growing: string[] = [];
  const busiest = growth?.busiest;
  if (busiest) growing.push(`Its busiest decade was the ${busiest.decade}s, when ${counted(busiest.stations, 'station')} opened.`);
  if (plans.length > 0) growing.push(`It has ${counted(plans.length, 'plan')} for what it could become.`);
  return [story, growing].filter(paragraph => paragraph.length > 0).map(paragraph => paragraph.join(' '));
};

/**
 * What a city's overview is headed with.
 *
 * @param name - The city's name.
 * @param entry - Its entry in the index of cities.
 * @returns Its title, and the line under it.
 */
export const overviewHeadingOf = (name: string, entry: CityIndexEntry): { title: string; description: string } =>
  entry.planOnly
    ? { title: `${name} metro: the network never built`, description: 'Every plan it has had, and what each would build.' }
    : { title: `${name} metro: history, lines and plans`, description: `Every line, station and opening since ${entry.openedYear}, and what could come next.` };

/**
 * A city's lines under the brand each runs under, in the network's order.
 *
 * @param lines - Its lines.
 * @returns Each brand with its lines.
 */
export const linesByNetwork = (lines: OverviewLine[]): { network: string; lines: OverviewLine[] }[] => {
  const groups: { network: string; lines: OverviewLine[] }[] = [];
  for (const line of lines) {
    const group = groups.find(entry => entry.network === line.networkName);
    if (group) group.lines.push(line);
    else groups.push({ network: line.networkName, lines: [line] });
  }
  return groups;
};

/**
 * A line in a few words: since when, its stops, its track.
 *
 * @param line - The line.
 * @returns "Since 1960 · 18 stations · 23 km"; a planned line's without its year.
 */
export const lineFactsOf = (line: OverviewLine): string => {
  const since = line.opened === null ? [] : [`Since ${yearOf(line.opened)}`];
  return [...since, counted(line.stations, 'station'), `${Math.round(line.km)} km`].join(' · ');
};

/**
 * A link into a city's explorer, opening it on a moment, a line, a plan or a station: written by the explorer's
 * own address (`formatExplorerQuery`), every setting left at its default.
 *
 * @param city - The city's id.
 * @param opened - What it opens on.
 * @returns Where the link goes.
 */
export const mapLinkOf = (city: string, opened: Pick<ExplorerUrlState, 'at' | 'line' | 'plan' | 'station'> = {}): MapLink => ({
  path: `/${city}/`,
  query: formatExplorerQuery({ ...parseExplorerQuery({}), ...opened }),
});

/**
 * A link into a city's explorer on the last day of a year: the network as that year left it, as a
 * chart's year picks it.
 *
 * @param city - The city's id.
 * @param year - The year.
 * @returns Where the link goes.
 */
export const yearLinkOf = (city: string, year: number): MapLink => mapLinkOf(city, { at: { day: Date.UTC(year, 11, 31) } });

/**
 * An overview's sections, as its contents list them and as each heads itself: its opening, then each
 * section it has, with how much it holds, so a long one is reached without scrolling through the rest.
 * The one list of them: what the page has a section for is what its contents name.
 *
 * @param overview - The overview.
 * @param entry - The city's entry in the index of cities.
 * @returns Its sections, in the page's order.
 */
export const overviewContentsOf = (overview: CityOverview, entry: CityIndexEntry): OverviewContentsEntry[] => {
  const { lines, growth, plans } = overview;
  let changes = 0;
  for (const group of overview.history) changes += group.changes.length;
  const linesOf: OverviewContentsEntry = entry.planOnly
    ? {
        id: OVERVIEW_SECTIONS.lines,
        label: 'Lines',
        count: counted(lines.length, 'line'),
        title: 'Its lines, as first planned',
        description: `${counted(lines.length, 'line')} its first plan would build, each with its stations in the order it runs.`,
      }
    : {
        id: OVERVIEW_SECTIONS.lines,
        label: 'Lines',
        count: counted(lines.length, 'line'),
        title: 'Its lines today',
        description: `${counted(lines.length, 'line')}, each with its stations in the order it runs.`,
      };
  return [
    { id: OVERVIEW_SECTIONS.overview, label: 'Overview', title: 'Overview' },
    ...(lines.length > 0 ? [linesOf] : []),
    ...(growth
      ? [
          {
            id: OVERVIEW_SECTIONS.growth,
            label: 'Growth',
            title: 'How it grew',
            description: `Its stations year by year since ${entry.openedYear}, and the decades they opened in.`,
          },
        ]
      : []),
    ...(changes > 0
      ? [
          {
            id: OVERVIEW_SECTIONS.changes,
            label: 'Changes',
            count: counted(changes, 'change'),
            title: 'Every change, year by year',
            description: `${counted(changes, 'change')} since ${entry.openedYear}: every opening, extension, closure and rename.`,
          },
        ]
      : []),
    ...(plans.length > 0
      ? [
          {
            id: OVERVIEW_SECTIONS.plans,
            label: 'Plans',
            count: counted(plans.length, 'plan'),
            title: 'Its plans',
            description: `${counted(plans.length, 'plan')} for what it could become, each one to open on the map.`,
          },
        ]
      : []),
  ];
};

/**
 * The lines whose stops show at first: every one in a small network; none in a bigger one, where
 * each is folded under its line, so the page is not their stops end to end.
 *
 * @param lines - The lines.
 * @returns The ids of those unfolded.
 */
export const unfoldedLinesOf = (lines: OverviewLine[]): string[] => (lines.length <= UNFOLDED_LINES ? lines.map(line => line.id) : []);

/**
 * The section being read, as the contents mark it while a reader scrolls: the last whose top has come up
 * to the reading line; at the page's end, the last, however short; above them all, the first, where the
 * page opens.
 *
 * @param tops - Each section's anchor and its top, px from the screen's top, in the page's order.
 * @param readingLine - How far down the screen a section counts as reached, px.
 * @param atEnd - Whether the page is scrolled to its end.
 * @returns The section's anchor, or `null` for a page with none.
 */
export const sectionReadOf = (tops: { id: string; top: number }[], readingLine: number, atEnd: boolean): string | null => {
  if (atEnd) return tops.at(-1)?.id ?? null;
  let read: string | null = tops[0]?.id ?? null;
  for (const { id, top } of tops) if (top <= readingLine) read = id;
  return read;
};
