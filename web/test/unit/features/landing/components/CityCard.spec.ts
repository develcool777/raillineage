import { screen, waitFor } from '@testing-library/vue';
import { describe, expect, test } from 'vitest';
import { renderInApp } from '@test/support/component.utils';
import CityCard from '~/features/landing/components/CityCard.vue';
import { citySummaryOf, previewUrlOf } from '~/utils/city.utils';

/** A city with a history to play, and its entry in the index of cities. */
const KYIV = citySummaryOf('kyiv');

describe('CityCard', () => {
  test('links to the city at its address, with the slash the site publishes it at', async () => {
    await renderInApp(CityCard, { city: 'kyiv', summary: KYIV });

    expect(screen.getByRole('link', { name: 'Kyiv', exact: true }).getAttribute('href')).toBe('/kyiv/');
  });

  test('links to its overview too, the link naming the city, and says where each way in goes', async () => {
    await renderInApp(CityCard, { city: 'kyiv', summary: KYIV });

    const overview = screen.getByRole('link', { name: 'Kyiv metro overview: history, lines and plans' });
    expect(overview.getAttribute('href')).toBe('/kyiv/overview/');
    // Its words, for a search engine reading the link.
    expect(overview.textContent).toContain('Kyiv metro Overview');
    expect(screen.getByText('Open the map')).toBeTruthy();
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
    expect(screen.getByText('Open its plans')).toBeTruthy();
    expect(screen.queryByText('History to play')).toBeNull();
    expect(screen.queryByText(/→ today/)).toBeNull();
  });

  // A picture for each theme, the one not shown hidden: lazy, so the hidden one is never fetched.
  test('loads its pictures as they come into view', async () => {
    await renderInApp(CityCard, { city: 'kyiv', summary: KYIV });

    expect(screen.getAllByRole('img', { name: 'Map of the Kyiv network' }).map(image => image.getAttribute('loading'))).toEqual(['lazy', 'lazy']);
  });

  test('fetches the pictures of one of the first cards with the page, each for the theme the system prefers', async () => {
    await renderInApp(CityCard, { city: 'kyiv', summary: KYIV, preload: true });

    // The page's head is written after the render.
    const preloads = await waitFor(() => {
      const links = [...document.head.querySelectorAll('link[rel="preload"][as="image"]')];
      expect(links).toHaveLength(2);
      return links.map(link => [link.getAttribute('media'), link.getAttribute('href')]);
    });
    const pictures = screen.getAllByRole('img', { name: 'Map of the Kyiv network' }).map(image => image.getAttribute('src'));
    expect(preloads).toEqual([
      ['(prefers-color-scheme: dark)', previewUrlOf('kyiv', 'dark')],
      ['(prefers-color-scheme: light)', previewUrlOf('kyiv', 'light')],
    ]);
    // Each preload is a picture's, so the picture shown takes what its preload fetched.
    expect(new Set(pictures)).toEqual(new Set(preloads.map(([, href]) => href)));
  });
});
