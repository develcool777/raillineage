import type { ChangeInfo } from '@raillineage/network/facts.types';

/** The changes of one decade, under its heading. */
export type ChangeGroup = {
  /** "1930s", or "Plan" for a plan's. */
  decade: string;
  changes: ChangeInfo[];
};
