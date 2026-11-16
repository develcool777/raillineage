import { describe, expect, test, vi } from 'vitest';
import { FFMPEG_LOCATIONS, VIDEOS_FOLDER } from '../../../src/recorder/recorder.constants.ts';
import type { RecordingScope } from '../../../src/recorder/recorder.types.ts';
import {
  assertServed,
  drawnOnceHeld,
  ffmpegArgsOf,
  ffmpegPathOf,
  fileIn,
  installRecordingClock,
  launchOptionsOf,
  originOf,
  pageUrlOf,
  recordingOf,
  statusOf,
  untilDrawn,
  writingOf,
} from '../../../src/recorder/recorder.utils.ts';

/** The folder the command was typed in, which a path given is read from. */
const TYPED_IN = '/home/someone/raillineage';

/**
 * A page's globals as the clock finds them: a clock at 1000 ms, a date at 5000, and no frames.
 *
 * @returns Them.
 */
const scopeOf = (): RecordingScope => ({
  performance: { now: () => 1000 },
  Date: { now: () => 5000 },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
});

describe('RecorderUtils', () => {
  describe('recordingOf', () => {
    test("records the city's video page laid out at 1080p and drawn at twice it (4K), 60 frames a second, for up to an hour, from the app run by pnpm dev, into videos/", () => {
      expect(recordingOf(['kyiv'], TYPED_IN)).toEqual({
        city: 'kyiv',
        page: 'video',
        rehearse: true,
        fps: 60,
        width: 1920,
        height: 1080,
        scale: 2,
        seconds: 3600,
        origin: 'http://localhost:5180',
        query: '',
        out: expect.stringMatching(/\/packages\/video\/videos\/kyiv\.mp4$/),
        status: null,
      });
    });

    test('takes each option, a query with or without its ?, an origin with or without its /', () => {
      const args = [
        'london',
        '--page',
        'explorer',
        '--no-rehearse',
        '--fps',
        '30',
        '--size',
        '1080x1920',
        '--scale',
        '1',
        '--seconds',
        '45',
        '--query',
        '?mapOnly=1',
        '--origin',
        'http://localhost:3000/',
      ];
      expect(recordingOf([...args, '--out', 'short.mp4'], TYPED_IN)).toEqual({
        city: 'london',
        page: 'explorer',
        rehearse: false,
        fps: 30,
        width: 1080,
        height: 1920,
        scale: 1,
        seconds: 45,
        origin: 'http://localhost:3000',
        query: 'mapOnly=1',
        out: `${VIDEOS_FOLDER}/short.mp4`,
        status: null,
      });
    });

    test('writes a video named alone into videos/, and reads a path, and the status file, from where the command was typed', () => {
      expect(recordingOf(['kyiv', '--out', 'kyiv-2070.mp4'], TYPED_IN).out).toBe(`${VIDEOS_FOLDER}/kyiv-2070.mp4`);
      expect(recordingOf(['kyiv', '--out', 'clips/kyiv.mp4'], TYPED_IN).out).toBe(`${TYPED_IN}/clips/kyiv.mp4`);
      expect(recordingOf(['kyiv', '--out', '/Volumes/clips/kyiv.mp4'], TYPED_IN).out).toBe('/Volumes/clips/kyiv.mp4');
      expect(recordingOf(['kyiv', '--status', '.cache/status.json'], TYPED_IN).status).toBe(`${TYPED_IN}/.cache/status.json`);
    });

    test('says what is wrong for no city, two, an option it does not know, or a value it cannot read', () => {
      expect(() => recordingOf([], TYPED_IN)).toThrow('name one city');
      expect(() => recordingOf(['kyiv', 'london'], TYPED_IN)).toThrow('name one city');
      expect(() => recordingOf(['kyiv', '--speed', '2'], TYPED_IN)).toThrow("Unknown option '--speed'");
      expect(() => recordingOf(['kyiv', '--fps', '0'], TYPED_IN)).toThrow('--fps takes a whole number, not 0');
      expect(() => recordingOf(['kyiv', '--seconds', '1.5'], TYPED_IN)).toThrow('--seconds takes a whole number');
      expect(() => recordingOf(['kyiv', '--size', '1920'], TYPED_IN)).toThrow('--size takes width x height');
      expect(() => recordingOf(['kyiv', '--size', '1281x720'], TYPED_IN)).toThrow('--size takes even sides, as the video is encoded, not 1281x720');
      expect(() => recordingOf(['kyiv', '--scale', '1.5'], TYPED_IN)).toThrow('--scale takes a whole number, not 1.5');
      expect(() => recordingOf(['kyiv', '--origin', 'localhost'], TYPED_IN)).toThrow('--origin takes an address');
      expect(() => recordingOf(['kyiv', '--page', 'landing'], TYPED_IN)).toThrow('--page takes video or explorer, not landing');
    });
  });

  describe('statusOf', () => {
    test('says which recording, how far it has got, out of how long at most, and by which process', () => {
      const recording = recordingOf(['kyiv', '--seconds', '900', '--out', 'kyiv-2070.mp4'], TYPED_IN);
      expect(statusOf(recording, 42, 'recording', 12)).toEqual({
        pid: 42,
        city: 'kyiv',
        out: `${VIDEOS_FOLDER}/kyiv-2070.mp4`,
        phase: 'recording',
        seconds: 12,
        limit: 900,
        error: null,
      });
      expect(statusOf(recording, 42, 'failed', 0, 'ffmpeg failed').error).toBe('ffmpeg failed');
    });
  });

  describe('fileIn', () => {
    test('writes into videos/ under its own name for none given, or a name alone; a path from where the command was typed', () => {
      expect(fileIn(undefined, 'kyiv.thumbnail.jpg', TYPED_IN)).toBe(`${VIDEOS_FOLDER}/kyiv.thumbnail.jpg`);
      expect(fileIn('cover.jpg', 'kyiv.thumbnail.jpg', TYPED_IN)).toBe(`${VIDEOS_FOLDER}/cover.jpg`);
      expect(fileIn('covers/cover.jpg', 'kyiv.thumbnail.jpg', TYPED_IN)).toBe(`${TYPED_IN}/covers/cover.jpg`);
    });
  });

  describe('originOf', () => {
    test('reads where the app is served, whatever path follows it, and says what it takes otherwise', () => {
      expect(originOf('http://localhost:3000/kyiv/')).toBe('http://localhost:3000');
      expect(() => originOf('localhost')).toThrow('--origin takes an address (http://localhost:5180), not localhost');
    });
  });

  describe('assertServed', () => {
    test('passes when the app answers, and says to start it when nothing does', async () => {
      vi.stubGlobal('fetch', () => Promise.resolve(new Response()));
      await expect(assertServed('http://localhost:5180')).resolves.toBeUndefined();
      vi.stubGlobal('fetch', () => Promise.reject(new TypeError('fetch failed')));
      await expect(assertServed('http://localhost:5180')).rejects.toThrow('nothing serves the app at http://localhost:5180: start it, or give another origin');
    });
  });

  describe('writingOf', () => {
    test('writes a video beside its file, hidden, until it is whole', () => {
      expect(writingOf('/videos/kyiv-2070.mp4')).toBe('/videos/.kyiv-2070.mp4');
    });
  });

  describe('pageUrlOf', () => {
    test("opens the city's video page or explorer, with the query given", () => {
      expect(pageUrlOf(recordingOf(['kyiv'], TYPED_IN))).toBe('http://localhost:5180/kyiv/video/preview');
      expect(pageUrlOf(recordingOf(['kyiv', '--page', 'explorer'], TYPED_IN))).toBe('http://localhost:5180/kyiv');
      expect(pageUrlOf(recordingOf(['kyiv', '--page', 'explorer', '--query', 'mapOnly=1&speed=2'], TYPED_IN))).toBe(
        'http://localhost:5180/kyiv?mapOnly=1&speed=2',
      );
    });
  });

  describe('launchOptionsOf', () => {
    test('starts the Chrome installed, the page at the size asked, drawn at its scale, stating the motion a recording wants, leaving Ctrl+C to the recorder', () => {
      expect(launchOptionsOf(recordingOf(['kyiv', '--size', '1280x720'], TYPED_IN))).toEqual({
        channel: 'chrome',
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 2,
        reducedMotion: 'no-preference',
        handleSIGINT: false,
        handleSIGTERM: false,
      });
    });
  });

  describe('drawnOnceHeld', () => {
    test("runs the page's frames at the moment held before it asks, so what came is drawn by the answer", () => {
      const said: string[] = [];
      const answer = drawnOnceHeld({
        raillineageRecorder: {
          advance: time => {
            said.push(`advance ${time}`);
          },
        },
        raillineageVideo: {
          state: () => 'playing',
          start: () => {},
          drawn: () => {
            said.push('drawn');
            return false;
          },
        },
      });
      expect(answer).toBe(false);
      expect(said).toEqual(['advance 0', 'drawn']);
    });

    test('has nothing to wait for on a page with no handle yet', () => {
      expect(drawnOnceHeld({})).toBe(true);
    });
  });

  describe('untilDrawn', () => {
    test('waits, drawing again, until the page says it is drawn, and no longer', async () => {
      const answers = [false, false, true];
      const wait = vi.fn(() => Promise.resolve());
      const drawn = vi.fn(() => Promise.resolve(answers.shift() ?? true));
      await untilDrawn(drawn, wait, () => false);
      expect([drawn.mock.calls.length, wait.mock.calls.length]).toEqual([3, 2]);
    });

    test('takes the frame as it is once it has waited as long as it may', async () => {
      const wait = vi.fn(() => Promise.resolve());
      await untilDrawn(
        () => Promise.resolve(false),
        wait,
        () => true,
      );
      expect(wait).not.toHaveBeenCalled();
    });
  });

  describe('ffmpegArgsOf', () => {
    test('encodes the frames piped in, at their rate, into an H.264 MP4 any player takes', () => {
      const args = ffmpegArgsOf(recordingOf(['kyiv', '--fps', '30'], TYPED_IN));
      expect(args.join(' ')).toContain('-f image2pipe -framerate 30 -c:v mjpeg -i -');
      expect(args.join(' ')).toContain('-c:v libx264');
      expect(args.at(-1)).toMatch(/\/packages\/video\/videos\/kyiv\.mp4$/);
    });

    test("writes HD's standard colour, and says so in the file, so a player shows it as the page did", () => {
      const command = ffmpegArgsOf(recordingOf(['kyiv'], TYPED_IN)).join(' ');
      expect(command).toContain('scale=out_color_matrix=bt709:out_range=tv,format=yuv420p');
      expect(command).toContain('setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709');
    });
  });

  describe('ffmpegPathOf', () => {
    test('finds ffmpeg in the first place it is installed to that has it', () => {
      expect(ffmpegPathOf(() => true)).toBe(FFMPEG_LOCATIONS[0]);
      expect(ffmpegPathOf(path => path === '/usr/bin/ffmpeg')).toBe('/usr/bin/ffmpeg');
    });

    test('says how to install it where none has it', () => {
      expect(() => ffmpegPathOf(() => false)).toThrow('brew install ffmpeg');
    });
  });

  describe('installRecordingClock', () => {
    test('stands the time still, from where it was, until the recorder moves it', () => {
      const scope = scopeOf();
      installRecordingClock(scope);
      expect(scope.performance.now()).toBe(0);
      expect(scope.Date.now()).toBe(5000);
      scope.raillineageRecorder?.advance(16);
      expect(scope.performance.now()).toBe(16);
      expect(scope.Date.now()).toBe(5016);
    });

    test('runs the frames asked for as it moves, at its time; one asked for meanwhile, the next time', () => {
      const scope = scopeOf();
      installRecordingClock(scope);
      const times: number[] = [];
      const again = vi.fn();
      scope.requestAnimationFrame(time => {
        times.push(time);
        scope.requestAnimationFrame(again);
      });
      expect(times).toEqual([]);
      scope.raillineageRecorder?.advance(20);
      expect(times).toEqual([20]);
      expect(again).not.toHaveBeenCalled();
      scope.raillineageRecorder?.advance(0);
      expect(again).toHaveBeenCalledWith(20);
    });

    test('drops a frame cancelled before it runs', () => {
      const scope = scopeOf();
      installRecordingClock(scope);
      const cancelled = vi.fn();
      scope.cancelAnimationFrame(scope.requestAnimationFrame(cancelled));
      scope.raillineageRecorder?.advance(16);
      expect(cancelled).not.toHaveBeenCalled();
    });
  });
});
