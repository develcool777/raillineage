import { fromEntriesOf } from '@raillineage/core/collection.utils';
import { NetworkFacts } from '@raillineage/network/facts.service';
import type { FactsAt } from '@raillineage/network/moment.service';
import type { LineId, Network, StationId } from '@raillineage/schema/network.types';
import type { CityOverview, OverviewLine } from '~/features/overview/overview.types';
import { changesByDecade } from '~/utils/changes.utils';

// What the build's server works out (`server/api/overviews/`), apart from the page's own helpers
// (`overview.utils.ts`): it asks the network alone, as a server knows no browser.

/**
 * One line as it runs on the network described.
 *
 * @param described - The network at the moment described.
 * @param line - The line.
 * @returns Its stops, track and runs.
 */
const overviewLineOf = (described: FactsAt, line: LineId): OverviewLine => {
  const { id, name, networkName, color, opened, stations, km, branches } = described.line(line);
  return { id, name, networkName, color, opened, stations, km, runs: branches };
};

/**
 * Where more than one line is to be had, the lines there (`FactsAt.interchanges`), by their ids: all a
 * line's diagram needs to say which others to change for, the rest of each line being on the page.
 *
 * @param described - The network at the moment described.
 * @returns The lines at each interchange.
 */
const interchangesOf = (described: FactsAt): Partial<Record<StationId, LineId[]>> =>
  fromEntriesOf(
    [...described.interchanges()].filter(([, lines]) => lines.length > 1).map(([station, lines]) => [station, lines.map(line => line.id)] as const),
  );

/**
 * A city's overview: its network as the explorer opens on it (`NetworkFacts.planToOpen`), as built
 * today, or one never built with its first plan whole; its lines, its history and its plans.
 *
 * @param city - The city's id.
 * @param network - Its network, as stored.
 * @returns The overview.
 */
export const cityOverviewOf = (city: string, network: Network): CityOverview => {
  const plan = NetworkFacts.planToOpen(network, undefined);
  const facts = NetworkFacts.create(network, { ...(plan && { plan }) });
  const described = facts.built();
  const changes = facts.changes();
  return {
    city,
    opening: changes.find(change => change.kind === 'open' && change.time !== null) ?? null,
    stats: described.stats(),
    lines: facts
      .lines()
      .map(line => overviewLineOf(described, line.id))
      .filter(line => line.stations > 0),
    interchanges: interchangesOf(described),
    growth: facts.hasHistory() ? facts.growth() : null,
    history: changesByDecade(changes.filter(change => change.time !== null)),
    plans: facts.plans(),
  };
};
