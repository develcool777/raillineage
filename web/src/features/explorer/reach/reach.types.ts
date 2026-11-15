import type { ReachBand, ReachStation } from '@raillineage/network/facts.types';

/** A band of a reach with the stations in it, soonest first. */
export type ReachGroup = { band: ReachBand; position: number; stations: ReachStation[] };
