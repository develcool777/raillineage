import type { ViewMode } from '@raillineage/renderer/transitMap.types';
import type { RecordingStatus } from '@raillineage/video/recorder.types';
import { VIDEO_SPEED } from '~/features/video/video.constants';
import type { VideoAsked } from './record.types';

/**
 * The video page's address query: the plan it plays after its history, flat if not 3D, and its speed
 * if not the video's own.
 *
 * @param asked - The plan, the view and the speed.
 * @returns The query, without its `?`; empty for none of them.
 */
export const videoQueryOf = (asked: VideoAsked): string => {
  const query = new URLSearchParams();
  if (asked.plan !== null) query.set('plan', asked.plan);
  if (asked.view === '2d') query.set('view', '2d');
  if (asked.speed !== VIDEO_SPEED) query.set('speed', String(asked.speed));
  return query.toString();
};

/**
 * A city's video as it is recorded (`/<city>/video/preview`), as asked to show: what the recorder
 * records, and its setup page frames.
 *
 * @param city - The city, by its id.
 * @param asked - The plan, the view and the speed.
 * @returns Its address.
 */
export const videoAddressOf = (city: string, asked: VideoAsked): string => {
  const query = videoQueryOf(asked);
  const page = `/${encodeURIComponent(city)}/video/preview`;
  return query ? `${page}?${query}` : page;
};

/**
 * The file a video is saved as: the city, the plan (named once where its id starts with the city's), and
 * `-2d` for a flat one.
 *
 * @param city - The city, by its id.
 * @param plan - The plan, by its id; `null` for none.
 * @param view - In 3D, or flat.
 * @returns The file name (`kyiv-2070.mp4`).
 */
export const videoNameOf = (city: string, plan: string | null, view: ViewMode): string => {
  let base = city;
  if (plan !== null) base = plan.startsWith(`${city}-`) ? plan : `${city}-${plan}`;
  return `${base}${view === '2d' ? '-2d' : ''}.mp4`;
};

/**
 * A length of video, as a clock writes it.
 *
 * @param seconds - The length, seconds.
 * @returns It, `9:54`.
 */
export const clockOf = (seconds: number): string => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * How far a recording has got, in a line.
 *
 * @param status - Its status.
 * @returns The line.
 */
export const statusLineOf = (status: RecordingStatus): string => {
  switch (status.phase) {
    case 'starting': {
      return 'Starting Chrome…';
    }
    case 'rehearsing': {
      return `Rehearsing, fetching the map's tiles: ${clockOf(status.seconds)} played`;
    }
    case 'recording': {
      return `Recording: ${clockOf(status.seconds)} of video`;
    }
    case 'encoding': {
      return 'Writing the video…';
    }
    case 'done': {
      return `Saved, ${clockOf(status.seconds)} long`;
    }
    case 'failed': {
      return `Failed: ${status.error ?? 'no reason given'}`;
    }
    case 'cancelled': {
      return 'Cancelled';
    }
  }
};

/**
 * What went wrong with a request to the recorder, as the dev server said it.
 *
 * @param error - What the request threw.
 * @returns What to say.
 */
export const requestErrorOf = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error);
  const said = (error as Error & { data?: { error?: unknown } }).data?.error;
  return typeof said === 'string' ? said : error.message;
};
