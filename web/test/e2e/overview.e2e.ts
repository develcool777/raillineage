import { expect, test } from '../support/browser.utils';

test.describe('Overview', () => {
  test.describe('with no script run', () => {
    // As a search engine first reads it: the prerendered page alone.
    test.use({ javaScriptEnabled: false });

    test("reads a city's story on one page", async ({ page }) => {
      await page.goto('/kyiv/overview/');

      await expect(page.getByRole('heading', { level: 1, name: 'Kyiv metro: history, lines and plans' })).toBeVisible();
      await expect(page.getByText("Kyiv's first line opened on 6 November 1960")).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Its lines today' })).toBeVisible();
      // Its first decade open, the story's start.
      await expect(page.getByRole('button', { name: /^1960s/ })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Sviatoshynsko-Brovarska line opens' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Its plans' })).toBeVisible();
    });
  });

  test('opens a station on the map, from its line', async ({ page }) => {
    await page.goto('/kyiv/overview/');

    await page.getByRole('list', { name: 'Sviatoshynsko-Brovarska stations' }).getByRole('link', { name: 'Khreshchatyk' }).click();

    await expect(page).toHaveURL(/\/kyiv\/\?station=/);
    await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
  });

  test('opens a line on the map', async ({ page }) => {
    await page.goto('/kyiv/overview/');

    await page.getByRole('link', { name: 'Show the line on the map' }).first().click();

    await expect(page).toHaveURL(/\/kyiv\/\?line=/);
    await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
  });

  test("folds a big network's stops under each line, and its changes by decade, the first open", async ({ page }) => {
    await page.goto('/london/overview/');

    const victoria = page.getByRole('button', { name: /^Victoria/ });
    await expect(victoria).toHaveAttribute('aria-expanded', 'false');
    const stops = page.getByRole('region', { name: /^Victoria/ });
    await expect(stops).toBeHidden();
    await victoria.click();
    await expect(stops).toBeVisible();
    await expect(stops.getByText(/Brixton/)).toBeVisible();

    await expect(page.getByRole('button', { name: /^1860s/ })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: /^1960s/ })).toHaveAttribute('aria-expanded', 'false');
  });

  test('draws a line with its branches forking off and the lines to change for, a transfer away too', async ({ page }) => {
    await page.goto('/london/overview/');

    await page.getByRole('button', { name: /^Northern/ }).click();
    const northern = page.getByRole('list', { name: 'Northern stations' });
    // Mill Hill East under the station its branch leaves.
    await expect(northern.getByRole('list', { name: 'Branch from Finchley Central' }).getByRole('link', { name: 'Mill Hill East' })).toBeVisible();
    // Euston Square is a walk from Euston: its lines are to be had there too.
    const euston = northern.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Euston', exact: true }) });
    await expect(euston.first()).toContainText('change for');
    await expect(euston.first()).toContainText('Metropolitan');

    await page.goto('/kyiv/overview/');
    await expect(page.getByRole('list', { name: 'Sviatoshynsko-Brovarska stations' }).getByRole('listitem').filter({ hasText: 'Teatralna' })).toContainText(
      'Teatralna, change for Syretsko-Pecherska',
    );
  });

  test('keeps the address on the section read as it scrolls, each heading a link to its own', async ({ page }) => {
    await page.goto('/london/overview/');

    await page.getByRole('heading', { name: 'Every change, year by year' }).scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector('#changes')?.scrollIntoView());
    await expect(page).toHaveURL(/#changes$/);
    // Marked in the contents beside it, as the section read.
    await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: /^Changes/ })).toHaveAttribute('aria-current', 'location');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveURL(/\/london\/overview\/$/);

    await page.getByRole('link', { name: 'Its plans' }).click();
    await expect(page).toHaveURL(/#plans$/);
  });

  test("comes from the city's map, by its header", async ({ page }) => {
    await page.goto('/kyiv/');
    await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();

    await page.getByRole('link', { name: 'Overview' }).click();

    await expect(page).toHaveURL(/\/kyiv\/overview\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Kyiv metro: history, lines and plans' })).toBeVisible();
  });

  test('tells a network never built by its plans', async ({ page }) => {
    await page.goto('/lviv/overview/');

    await expect(page.getByRole('heading', { level: 1, name: 'Lviv metro: the network never built' })).toBeVisible();
    await expect(page.getByText('Lviv has never built a metro.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Every change, year by year' })).toHaveCount(0);
  });
});
