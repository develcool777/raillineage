import type { RecordingStatus } from '@raillineage/video/recorder.types';
import { describe, expect, test } from 'vitest';
import { clockOf, requestErrorOf, statusLineOf, videoAddressOf, videoNameOf, videoQueryOf } from '~/features/video/record/record.utils';

/**
 * A recording's status, as its file says it.
 *
 * @param overrides - What differs from one recording, 12 s in.
 * @returns The status.
 */
const statusWith = (overrides: Partial<RecordingStatus> = {}): RecordingStatus => ({
  pid: 42,
  city: 'kyiv',
  out: '/videos/kyiv-2070.mp4',
  phase: 'recording',
  seconds: 12,
  limit: 900,
  error: null,
  ...overrides,
});

describe('RecordUtils', () => {
  describe('videoQueryOf', () => {
    test('names the plan, and the view only when flat', () => {
      expect(videoQueryOf('kyiv-2070', '3d')).toBe('plan=kyiv-2070');
      expect(videoQueryOf('kyiv-2070', '2d')).toBe('plan=kyiv-2070&view=2d');
      expect(videoQueryOf(null, '3d')).toBe('');
    });
  });

  describe('videoAddressOf', () => {
    test("opens the city's video page as asked, with no ? for nothing asked", () => {
      expect(videoAddressOf('kyiv', 'kyiv-2070', '2d')).toBe('/video/kyiv?plan=kyiv-2070&view=2d');
      expect(videoAddressOf('kyiv', null, '3d')).toBe('/video/kyiv');
    });
  });

  describe('videoNameOf', () => {
    test("names the city and the plan, the city once where the plan's id starts with it, and a flat one -2d", () => {
      expect(videoNameOf('kyiv', null, '3d')).toBe('kyiv.mp4');
      expect(videoNameOf('kyiv', 'kyiv-2070', '3d')).toBe('kyiv-2070.mp4');
      expect(videoNameOf('kyiv', 'long-term', '3d')).toBe('kyiv-long-term.mp4');
      expect(videoNameOf('kyiv', 'long-term', '2d')).toBe('kyiv-long-term-2d.mp4');
    });
  });

  describe('clockOf', () => {
    test('writes a length as a clock does', () => {
      expect(clockOf(594)).toBe('9:54');
      expect(clockOf(5.9)).toBe('0:05');
    });
  });

  describe('statusLineOf', () => {
    test('says how far it has got, and how it ended', () => {
      expect(statusLineOf(statusWith({ phase: 'rehearsing', seconds: 123 }))).toBe("Rehearsing, fetching the map's tiles: 2:03 played");
      expect(statusLineOf(statusWith({ phase: 'recording', seconds: 70 }))).toBe('Recording: 1:10 of video');
      expect(statusLineOf(statusWith({ phase: 'done', seconds: 594 }))).toBe('Saved, 9:54 long');
      expect(statusLineOf(statusWith({ phase: 'failed', error: 'ffmpeg failed' }))).toBe('Failed: ffmpeg failed');
    });
  });

  describe('requestErrorOf', () => {
    test('says what the dev server said went wrong, or what the request did', () => {
      expect(requestErrorOf(Object.assign(new Error('400 Bad Request'), { data: { error: 'the view is 2d or 3d' } }))).toBe('the view is 2d or 3d');
      expect(requestErrorOf(new Error('fetch failed'))).toBe('fetch failed');
      expect(requestErrorOf('down')).toBe('down');
    });
  });
});
