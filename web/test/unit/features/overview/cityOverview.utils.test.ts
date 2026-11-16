import { planOnlyNetwork } from '@raillineage/network/testing/planOnlyNetwork';
import { tinyNetwork } from '@raillineage/network/testing/tinyNetwork';
import { describe, expect, test } from 'vitest';
import { cityOverviewOf } from '~/features/overview/cityOverview.utils';

describe('CityOverviewUtils', () => {
  describe('cityOverviewOf', () => {
    test('describes a network as built today: its first opening, its lines running, how it grew, every dated change and its plans', () => {
      const overview = cityOverviewOf('test', tinyNetwork());
      expect(overview.city).toBe('test');
      expect(overview.opening).toMatchObject({ kind: 'open', time: Date.UTC(1900, 0, 1) });
      // Blue closed in 1950: only the lines that run today.
      expect(overview.lines.map(entry => entry.name)).toEqual(['Red', 'Pink', 'Green']);
      expect(overview.lines[0]).toMatchObject({ networkName: 'Metro', opened: Date.UTC(1900, 0, 1) });
      expect(overview.lines[0]!.runs[0]?.map(stop => stop.name)).toEqual(expect.arrayContaining(['A', 'B', 'C']));
      expect(overview.stats.lines).toBe(overview.lines.length);
      expect(overview.growth?.years.at(-1)?.stations).toBe(overview.stats.stations);
      expect(overview.history.map(group => group.decade)).toContain('1900s');
      expect(overview.history.flatMap(group => group.changes).every(change => change.time !== null)).toBe(true);
      expect(overview.plans.map(plan => plan.name)).toEqual(['Extension']);
    });

    test('describes a network never built by its first plan whole, with no history', () => {
      const overview = cityOverviewOf('test', planOnlyNetwork());
      expect(overview.opening).toBeNull();
      expect(overview.growth).toBeNull();
      expect(overview.history).toEqual([]);
      expect(overview.lines).toEqual([expect.objectContaining({ name: 'Red', opened: null, stations: 3 })]);
      // Each stop with its id, which a link to it on the map takes.
      expect(overview.lines[0]!.runs).toEqual([['a', 'b', 'c'].map(id => ({ id, name: id.toUpperCase() }))]);
      expect(overview.plans.map(plan => plan.name)).toEqual(['First', 'Second']);
    });
  });
});
