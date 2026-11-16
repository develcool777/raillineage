<template>
  <!-- The recording under way or last made, in a line or two, by the Record button; or why the recorder did not answer. -->
  <UAlert v-if="props.error" color="error" variant="subtle" icon="i-lucide-circle-alert" title="The recorder did not answer" :description="props.error" />
  <div v-else-if="props.state.status" class="bg-elevated/50 flex flex-col gap-2 rounded-lg p-3">
    <div class="flex items-center gap-2.5">
      <UIcon :name="statusIcon" class="size-5 flex-none" :class="statusColor" />
      <div class="min-w-0 flex-1">
        <p class="text-highlighted text-sm font-medium">{{ statusLineOf(props.state.status) }}</p>
        <p class="text-muted truncate text-xs">{{ fileName }}</p>
      </div>
      <UButton v-if="props.recording" label="Cancel" icon="i-lucide-square" color="neutral" variant="outline" size="xs" @click="emit('cancel')" />
    </div>
    <UProgress v-if="props.recording" :modelValue="null" size="xs" />
  </div>
</template>

<script setup lang="ts">
  import type { RecorderState } from '@raillineage/video/jobs.types';
  import { computed } from 'vue';
  import { statusLineOf } from '~/features/video/record/record.utils';

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
  /** The file it writes, by its name: where, the File field says. */
  const fileName = computed(() => props.state.status?.out.split('/').at(-1) ?? '');
</script>
