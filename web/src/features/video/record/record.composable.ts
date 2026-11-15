import { useIntervalFn } from '@vueuse/core';
import { onMounted, watch } from 'vue';
import { RECORD_POLL_MS } from './record.constants';
import { useRecordStore } from './record.store';

/**
 * Keeps the video page's word of the recorder fresh: asked as the page opens, and each second while a
 * video records (`RECORD_POLL_MS`), which the dev server answers from the recorder's status file.
 */
export const useRecorderPolling = (): void => {
  const store = useRecordStore();
  const { pause, resume } = useIntervalFn(() => void store.REFRESH(), RECORD_POLL_MS, { immediate: false });
  watch(
    () => store.recording,
    recording => (recording ? resume() : pause()),
  );
  onMounted(() => void store.REFRESH());
};
