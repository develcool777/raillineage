import { screen } from '@testing-library/vue';
import { describe, expect, test } from 'vitest';
import { renderInApp } from '@test/support/component.utils';
import CityCard from '~/features/landing/components/CityCard.vue';
import { citySummaryOf } from '~/utils/city.utils';

/** A city with a history to play, and its entry in the index of cities. */
const KYIV = citySummaryOf('kyiv');

describe('CityCard', () => {
  test('links to the city at its address, with the slash the site publishes it at', async () => {
    await renderInApp(CityCard, { city: 'kyiv', summary: KYIV });

    expect(screen.getByRole('link', { name: /Kyiv/ }).getAttribute('href')).toBe('/kyiv/');
  });

  test('says what the city has: its networks, a history to play, its plans, lines and stations', async () => {
    await renderInApp(CityCard, { city: 'kyiv', summary: KYIV });

    expect(screen.getByText(KYIV.networks.join(' · '))).toBeTruthy();
    expect(screen.getByText('History to play')).toBeTruthy();
    expect(screen.getByText(`${KYIV.plans} plans`)).toBeTruthy();
    expect(screen.getByText(new RegExp(`${KYIV.openedYear} → today · ${KYIV.lines} lines · ${KYIV.stations} stations`))).toBeTruthy();
  });

  test('says a city never built is so, with no history', async () => {
    await renderInApp(CityCard, { city: 'kyiv', summary: { ...KYIV, planOnly: true, plans: 0 } });

    expect(screen.getByText('Never built')).toBeTruthy();
    expect(screen.queryByText('History to play')).toBeNull();
    expect(screen.queryByText(/→ today/)).toBeNull();
  });

  // A picture for each theme, the one not shown hidden.
  test('loads the pictures of one of the first cards at once', async () => {
    await renderInApp(CityCard, { city: 'kyiv', summary: KYIV, eager: true });

    expect(screen.getAllByRole('img', { name: 'Map of the Kyiv network' }).map(image => image.getAttribute('loading'))).toEqual(['eager', 'eager']);
  });

  test('loads the pictures of the rest when scrolled to', async () => {
    await renderInApp(CityCard, { city: 'kyiv', summary: KYIV });

    expect(screen.getAllByRole('img', { name: 'Map of the Kyiv network' }).map(image => image.getAttribute('loading'))).toEqual(['lazy', 'lazy']);
  });
});
