import type { RecorderState, RecordingRequest } from '@raillineage/video/jobs.types';
import { isRunning } from '@raillineage/video/jobs.utils';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { STORE_IDS } from '~/constants/store.constants';
import { RECORD_ROUTE } from './record.constants';
import { requestErrorOf } from './record.utils';

/** What a request to the recorder answered: its state, or why it gave none. */
type Answer = { state: RecorderState } | { error: string };

/**
 * Asks the recorder, through the dev server.
 *
 * @param request - The request.
 * @returns Its answer.
 */
const answerOf = async (request: Promise<RecorderState>): Promise<Answer> => {
  try {
    return { state: await request };
  } catch (error_) {
    return { error: requestErrorOf(error_) };
  }
};

/**
 * The recorder, as the video page sees it: the recording last started, as it goes or as it ended, and
 * the videos made, as the dev server last said (`RecordingJobs`, `pnpm dev` only); and what the page
 * asks of it: how it goes, to start a video, to stop one. `record.composable.ts` asks how it goes while
 * one records.
 */
export const useRecordStore = defineStore(STORE_IDS.VIDEO_RECORD, () => {
  // ---- State
  /** The recording last started and the videos made, as last heard. */
  const recorder = shallowRef<RecorderState>({ status: null, videos: [] });
  /** Why the last request to the recorder failed; `null` once one succeeds. */
  const error = ref<string | null>(null);

  // ---- Getters
  /** Whether a video is being recorded. */
  const recording = computed(() => isRunning(recorder.value.status));

  // ---- Actions
  /**
   * Keeps what the recorder answered, or why it did not.
   *
   * @param answer - Its answer.
   */
  const HEAR = (answer: Answer) => {
    if ('error' in answer) {
      error.value = answer.error;
      return;
    }
    recorder.value = answer.state;
    error.value = null;
  };
  /** Asks the recorder how it goes. */
  const REFRESH = async () => {
    HEAR(await answerOf($fetch<RecorderState>(RECORD_ROUTE)));
  };
  /**
   * Starts recording a video.
   *
   * @param request - The video, and how to record it.
   */
  const START = async (request: RecordingRequest) => {
    HEAR(await answerOf($fetch<RecorderState>(RECORD_ROUTE, { method: 'POST', body: request })));
  };
  /** Stops the video being recorded. */
  const CANCEL = async () => {
    HEAR(await answerOf($fetch<RecorderState>(RECORD_ROUTE, { method: 'DELETE' })));
  };

  return {
    // State
    recorder,
    error,
    // Getters
    recording,
    // Actions
    HEAR,
    REFRESH,
    START,
    CANCEL,
  };
});
