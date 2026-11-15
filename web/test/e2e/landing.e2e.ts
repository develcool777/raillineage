import CITY_INDEX from '@raillineage/data/cities.json' with { type: 'json' };
import { expect, test } from '../support/browser.utils';

/** Every city's name, as the index lists them. */
const CITY_NAMES = Object.values(CITY_INDEX).map(entry => entry.name);

test.describe('Landing', () => {
  test('lists every city, each a card', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(`${CITY_NAMES.length} cities`, { exact: true })).toBeVisible();
    const cards = await Promise.all(CITY_NAMES.map(async name => ({ name, links: await page.getByRole('link', { name }).count() })));
    expect(cards.filter(card => card.links === 0)).toEqual([]);
  });

  test('narrows the list to the cities a search finds', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('textbox', { name: 'Search cities' }).fill('Kyiv');

    await expect(page.getByText(`1 of ${CITY_NAMES.length} cities`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.getByText(`${CITY_NAMES.length} cities`, { exact: true })).toBeVisible();
  });

  test('opens a city from its card', async ({ page }) => {
    await page.goto('/');

    // From the keyboard: the card's link is laid over the whole card, with nothing of its own to see, so
    // Playwright will not click it, nor the title under it.
    await page.getByRole('link', { name: 'Kyiv' }).focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/kyiv\/?$/);
    await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
  });

  for (const path of ['/about/', '/privacy/', '/terms/']) {
    test(`serves ${path}`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    });
  }

  // A card has a picture for each theme, the one not shown hidden: only the theme shown is fetched.
  for (const [shown, other] of [
    ['dark', 'light'],
    ['light', 'dark'],
  ] as const) {
    test.describe(`in the ${shown} theme`, () => {
      test.use({ colorScheme: shown });

      test(`fetches the cards' ${shown} pictures, never their ${other}`, async ({ page }) => {
        const pictures: string[] = [];
        page.on('request', request => {
          if (request.url().endsWith('.webp')) pictures.push(new URL(request.url()).pathname);
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        expect(pictures.filter(picture => picture.endsWith(`.${other}.webp`))).toEqual([]);
        expect(pictures.filter(picture => picture.endsWith(`.${shown}.webp`)).length).toBeGreaterThan(0);
        // A first card's picture is the one its preload fetched, not fetched again.
        expect(pictures).toHaveLength(new Set(pictures).size);
      });
    });
  }

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('fits the list to the screen', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('textbox', { name: 'Search cities' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    });
  });
});
