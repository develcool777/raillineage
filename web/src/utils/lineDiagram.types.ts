import type { Stop } from '@raillineage/network/facts.types';

/** A stop as a line diagram shows it. */
export type DiagramRow = {
  stop: Stop;
  /** Where the line ends: the first stop, or the last of a run that goes no further. */
  terminus: boolean;
  /** The last of a run, at a station the line has already called at: where a branch comes back to it. */
  rejoins: boolean;
};

/** A stop on a line diagram, with the branches that leave from it. */
export type DiagramStop = DiagramRow & {
  /** Each branch leaving it, its stops from the next on. */
  branches: DiagramStop[][];
};
