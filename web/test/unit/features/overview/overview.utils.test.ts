import { planOnlyNetwork } from '@raillineage/network/testing/planOnlyNetwork';
import { tinyNetwork } from '@raillineage/network/testing/tinyNetwork';
import { lineId, stationId } from '@raillineage/schema/testing/ids';
import { describe, expect, test } from 'vitest';
import { cityOverviewOf } from '~/features/overview/cityOverview.utils';
import type { OverviewLine } from '~/features/overview/overview.types';
import {
  lineFactsOf,
  linesByNetwork,
  mapLinkOf,
  overviewContentsOf,
  overviewHeadingOf,
  overviewIntroOf,
  sectionReadOf,
  unfoldedLinesOf,
  yearLinkOf,
} from '~/features/overview/overview.utils';

/** A network as built, as the index of cities sums it up. */
const BUILT = { name: 'Test', country: 'Testland', networks: ['Metro'], openedYear: 1900, planOnly: false, plans: 1, lines: 3, stations: 4 };
/** A network never built, as the index sums it up. */
const NEVER_BUILT = { ...BUILT, openedYear: null, planOnly: true, plans: 2 };

/**
 * A line on an overview.
 *
 * @param id - Its id.
 * @param networkName - The brand it runs under.
 * @returns The line.
 */
const line = (id: string, networkName: string): OverviewLine => ({
  id: lineId(id),
  name: id,
  networkName,
  color: { light: '#000000', dark: '#000000' },
  opened: Date.UTC(1968, 8, 1),
  stations: 16,
  km: 21.4,
  runs: [
    [
      { id: stationId('a'), name: 'A' },
      { id: stationId('b'), name: 'B' },
    ],
  ],
});

describe('OverviewUtils', () => {
  describe('overviewIntroOf', () => {
    test('opens with when the first line opened and with what, and what the network has now; then its busiest decade and its plans', () => {
      const [story, growing, ...rest] = overviewIntroOf('Test', BUILT, cityOverviewOf('test', tinyNetwork()));
      // Its stations named in the order the opening gives them.
      expect(story).toMatch(
        /^Test's first line opened on 1 January 1900 with 2 stations, from B to A\. Today the network has 3 lines, \d+ stations and \d+ km of track\.$/,
      );
      expect(growing).toMatch(/^Its busiest decade was the 1900s, when \d+ stations? opened\. It has 1 plan for what it could become\.$/);
      expect(rest).toEqual([]);
    });

    test('says a network never built never was, what its first plan would give it, and how many it has had', () => {
      expect(overviewIntroOf('Test', NEVER_BUILT, cityOverviewOf('test', planOnlyNetwork()))).toEqual([
        'Test has never built a metro. The first of its plans, First (planned), would give it 1 line, 3 stations and 2 km of track. It has had 2 plans in all.',
      ]);
    });
  });

  describe('overviewHeadingOf', () => {
    test("heads a network's story with its first year, and a network never built with its plans", () => {
      expect(overviewHeadingOf('Kyiv', BUILT)).toEqual({
        title: 'Kyiv metro: history, lines and plans',
        description: 'Every line, station and opening since 1900, and what could come next.',
      });
      expect(overviewHeadingOf('Lviv', NEVER_BUILT).title).toBe('Lviv metro: the network never built');
    });
  });

  describe('linesByNetwork', () => {
    test('puts each line under its brand, in the order they first come', () => {
      const groups = linesByNetwork([line('victoria', 'Underground'), line('dlr', 'DLR'), line('jubilee', 'Underground')]);
      expect(groups.map(group => [group.network, group.lines.map(entry => entry.name)])).toEqual([
        ['Underground', ['victoria', 'jubilee']],
        ['DLR', ['dlr']],
      ]);
    });
  });

  describe('lineFactsOf', () => {
    test("says since when a line runs, its stops and its track, a planned line's without a year", () => {
      expect(lineFactsOf(line('victoria', 'Underground'))).toBe('Since 1968 · 16 stations · 21 km');
      expect(lineFactsOf({ ...line('red', 'Metro'), opened: null, stations: 1 })).toBe('1 station · 21 km');
    });
  });

  describe('mapLinkOf', () => {
    test("opens the city's explorer as it opens, or on a day, a line or a plan, in the explorer's own words", () => {
      expect(mapLinkOf('kyiv')).toEqual({ path: '/kyiv/', query: {} });
      expect(mapLinkOf('kyiv', { at: { day: Date.UTC(1960, 10, 6) } })).toEqual({ path: '/kyiv/', query: { at: '1960-11-06' } });
      expect(mapLinkOf('kyiv', { line: 'red' }).query).toEqual({ line: 'red' });
      expect(mapLinkOf('kyiv', { plan: 'kyiv-2070' }).query).toEqual({ plan: 'kyiv-2070' });
    });
  });

  describe('yearLinkOf', () => {
    test('opens the explorer on the last day of the year', () => {
      expect(yearLinkOf('kyiv', 1984)).toEqual({ path: '/kyiv/', query: { at: '1984-12-31' } });
    });
  });

  describe('overviewContentsOf', () => {
    test('lists the opening, then each section a network has, with how much it holds, and heads each with what it holds', () => {
      const overview = cityOverviewOf('test', tinyNetwork());
      const changes = overview.history.flatMap(group => group.changes).length;
      const contents = overviewContentsOf(overview, BUILT);
      expect(contents.map(({ id, label, count }) => ({ id, label, count }))).toEqual([
        { id: 'overview', label: 'Overview', count: undefined },
        { id: 'lines', label: 'Lines', count: '3 lines' },
        { id: 'growth', label: 'Growth', count: undefined },
        { id: 'changes', label: 'Changes', count: `${changes} changes` },
        { id: 'plans', label: 'Plans', count: '1 plan' },
      ]);
      expect(contents.map(section => section.title)).toEqual(['Overview', 'Its lines today', 'How it grew', 'Every change, year by year', 'Its plans']);
      expect(contents[0]?.description).toBeUndefined();
      expect(contents[1]?.description).toBe('3 lines, each with its stations in the order it runs.');
      expect(contents[3]?.description).toBe(`${changes} changes since 1900: every opening, extension, closure and rename.`);
    });

    test("leaves out what a network never built has none of, its growth and its changes, and heads its lines as its first plan's", () => {
      const contents = overviewContentsOf(cityOverviewOf('test', planOnlyNetwork()), NEVER_BUILT);
      expect(contents.map(section => section.id)).toEqual(['overview', 'lines', 'plans']);
      expect(contents[1]).toMatchObject({
        title: 'Its lines, as first planned',
        description: '1 line its first plan would build, each with its stations in the order it runs.',
      });
    });
  });

  describe('unfoldedLinesOf', () => {
    test("shows a small network's stops at first, and folds a big one's under each line", () => {
      const few = ['red', 'blue', 'green', 'pink'].map(id => line(id, 'Metro'));
      expect(unfoldedLinesOf(few)).toEqual(['red', 'blue', 'green', 'pink']);
      expect(unfoldedLinesOf([...few, line('brown', 'Metro')])).toEqual([]);
    });
  });

  describe('sectionReadOf', () => {
    const TOPS = [
      { id: 'lines', top: -900 },
      { id: 'growth', top: 40 },
      { id: 'changes', top: 600 },
    ];

    test('reads the last section come up to the reading line, and the first above them all, where the page opens', () => {
      expect(sectionReadOf(TOPS, 100, false)).toBe('growth');
      expect(sectionReadOf(TOPS, 30, false)).toBe('lines');
      expect(
        sectionReadOf(
          TOPS.map(section => ({ ...section, top: section.top + 1100 })),
          100,
          false,
        ),
      ).toBe('lines');
      expect(sectionReadOf([], 100, false)).toBeNull();
    });

    test('reads the last at the end of the page, however short it is', () => {
      expect(sectionReadOf(TOPS, 100, true)).toBe('changes');
      expect(sectionReadOf([], 100, true)).toBeNull();
    });
  });
});
