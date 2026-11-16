import { planOnlyNetwork } from '@raillineage/network/testing/planOnlyNetwork';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Browser } from 'playwright-core';
import { describe, expect, onTestFinished, test, vi } from 'vitest';
import type { RecordedWindow, VideoPageState } from '../../../src/recorder/videoPage.types.ts';
import { THUMBNAIL_CSS, THUMBNAIL_PAGE, THUMBNAIL_SCALE, WORDS_FONT_STYLESHEET } from '../../../src/thumbnail/thumbnail.constants.ts';
import { ThumbnailShooter } from '../../../src/thumbnail/thumbnail.service.ts';
import type { Thumbnail, ThumbnailWords } from '../../../src/thumbnail/thumbnail.types.ts';

/** The basemap's style as its server gives it: a ground, roads, and the city's names. */
const STYLE = {
  version: 8,
  layers: [
    { id: 'water', 'source-layer': 'water' },
    { id: 'roads', 'source-layer': 'transportation' },
    { id: 'names', layout: { 'text-field': '{name}' } },
  ],
};

/**
 * A thumbnail of the plan-only test network's first plan, written into a folder of its own, removed
 * after the test.
 *
 * @param words - Its words; the map alone unless given.
 * @returns The thumbnail.
 */
const thumbnailInFolder = (words: ThumbnailWords | null = null): Thumbnail => {
  const folder = mkdtempSync(join(tmpdir(), 'raillineage-thumbnail-'));
  onTestFinished(() => rmSync(folder, { recursive: true, force: true }));
  return { city: 'test', plan: 'first', origin: 'http://localhost:5180', out: join(folder, 'covers', 'test-first.thumbnail.jpg'), words };
};

/**
 * A Chrome with the explorer in it: it asks for the basemap's style as it loads, says it is loading for a
 * while, then that its map is drawn, and takes a picture of a few bytes.
 *
 * @param fails - Whether the page fails to load.
 * @returns The browser, and what was done with it.
 */
const chromeWith = (fails = false) => {
  const seen = {
    contextOptions: [] as unknown[],
    visited: [] as string[],
    styles: [] as unknown[],
    css: [] as string[],
    fonts: [] as string[],
    layers: [] as string[],
    shots: [] as unknown[],
    asked: 0,
    closes: 0,
  };
  let state: VideoPageState = 'loading';
  const scope: RecordedWindow = { raillineageVideo: { state: () => state, start: () => {}, drawn: () => state !== 'loading' } };
  vi.stubGlobal('window', scope);
  let styleRoute: ((route: unknown) => Promise<void>) | null = null;
  const page = {
    setDefaultTimeout: () => {},
    on: () => {},
    route: (_address: RegExp, handler: (route: unknown) => Promise<void>) => {
      styleRoute = handler;
      return Promise.resolve();
    },
    goto: async (address: string) => {
      seen.visited.push(address);
      if (fails) throw new Error('net::ERR_CONNECTION_REFUSED');
      await styleRoute?.({
        fetch: () => Promise.resolve({ json: () => Promise.resolve(STYLE) }),
        fulfill: ({ json }: { json: unknown }) => {
          seen.styles.push(json);
        },
      });
    },
    addStyleTag: ({ content, url }: { content?: string; url?: string }) => {
      if (content !== undefined) seen.css.push(content);
      if (url !== undefined) seen.fonts.push(url);
    },
    // Writes the words' layer into the page, which here only keeps it.
    evaluate: (_write: unknown, layer: string) => {
      seen.layers.push(layer);
      return Promise.resolve();
    },
    waitForFunction: (drawn: () => boolean) => {
      // Asked until it says so, the page loading for the first two asks.
      while (!drawn()) {
        seen.asked += 1;
        if (seen.asked === 2) state = 'ready';
      }
      return Promise.resolve();
    },
    screenshot: (options: { path: string }) => {
      seen.shots.push(options);
      writeFileSync(options.path, 'picture');
      return Promise.resolve();
    },
  };
  const browser = {
    newContext: (options: unknown) => {
      seen.contextOptions.push(options);
      return Promise.resolve({ newPage: () => Promise.resolve(page) });
    },
    close: () => {
      seen.closes += 1;
      return Promise.resolve();
    },
  };
  return { launch: vi.fn(() => Promise.resolve(browser as unknown as Browser)), seen };
};

/**
 * A shooter with a stand-in Chrome and the plan-only test network as every city's, the app served.
 *
 * @param launch - Starts the stand-in Chrome.
 * @returns The shooter, and what it said.
 */
const shooterWith = (launch: () => Promise<Browser>) => {
  vi.stubGlobal('fetch', () => Promise.resolve(new Response()));
  const said: string[] = [];
  return {
    shooter: new ThumbnailShooter({
      launch,
      report: line => {
        said.push(line);
      },
      networkOf: planOnlyNetwork,
    }),
    said,
  };
};

describe('ThumbnailShooter', () => {
  test("takes the plan's network from the explorer, map only, bare and tinted, at 4K, once the page says it is drawn, and closes Chrome", async () => {
    const { launch, seen } = chromeWith();
    const { shooter, said } = shooterWith(launch);
    const thumbnail = thumbnailInFolder();
    await shooter.shoot(thumbnail);
    expect(seen.contextOptions).toEqual([{ viewport: THUMBNAIL_PAGE, deviceScaleFactor: THUMBNAIL_SCALE, colorScheme: 'dark', reducedMotion: 'reduce' }]);
    expect(seen.visited).toEqual([expect.stringMatching(/^http:\/\/localhost:5180\/test\/\?plan=first&at=plan&map=[\d.]+\/[\d.]+\/[\d.]+&mapOnly=1$/)]);
    expect(seen.styles).toEqual([{ version: 8, layers: [{ id: 'water', 'source-layer': 'water' }] }]);
    expect(seen.css).toEqual([THUMBNAIL_CSS]);
    expect(seen.asked).toBe(2);
    expect(seen.shots).toEqual([{ path: thumbnail.out, type: 'jpeg', quality: expect.any(Number) }]);
    expect(readFileSync(thumbnail.out, 'utf8')).toBe('picture');
    expect(seen.closes).toBe(1);
    expect(said).toEqual([`${thumbnail.out}: 3840 × 2160`]);
    expect(seen.layers).toEqual([]);
  });

  test("lays its words over the map, the city's own where none are given, in their typeface", async () => {
    const { launch, seen } = chromeWith();
    const { shooter } = shooterWith(launch);
    await shooter.shoot(thumbnailInFolder({ title: null, year: null, hook: 'WHAT IF?' }));
    expect(seen.fonts).toEqual([WORDS_FONT_STYLESHEET]);
    expect(seen.layers).toEqual([expect.stringContaining('>METRO</p>')]);
    expect(seen.layers[0]).toContain('>WHAT IF?</p>');
    expect(seen.shots).toHaveLength(1);
  });

  test('says so for a plan the city does not have, or no app served, before starting Chrome', async () => {
    const { launch } = chromeWith();
    const { shooter } = shooterWith(launch);
    await expect(shooter.shoot({ ...thumbnailInFolder(), plan: 'third' })).rejects.toThrow('no plan third here');
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('fetch failed')));
    await expect(shooter.shoot(thumbnailInFolder())).rejects.toThrow('nothing serves the app at http://localhost:5180: start it');
    expect(launch).not.toHaveBeenCalled();
  });

  test('closes Chrome, and writes nothing, when the page fails', async () => {
    const { launch, seen } = chromeWith(true);
    const { shooter } = shooterWith(launch);
    const thumbnail = thumbnailInFolder();
    await expect(shooter.shoot(thumbnail)).rejects.toThrow('net::ERR_CONNECTION_REFUSED');
    expect(seen.closes).toBe(1);
    expect(existsSync(thumbnail.out)).toBe(false);
  });
});
