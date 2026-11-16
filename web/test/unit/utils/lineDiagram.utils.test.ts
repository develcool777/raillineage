import type { Stop } from '@raillineage/network/facts.types';
import { stationId } from '@raillineage/schema/testing/ids';
import { describe, expect, test } from 'vitest';
import type { DiagramStop } from '~/utils/lineDiagram.types';
import { lineDiagramOf } from '~/utils/lineDiagram.utils';

/**
 * Stops by their names, each its own id.
 *
 * @param names - Their names, in order.
 * @returns The stops.
 */
const stops = (...names: string[]): Stop[] => names.map(name => ({ id: stationId(name), name }));

/**
 * A diagram's run written out: each stop's name, its branches' after it in brackets.
 *
 * @param run - The run.
 * @returns The run, as "A B [X Y] C".
 */
const written = (run: DiagramStop[]): string =>
  run.map(entry => [entry.stop.name, ...entry.branches.map(branch => `[${written(branch)}]`)].join(' ')).join(' ');

describe('LineDiagramUtils', () => {
  describe('lineDiagramOf', () => {
    test('draws a line with no branches as one run, a terminus at each end', () => {
      const [run] = lineDiagramOf([stops('A', 'B', 'C')]);
      expect(written(run!)).toBe('A B C');
      expect(run!.map(entry => entry.terminus)).toEqual([true, false, true]);
    });

    test('hangs a branch from the stop it leaves, its stops from the next on, a terminus at its end', () => {
      const diagram = lineDiagramOf([stops('A', 'B', 'C', 'D'), stops('B', 'X', 'Y')]);
      expect(diagram.map(written)).toEqual(['A B [X Y] C D']);
      const branch = diagram[0]![1]!.branches[0]!;
      expect(branch.map(entry => entry.terminus)).toEqual([false, true]);
    });

    test('hangs branches from the same stop in the order they come, and a branch from a branch', () => {
      const diagram = lineDiagramOf([stops('A', 'B', 'C'), stops('B', 'X'), stops('B', 'Y', 'Z'), stops('Y', 'Q')]);
      expect(diagram.map(written)).toEqual(['A B [X] [Y [Q] Z] C']);
    });

    test("carries a run on with a branch from its last stop, the run's end then the branch's", () => {
      const diagram = lineDiagramOf([stops('A', 'B'), stops('B', 'C'), stops('B', 'X')]);
      expect(diagram.map(written)).toEqual(['A B [X] C']);
      expect(diagram[0]!.map(entry => entry.terminus)).toEqual([true, false, true]);
    });

    test('marks where a branch comes back to the line, which is no terminus', () => {
      const [run] = lineDiagramOf([stops('A', 'B', 'C', 'D'), stops('B', 'X', 'D')]);
      const end = run![1]!.branches[0]!.at(-1)!;
      expect(end).toMatchObject({ stop: { name: 'D' }, rejoins: true, terminus: false });
      expect(run!.at(-1)).toMatchObject({ rejoins: false, terminus: true });
    });

    test('keeps a run that leaves from no stop on the line as a diagram of its own, and skips a branch with no stop past its fork', () => {
      expect(lineDiagramOf([stops('A', 'B'), stops('P', 'Q'), stops('A')]).map(written)).toEqual(['A B', 'P Q']);
      expect(lineDiagramOf([])).toEqual([]);
    });
  });
});
