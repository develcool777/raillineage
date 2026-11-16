import type { Stop } from '@raillineage/network/facts.types';
import type { StationId } from '@raillineage/schema/network.types';
import type { DiagramStop } from '~/utils/lineDiagram.types';

/** A stop as the diagram is put together, before what it is is known. */
type Placed = { stop: Stop; branches: Placed[][] };

/** A stop placed, with the run it is on. */
type Place = { run: Placed[]; placed: Placed };

/**
 * Places a line's runs: the longest down the page, each branch hung from the first stop placed at the
 * station it leaves, and a branch from a run's last stop, with nothing leaving it yet, carrying the
 * run on. A run that leaves from no stop placed is a run of its own; a branch with no stop past its
 * fork, nothing.
 *
 * @param runs - The line's runs of track, the longest first, then each branch, whose first stop is the station it leaves from.
 * @returns The runs of their own, and every stop placed, in the order placed.
 */
const placedOf = (runs: Stop[][]): { roots: Placed[][]; places: Place[] } => {
  const roots: Placed[][] = [];
  const places: Place[] = [];
  for (const run of runs) {
    const [from, ...onwards] = run;
    const fork = from && places.find(place => place.placed.stop.id === from.id);
    const stops = (fork ? onwards : run).map(stop => ({ stop, branches: [] }));
    if (stops.length === 0) continue;
    const carried = fork !== undefined && fork.run.at(-1) === fork.placed && fork.placed.branches.length === 0;
    if (!fork) roots.push(stops);
    else if (carried) fork.run.push(...stops);
    else fork.placed.branches.push(stops);
    places.push(...stops.map(placed => ({ run: carried ? fork.run : stops, placed })));
  }
  return { roots, places };
};

/**
 * A line as a diagram draws it: its longest run down the page, each branch hung from the stop it
 * leaves, where it forks off (`placedOf`); its ends marked, and where a branch comes back to it.
 *
 * @param runs - The line's runs of track, the longest first, then each branch, whose first stop is the station it leaves from.
 * @returns Its diagrams: the line's, then any run apart from it.
 */
export const lineDiagramOf = (runs: Stop[][]): DiagramStop[][] => {
  const { roots, places } = placedOf(runs);
  /** Each station's first stop placed: a run ending at a station placed before comes back to the line. */
  const first = new Map<StationId, Placed>();
  for (const { placed } of places) if (!first.has(placed.stop.id)) first.set(placed.stop.id, placed);
  const drawn = (run: Placed[], root: boolean): DiagramStop[] =>
    run.map((placed, position) => {
      const last = position === run.length - 1;
      const rejoins = last && first.get(placed.stop.id) !== placed;
      return {
        stop: placed.stop,
        terminus: (root && position === 0) || (last && !rejoins),
        rejoins,
        branches: placed.branches.map(branch => drawn(branch, false)),
      };
    });
  return roots.map(run => drawn(run, true));
};
