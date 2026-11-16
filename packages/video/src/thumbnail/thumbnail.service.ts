import { required } from '@raillineage/core/required.utils';
import { citiesNamed, readNetwork } from '@raillineage/data/city.utils';
import type { Network } from '@raillineage/schema/network.types';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { type Browser, chromium, type Page } from 'playwright-core';
import { assertServed } from '../recorder/recorder.utils.ts';
import type { RecordedWindow } from '../recorder/videoPage.types.ts';
import {
  NETWORK_AREA,
  STYLE_ADDRESS,
  THUMBNAIL_CSS,
  THUMBNAIL_PAGE,
  THUMBNAIL_QUALITY,
  THUMBNAIL_SCALE,
  THUMBNAIL_SETTLE_MS,
  THUMBNAIL_TIMEOUT_MS,
  WORDS_FONT_STYLESHEET,
} from './thumbnail.constants.ts';
import type { BasemapStyle, Thumbnail, ThumbnailOptions } from './thumbnail.types.ts';
import { bareStyleOf, framingOf, networkPointsOf, thumbnailAddressOf, wordsLayerOf, wordsOf } from './thumbnail.utils.ts';

/**
 * A city's network as `@raillineage/data` keeps it.
 *
 * @param city - The city's id.
 * @returns Its network.
 * @throws {Error} For no such city.
 */
const storedNetworkOf = (city: string): Network => readNetwork(required(citiesNamed(city)[0], `a city ${city}`));

/**
 * Takes a video's thumbnail: a city's whole network, today's or with one of its plans built, in the app's
 * own explorer, map only, at 4K, with its words and RailLineage's mark laid over it (`wordsLayerOf`), or
 * the map alone, for a design of its own. The network is fitted to the picture's right
 * side (`NETWORK_AREA`), clear of the words a thumbnail puts on its left; the basemap is bare, land and
 * water only (`bareStyleOf`), and tinted deep navy (`THUMBNAIL_CSS`), so the lines are all that stands
 * out. The framing is the one thing it knows of the city: its track's extent, read from
 * `@raillineage/data`, as the explorer, framing for its own panels, would not fit it there. It waits for
 * the explorer's handle to say the map is drawn (`VideoPageHandle`), as a recording does.
 */
export class ThumbnailShooter {
  /** What it says as it goes. */
  private readonly report: ThumbnailOptions['report'];
  /** Starts the browser. */
  private readonly launch: () => Promise<Browser>;
  /** A city's network. */
  private readonly networkOf: (city: string) => Network;

  public constructor(options: ThumbnailOptions) {
    this.report = options.report;
    this.launch = options.launch ?? (() => chromium.launch({ channel: 'chrome' }));
    this.networkOf = options.networkOf ?? storedNetworkOf;
  }

  /**
   * Takes the picture and writes it.
   *
   * @param thumbnail - The city, the plan, the app and the file.
   * @throws {Error} For no such city or plan, no app at the origin, or a page that never draws; Chrome is closed either way.
   */
  public async shoot(thumbnail: Thumbnail): Promise<void> {
    const network = this.networkOf(thumbnail.city);
    const framing = framingOf(networkPointsOf(network, thumbnail.plan), THUMBNAIL_PAGE, NETWORK_AREA);
    const words = thumbnail.words && wordsLayerOf(wordsOf(network, thumbnail.plan, thumbnail.words), THUMBNAIL_PAGE);
    await assertServed(thumbnail.origin);
    const browser = await this.launch();
    try {
      const context = await browser.newContext({ viewport: THUMBNAIL_PAGE, deviceScaleFactor: THUMBNAIL_SCALE, colorScheme: 'dark', reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.setDefaultTimeout(THUMBNAIL_TIMEOUT_MS);
      page.on('pageerror', error => this.report(`thumbnail page: ${error.message}`));
      // The basemap's style is asked for by the page itself: it is answered bare.
      await page.route(STYLE_ADDRESS, async route => {
        const response = await route.fetch();
        await route.fulfill({ response, json: bareStyleOf((await response.json()) as BasemapStyle) });
      });
      await page.goto(thumbnailAddressOf(thumbnail, framing), { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: THUMBNAIL_CSS });
      await page.waitForFunction(() => {
        const handle = (window as RecordedWindow).raillineageVideo;
        return handle !== undefined && handle.state() !== 'loading' && handle.drawn();
      });
      if (words) await this.write(page, words);
      await sleep(THUMBNAIL_SETTLE_MS);
      mkdirSync(dirname(thumbnail.out), { recursive: true });
      await page.screenshot({ path: thumbnail.out, type: 'jpeg', quality: THUMBNAIL_QUALITY });
      this.report(`${thumbnail.out}: ${THUMBNAIL_PAGE.width * THUMBNAIL_SCALE} × ${THUMBNAIL_PAGE.height * THUMBNAIL_SCALE}`);
    } finally {
      await browser.close();
    }
  }

  /**
   * Lays the words over the map, and waits for their typeface, so none is taken in another.
   *
   * @param page - The page.
   * @param layer - The words' layer, as HTML.
   */
  private async write(page: Page, layer: string): Promise<void> {
    await page.addStyleTag({ url: WORDS_FONT_STYLESHEET });
    await page.evaluate(async html => {
      document.body.insertAdjacentHTML('beforeend', html);
      await Promise.all([document.fonts.load('800 100px Outfit'), document.fonts.load('600 100px Outfit')]);
    }, layer);
  }
}
