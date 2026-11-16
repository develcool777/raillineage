import type { RecorderState, RecordingRequest } from '@raillineage/video/jobs.types';
import type { RecordingStatus } from '@raillineage/video/recorder.types';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, test, vi } from 'vitest';
import { RECORD_ROUTE } from '~/features/video/record/record.constants';
import { useRecordStore } from '~/features/video/record/record.store';

/** A recording under way, as the dev server says it. */
const RECORDING: RecordingStatus = { pid: 42, city: 'kyiv', out: '/videos/kyiv.mp4', phase: 'recording', seconds: 12, limit: 900, error: null };

/** What the page asks to record. */
const SETTINGS: RecordingRequest = { city: 'kyiv', query: '', fps: 60, width: 1920, height: 1080, scale: 2, seconds: 900, rehearse: true, name: 'kyiv.mp4' };

/**
 * The store, with a stand-in for the dev server that answers each request as told, and keeps what it was asked.
 *
 * @param answer - What it answers: a state, or an error it throws.
 * @returns The store, and the requests made.
 */
const storeAnswering = (answer: RecorderState | Error) => {
  setActivePinia(createPinia());
  const asked: { url: string; options?: { method?: string; body?: unknown } }[] = [];
  vi.stubGlobal('$fetch', (url: string, options?: { method?: string; body?: unknown }) => {
    asked.push({ url, ...(options && { options }) });
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  });
  return { store: useRecordStore(), asked };
};

describe('RecordStore', () => {
  test('keeps what the recorder says, and whether a video is being recorded', async () => {
    const { store, asked } = storeAnswering({ status: RECORDING });
    expect(store.recording).toBe(false);
    await store.REFRESH();
    expect(asked).toEqual([{ url: RECORD_ROUTE }]);
    expect(store.recorder.status).toEqual(RECORDING);
    expect(store.recording).toBe(true);
    expect(store.error).toBeNull();
  });

  test('asks it to record a video, and to stop it', async () => {
    const { store, asked } = storeAnswering({ status: RECORDING });
    await store.START(SETTINGS);
    await store.CANCEL();
    expect(asked).toEqual([
      { url: RECORD_ROUTE, options: { method: 'POST', body: SETTINGS } },
      { url: RECORD_ROUTE, options: { method: 'DELETE' } },
    ]);
  });

  test('says why the recorder did not answer, keeping what it last said', async () => {
    const { store } = storeAnswering(Object.assign(new Error('400 Bad Request'), { data: { error: 'a video is being recorded: cancel it first' } }));
    store.HEAR({ state: { status: RECORDING } });
    await store.START(SETTINGS);
    expect(store.error).toBe('a video is being recorded: cancel it first');
    expect(store.recorder.status).toEqual(RECORDING);
    store.HEAR({ state: { status: null } });
    expect(store.error).toBeNull();
  });
});
