import { describe, expect, test } from 'vitest';
import { RECORDER_GONE } from '../../../src/jobs/jobs.constants.ts';
import type { RecordingRequest } from '../../../src/jobs/jobs.types.ts';
import { argsOf, isRunning, isVideoName, requestOf, statusAsSeen } from '../../../src/jobs/jobs.utils.ts';
import type { RecordingPhase, RecordingStatus } from '../../../src/recorder/recorder.types.ts';
import { recordingOf } from '../../../src/recorder/recorder.utils.ts';

/** A video asked for as the video page asks: Kyiv with a plan, flat, 1080p at 60 frames a second. */
const REQUEST: RecordingRequest = {
  city: 'kyiv',
  query: 'plan=kyiv-2070&view=2d',
  fps: 60,
  width: 1920,
  height: 1080,
  scale: 2,
  seconds: 900,
  rehearse: true,
  name: 'kyiv-2070-2d.mp4',
};

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

describe('JobsUtils', () => {
  describe('isVideoName', () => {
    test('takes a file name ending .mp4, never a path, nor a hidden one, as a video being written is', () => {
      expect(['kyiv-2070.mp4', 'kyiv.v2_final.mp4'].map(isVideoName)).toEqual([true, true]);
      expect(['kyiv.mov', '../kyiv.mp4', 'clips/kyiv.mp4', '.kyiv.mp4', '.mp4'].map(isVideoName)).toEqual([false, false, false, false, false]);
    });
  });

  describe('isRunning', () => {
    test('is while it starts, rehearses, records or writes the video; not once it has ended, or before any', () => {
      const phases: RecordingPhase[] = ['starting', 'rehearsing', 'recording', 'encoding', 'done', 'failed', 'cancelled'];
      expect(phases.map(phase => isRunning(statusWith({ phase })))).toEqual([true, true, true, true, false, false, false]);
      expect(isRunning(null)).toBe(false);
    });
  });

  describe('statusAsSeen', () => {
    test('says a recording whose process has gone failed, and leaves the rest as they are', () => {
      expect(statusAsSeen(statusWith(), () => false)).toEqual(statusWith({ phase: 'failed', error: RECORDER_GONE }));
      expect(statusAsSeen(statusWith(), () => true)).toEqual(statusWith());
      expect(statusAsSeen(statusWith({ phase: 'done' }), () => false)).toEqual(statusWith({ phase: 'done' }));
      expect(statusAsSeen(null, () => false)).toBeNull();
    });
  });

  describe('argsOf', () => {
    test('asks the command for the video as one would type it, which it reads back as asked', () => {
      const files = { out: '/videos/kyiv-2070-2d.mp4', status: '/cache/recording.json' };
      expect(argsOf(REQUEST, files)).toEqual([
        'kyiv',
        '--fps',
        '60',
        '--size',
        '1920x1080',
        '--scale',
        '2',
        '--seconds',
        '900',
        '--query',
        'plan=kyiv-2070&view=2d',
        '--out',
        '/videos/kyiv-2070-2d.mp4',
        '--status',
        '/cache/recording.json',
      ]);
      expect(recordingOf(argsOf({ ...REQUEST, rehearse: false }, files), '/anywhere')).toMatchObject({
        city: 'kyiv',
        query: 'plan=kyiv-2070&view=2d',
        fps: 60,
        width: 1920,
        height: 1080,
        scale: 2,
        seconds: 900,
        rehearse: false,
        out: files.out,
        status: files.status,
      });
    });

    test('gives no query for none', () => {
      expect(argsOf({ ...REQUEST, query: '' }, { out: '/v.mp4', status: '/s.json' })).not.toContain('--query');
    });
  });

  describe('requestOf', () => {
    test('takes what the video page sends', () => {
      expect(requestOf({ ...REQUEST })).toEqual(REQUEST);
      expect(requestOf({ ...REQUEST, query: '' }).query).toBe('');
    });

    test('says what is wrong with anything else, as it starts a process', () => {
      expect(() => requestOf(null)).toThrow('say what to record');
      expect(() => requestOf({ ...REQUEST, city: 'kyiv; rm -rf /' })).toThrow('the city is an id');
      expect(() => requestOf({ ...REQUEST, query: 'plan=a b' })).toThrow("the query is an address's");
      expect(() => requestOf({ ...REQUEST, fps: 0 })).toThrow('the frame rate is a whole number from 1 to 120');
      expect(() => requestOf({ ...REQUEST, width: 4000, scale: 1 })).toThrow('the width is a whole number from 1 to 3840');
      expect(() => requestOf({ ...REQUEST, width: 2560 })).toThrow('the width is a whole number from 1 to 1920');
      expect(() => requestOf({ ...REQUEST, scale: 3 })).toThrow('the scale is a whole number from 1 to 2');
      expect(() => requestOf({ ...REQUEST, height: 1080.5 })).toThrow('the height is a whole number');
      expect(() => requestOf({ ...REQUEST, width: 1281, scale: 1 })).toThrow('the width is even, as the video is encoded');
      expect(() => requestOf({ ...REQUEST, seconds: 7200 })).toThrow('in seconds, is a whole number from 1 to 3600');
      expect(() => requestOf({ ...REQUEST, rehearse: 'yes' })).toThrow('rehearse is true or false');
      expect(() => requestOf({ ...REQUEST, name: '../../escape.mp4' })).toThrow('the file is a name ending .mp4');
    });
  });
});
