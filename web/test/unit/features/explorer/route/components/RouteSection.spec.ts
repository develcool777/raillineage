import { NetworkFacts } from '@railtime/network/facts.service';
import { routeNetwork } from '@railtime/network/testing/routeNetwork';
import { stationId } from '@railtime/schema/testing/ids';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/vue';
import { describe, expect, test, vi } from 'vitest';
import { renderInApp } from '@test/support/component.utils';
import RouteSection from '~/features/explorer/route/components/RouteSection.vue';
import type { RouteStops } from '~/features/explorer/tools.types';

/** A network with several ways between two stations, today: its stations, and the ways from A to E, as the map finds them. */
const today = NetworkFacts.create(routeNetwork()).today();
const routes = today.routes(stationId('a'), stationId('e'));

/**
 * The Route tab, its ends as given, and what the map found between them.
 *
 * @param ends - Where it starts and ends.
 * @param found - The ways found, and the one drawn.
 * @returns What it asks.
 */
const renderRoute = async (ends: RouteStops, found: { routes: typeof routes; shown: number | null } | null) => {
  const handlers = { onEnd: vi.fn(), onAim: vi.fn(), onClear: vi.fn(), onSwap: vi.fn(), onOption: vi.fn(), onStation: vi.fn() };
  await renderInApp(RouteSection, { stations: today.stations(), ends, aim: 'from', found, ...handlers });
  return { user: userEvent.setup(), ...handlers };
};

/** Both ends picked: A to E. */
const PICKED: RouteStops = { from: routes[0]?.from ?? null, to: routes[0]?.to ?? null };

describe('RouteSection', () => {
  test('asks for two stations until both are picked', async () => {
    await renderRoute({ from: null, to: null }, null);

    expect(screen.getByText('Plan a route')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  test('says when nothing runs between the two', async () => {
    await renderRoute(PICKED, { routes: [], shown: null });

    expect(screen.getByText('No route')).toBeTruthy();
  });

  test('lists the ways between them, the one drawn open, another drawn when picked', async () => {
    const { user, onOption } = await renderRoute(PICKED, { routes, shown: 0 });
    // Each way is an item of the list, its first button the way itself; the one drawn holds a list of its steps.
    const list = screen.getByRole('list', { name: 'Ways between them' });
    const ways = within(list)
      .getAllByRole('listitem')
      .filter(item => item.parentElement === list)
      .map(item => within(item).getAllByRole('button')[0]);

    expect(routes.length).toBeGreaterThan(1);
    expect(ways.map(way => way?.getAttribute('aria-expanded'))).toEqual(routes.map((_route, position) => String(position === 0)));
    await user.click(ways[1]!);

    expect(onOption).toHaveBeenCalledExactlyOnceWith(1);
  });

  test('swaps its ends, and clears them', async () => {
    const { user, onSwap, onClear } = await renderRoute(PICKED, { routes, shown: 0 });

    await user.click(screen.getByRole('button', { name: 'Swap from and to' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onSwap).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });
});
