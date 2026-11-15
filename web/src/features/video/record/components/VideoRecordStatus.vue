<template>
  <!-- The recording under way or last made, and the videos made, one played. -->
  <section class="flex flex-col gap-4">
    <h2 class="text-highlighted text-sm font-semibold">Recordings</h2>
    <UAlert v-if="props.error" color="error" variant="subtle" icon="i-lucide-circle-alert" title="The recorder did not answer" :description="props.error" />
    <div v-if="props.state.status" class="ring-default flex flex-col gap-3 rounded-lg p-4 ring-1">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon :name="statusIcon" class="size-5 flex-none" :class="statusColor" />
          <div class="min-w-0">
            <p class="text-highlighted text-sm font-medium">{{ statusLineOf(props.state.status) }}</p>
            <p class="text-muted truncate text-xs">{{ props.state.status.out }}</p>
          </div>
        </div>
        <UButton v-if="props.recording" label="Cancel" icon="i-lucide-square" color="neutral" variant="outline" size="sm" @click="emit('cancel')" />
      </div>
      <UProgress v-if="props.recording" :modelValue="null" size="sm" />
    </div>
    <p v-else class="text-muted text-sm">No recording started from here yet: set the video up, then Record.</p>

    <template v-if="props.state.videos.length > 0">
      <!-- `key`: a video picked plays from its start. -->
      <video v-if="playing" :key="playing" :src="videoUrlOf(playing)" controls class="w-full rounded-lg bg-black">
        <!-- A video of a map, with no words spoken. -->
        <track kind="captions" />
      </video>
      <ul class="divide-default flex flex-col divide-y">
        <li v-for="video in props.state.videos" :key="video.name">
          <button
            type="button"
            class="hover:bg-elevated flex w-full items-center justify-between gap-3 rounded-md p-2 text-left text-sm"
            :class="{ 'bg-elevated': video.name === playing }"
            @click="picked = video.name">
            <span class="flex min-w-0 items-center gap-2">
              <UIcon :name="video.name === playing ? 'i-lucide-circle-play' : 'i-lucide-film'" class="text-muted size-4 flex-none" />
              <span class="text-highlighted truncate">{{ video.name }}</span>
            </span>
            <span class="text-muted flex-none text-xs">{{ formatNumber(video.bytes / 1e6) }} MB · {{ writtenAt(video.modified) }}</span>
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
  import type { RecorderState } from '@raillineage/video/jobs.types';
  import { computed, ref } from 'vue';
  import { RECORD_ROUTE } from '~/features/video/record/record.constants';
  import { statusLineOf } from '~/features/video/record/record.utils';
  import { formatNumber } from '~/utils/format.utils';

  const props = defineProps<{
    /** The recording last started, and the videos made, newest first. */
    state: RecorderState;
    /** Why the recorder did not answer; `null` when it did. */
    error: string | null;
    /** Whether a video is being recorded. */
    recording: boolean;
  }>();
  const emit = defineEmits<{
    /** Stop the recording under way. */
    cancel: [];
  }>();

  /** The video picked to play; `null` for the newest. */
  const picked = ref<string | null>(null);
  const playing = computed(() => (props.state.videos.some(video => video.name === picked.value) ? picked.value : (props.state.videos[0]?.name ?? null)));
  const statusIcon = computed(() => {
    if (props.recording) return 'i-lucide-loader-circle';
    if (props.state.status?.phase === 'done') return 'i-lucide-circle-check';
    return props.state.status?.phase === 'failed' ? 'i-lucide-circle-x' : 'i-lucide-circle-slash';
  });
  const statusColor = computed(() => {
    if (props.recording) return 'text-primary animate-spin';
    if (props.state.status?.phase === 'done') return 'text-success';
    return props.state.status?.phase === 'failed' ? 'text-error' : 'text-muted';
  });

  /**
   * Where the dev server serves a video made.
   *
   * @param name - Its name.
   * @returns Its address.
   */
  const videoUrlOf = (name: string): string => `${RECORD_ROUTE}/videos/${encodeURIComponent(name)}`;
  /**
   * When a video was written, as a reader says it.
   *
   * @param modified - When, ms since 1970.
   * @returns It, `15 Nov, 16:08`.
   */
  const writtenAt = (modified: number): string =>
    new Date(modified).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
</script>
