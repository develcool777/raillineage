import type { LngLat } from '@raillineage/core/geometry.types';
import { planOnlyNetwork } from '@raillineage/network/testing/planOnlyNetwork';
import { tinyNetwork } from '@raillineage/network/testing/tinyNetwork';
import { describe, expect, test } from 'vitest';
import { VIDEOS_FOLDER } from '../../../src/recorder/recorder.constants.ts';
import { BARE_SOURCE_LAYERS, THUMBNAIL_YELLOW, WORDS_SIZES } from '../../../src/thumbnail/thumbnail.constants.ts';
import type { PageSize, PictureArea } from '../../../src/thumbnail/thumbnail.types.ts';
import {
  bareStyleOf,
  fittingSizeOf,
  framingOf,
  networkPointsOf,
  pagePixelOf,
  thumbnailAddressOf,
  thumbnailOf,
  wordsLayerOf,
  wordsOf,
} from '../../../src/thumbnail/thumbnail.utils.ts';

/** The folder the command was typed in. */
const TYPED_IN = '/home/someone/raillineage';

/** A page, and the right part of it a network fills. */
const PAGE: PageSize = { width: 512, height: 288 };
const AREA: PictureArea = { left: 0.4, right: 0.95, top: 0.1, bottom: 0.9 };

/** A city's track, wider than tall: about 25 km by 15 km. */
const TRACK: LngLat[] = [
  [30.35, 50.38],
  [30.7, 50.52],
  [30.5, 50.45],
];

describe('ThumbnailUtils', () => {
  describe('thumbnailOf', () => {
    test("takes the city's network today, from the app run by pnpm dev, into videos/", () => {
      expect(thumbnailOf(['kyiv'], TYPED_IN)).toEqual({
        city: 'kyiv',
        plan: null,
        origin: 'http://localhost:5180',
        out: `${VIDEOS_FOLDER}/kyiv.thumbnail.jpg`,
        words: { title: null, year: null, hook: null },
      });
    });

    test('takes the words given, or none at all', () => {
      expect(thumbnailOf(['kyiv', '--title', 'Kyiv subway', '--year', '2071', '--hook', 'WHAT IF?'], TYPED_IN).words).toEqual({
        title: 'Kyiv subway',
        year: '2071',
        hook: 'WHAT IF?',
      });
      expect(thumbnailOf(['kyiv', '--no-words'], TYPED_IN).words).toBeNull();
    });

    test('takes a plan, an origin and a file named alone or by a path', () => {
      expect(thumbnailOf(['kyiv', '--plan', 'kyiv-2070', '--origin', 'http://localhost:3000/'], TYPED_IN)).toEqual({
        city: 'kyiv',
        plan: 'kyiv-2070',
        origin: 'http://localhost:3000',
        out: `${VIDEOS_FOLDER}/kyiv-kyiv-2070.thumbnail.jpg`,
        words: { title: null, year: null, hook: null },
      });
      expect(thumbnailOf(['kyiv', '--out', 'cover.jpg'], TYPED_IN).out).toBe(`${VIDEOS_FOLDER}/cover.jpg`);
      expect(thumbnailOf(['kyiv', '--out', 'covers/kyiv.jpg'], TYPED_IN).out).toBe(`${TYPED_IN}/covers/kyiv.jpg`);
    });

    test('says what is wrong for no city, two, or an option it does not know', () => {
      expect(() => thumbnailOf([], TYPED_IN)).toThrow('name one city');
      expect(() => thumbnailOf(['kyiv', 'london'], TYPED_IN)).toThrow('name one city');
      expect(() => thumbnailOf(['kyiv', '--size', '2'], TYPED_IN)).toThrow("Unknown option '--size'");
      expect(() => thumbnailOf(['kyiv', '--origin', 'localhost'], TYPED_IN)).toThrow('--origin takes an address');
    });
  });

  describe('wordsOf', () => {
    const NONE = { title: null, year: null, hook: null };

    test("writes the network's name as the title, and the year in the plan's name, or the year it opened", () => {
      const named = planOnlyNetwork();
      // Its first plan named with a year, as a city's long-range plan often is.
      Object.assign(Object.values(named.plans ?? {})[0] ?? {}, { name: 'Test 2070' });
      expect(wordsOf(named, 'first', NONE)).toEqual({ title: 'METRO', year: '2070', hook: null });
      expect(wordsOf(planOnlyNetwork(), 'second', NONE)).toEqual({ title: 'METRO', year: null, hook: null });
      expect(wordsOf(tinyNetwork(), null, NONE)).toMatchObject({ year: tinyNetwork().meta.start.slice(0, 4) });
    });

    test('takes the words given over its own', () => {
      expect(wordsOf(planOnlyNetwork(), 'first', { title: 'Test subway', year: '2099', hook: 'WHAT IF?' })).toEqual({
        title: 'TEST SUBWAY',
        year: '2099',
        hook: 'WHAT IF?',
      });
    });
  });

  describe('fittingSizeOf', () => {
    test('writes a short line as large as asked, a long one smaller to fit, never below the smallest', () => {
      expect(fittingSizeOf('WHAT IF?', WORDS_SIZES.hook)).toBe(WORDS_SIZES.hook);
      expect(fittingSizeOf('COULD THIS HAPPEN?', WORDS_SIZES.hook)).toBeLessThan(WORDS_SIZES.hook);
      expect(fittingSizeOf('A HOOK FAR TOO LONG FOR ANY THUMBNAIL AT ALL', WORDS_SIZES.hook)).toBe(WORDS_SIZES.smallest);
    });
  });

  describe('wordsLayerOf', () => {
    test('writes the title, the year in yellow and the hook, with the mark, scaled onto the page, its text escaped', () => {
      const layer = wordsLayerOf({ title: 'KYIV <METRO>', year: '2070', hook: 'WHAT IF?' }, PAGE);
      expect(layer).toContain('transform: scale(0.4)');
      expect(layer).toContain('>KYIV &lt;METRO&gt;</p>');
      expect(layer).toContain(`color: ${THUMBNAIL_YELLOW};">2070</p>`);
      expect(layer).toContain('>WHAT IF?</p>');
      expect(layer).toContain('Rail<span');
    });

    test('leaves out a line it has no words for', () => {
      expect(wordsLayerOf({ title: 'METRO', year: null, hook: null }, PAGE)).not.toContain(THUMBNAIL_YELLOW);
    });
  });

  describe('networkPointsOf', () => {
    test("frames today's track, every segment's points", () => {
      const network = tinyNetwork();
      expect(networkPointsOf(network, null)).toEqual(network.segments.flatMap(segment => segment.coordinates));
    });

    test('frames a plan built on the network, its stations among the points', () => {
      const points = networkPointsOf(planOnlyNetwork(), 'first');
      expect(points).toEqual(expect.arrayContaining([[30, 50] as LngLat, [30.02, 50.01] as LngLat]));
    });

    test('says which plans there are for one it does not have, and to name a plan for a network never built', () => {
      expect(() => networkPointsOf(planOnlyNetwork(), 'third')).toThrow('no plan third here: its plans are first, second');
      expect(() => networkPointsOf({ ...tinyNetwork(), plans: {} }, 'any')).toThrow('no plan any here: it has none');
      expect(() => networkPointsOf(planOnlyNetwork(), null)).toThrow('no track to frame');
    });
  });

  describe('framingOf', () => {
    test('fits the track whole in its part of the page, filling it one way, centred both ways', () => {
      const framing = framingOf(TRACK, PAGE, AREA);
      const pixels = TRACK.map(point => pagePixelOf(point, framing, PAGE));
      const across = pixels.map(([x]) => x);
      const down = pixels.map(([, y]) => y);
      const [left, right, top, bottom] = [Math.min(...across), Math.max(...across), Math.min(...down), Math.max(...down)];
      expect(left).toBeGreaterThanOrEqual(AREA.left * PAGE.width - 0.01);
      expect(right).toBeLessThanOrEqual(AREA.right * PAGE.width + 0.01);
      expect(top).toBeGreaterThanOrEqual(AREA.top * PAGE.height - 0.01);
      expect(bottom).toBeLessThanOrEqual(AREA.bottom * PAGE.height + 0.01);
      // Wider than tall, so it fills the area's width; the middle of its extent is the area's middle.
      expect(right - left).toBeCloseTo((AREA.right - AREA.left) * PAGE.width, 6);
      expect((left + right) / 2).toBeCloseTo(((AREA.left + AREA.right) / 2) * PAGE.width, 6);
      expect((top + bottom) / 2).toBeCloseTo(((AREA.top + AREA.bottom) / 2) * PAGE.height, 6);
    });

    test('zooms no deeper than a street for one point', () => {
      expect(framingOf([[30.5, 50.45]], PAGE, AREA).zoom).toBe(15);
    });
  });

  describe('thumbnailAddressOf', () => {
    test("opens the city's explorer map only, at the framing, at a plan's end if one is asked for", () => {
      const framing = { zoom: 9.0123, center: [30.39412, 50.43381] as LngLat };
      expect(thumbnailAddressOf(thumbnailOf(['kyiv'], TYPED_IN), framing)).toBe('http://localhost:5180/kyiv/?map=9.01/50.43381/30.39412&mapOnly=1');
      expect(thumbnailAddressOf(thumbnailOf(['kyiv', '--plan', 'kyiv-2070'], TYPED_IN), framing)).toBe(
        'http://localhost:5180/kyiv/?plan=kyiv-2070&at=plan&map=9.01/50.43381/30.39412&mapOnly=1',
      );
    });
  });

  describe('bareStyleOf', () => {
    test('keeps land and water, leaving out roads, buildings, borders and every layer that writes a name, and the rest of the style as it is', () => {
      const style = {
        version: 8,
        layers: [
          { id: 'background' },
          { id: 'water', 'source-layer': 'water' },
          { id: 'park', 'source-layer': 'park' },
          { id: 'roads', 'source-layer': 'transportation' },
          { id: 'buildings', 'source-layer': 'building' },
          { id: 'river names', 'source-layer': 'waterway', layout: { 'text-field': '{name}' } },
        ],
      };
      expect(bareStyleOf(style)).toEqual({
        version: 8,
        layers: [{ id: 'background' }, { id: 'water', 'source-layer': 'water' }, { id: 'park', 'source-layer': 'park' }],
      });
      expect(BARE_SOURCE_LAYERS.has('place')).toBe(true);
    });
  });
});
