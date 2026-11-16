import type { ChangeInfo } from '@raillineage/network/facts.types';
import { describe, expect, test } from 'vitest';
import { changesByDecade } from '~/utils/changes.utils';

/**
 * A change in the timeline.
 *
 * @param index - Its position.
 * @param year - Its year; `null` for a plan's.
 * @returns The change.
 */
const change = (index: number, year: number | null): ChangeInfo => ({
  index,
  kind: 'open',
  time: year === null ? null : Date.UTC(year, 5, 1),
  title: `Change ${index}`,
  color: { light: '#000000', dark: '#000000' },
  stations: [],
});

describe('ChangesUtils', () => {
  describe('changesByDecade', () => {
    test('puts each change under its decade, a plan’s under Plan', () => {
      const groups = changesByDecade([change(0, 1863), change(1, 1868), change(2, 1933), change(3, 1933), change(4, null)]);
      expect(groups.map(group => [group.decade, group.changes.map(entry => entry.index)])).toEqual([
        ['1860s', [0, 1]],
        ['1930s', [2, 3]],
        ['Plan', [4]],
      ]);
    });
  });
});
