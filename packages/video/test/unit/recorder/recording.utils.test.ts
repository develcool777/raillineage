import { describe, expect, test } from 'vitest';
import { evenSideOf, isEvenSide, videoPagePathOf } from '../../../src/recorder/recording.utils.ts';

describe('RecordingUtils', () => {
  describe('videoPagePathOf', () => {
    test("finds a city's video as it is recorded, its id written into the path", () => {
      expect(videoPagePathOf('kyiv')).toBe('/kyiv/video/preview');
      expect(videoPagePathOf('a b')).toBe('/a%20b/video/preview');
    });
  });

  describe('isEvenSide', () => {
    test('takes an even side, as the video is encoded, and no odd one', () => {
      expect([1920, 1080, 2].map(isEvenSide)).toEqual([true, true, true]);
      expect([1921, 1081, 1].map(isEvenSide)).toEqual([false, false, false]);
    });
  });

  describe('evenSideOf', () => {
    test('makes a side even, the one at or below it', () => {
      expect([1920, 1921, 1081, 3].map(evenSideOf)).toEqual([1920, 1920, 1080, 2]);
    });
  });
});
