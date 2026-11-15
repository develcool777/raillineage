<template>
  <!-- Over the video before it plays, and after: what it shows, how it is recorded, and the recordings. A recording never shows it. -->
  <div class="absolute inset-0 z-10 flex justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm">
    <div class="bg-default ring-default my-auto flex w-full max-w-3xl flex-col gap-6 rounded-xl p-6 ring-1">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-highlighted text-lg font-semibold">Record a video</h1>
          <p class="text-muted text-sm">Set it up, preview it here (Esc stops the preview), then record it.</p>
        </div>
        <UButton :label="props.ended ? 'Preview again' : 'Preview'" icon="i-lucide-play" color="neutral" variant="outline" @click="emit('preview')" />
      </header>

      <section class="flex flex-col gap-4">
        <h2 class="text-highlighted text-sm font-semibold">What it shows</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField label="City">
            <USelect :modelValue="props.city" :items="CITIES" class="w-full" @update:modelValue="openCity" />
          </UFormField>
          <UFormField label="Plan after the history" :help="props.planOnly ? 'Never built: its plan is its history' : undefined">
            <USelect :modelValue="props.plan ?? NO_PLAN" :items="planItems" :disabled="props.planOnly" class="w-full" @update:modelValue="openPlan" />
          </UFormField>
          <UFormField label="View">
            <URadioGroup :modelValue="props.view" :items="VIEWS" orientation="horizontal" @update:modelValue="openView" />
          </UFormField>
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <h2 class="text-highlighted text-sm font-semibold">How it is recorded</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Size" help="The page's, as it lays out">
            <USelect v-model="sizeIndex" :items="SIZE_ITEMS" class="w-full" />
          </UFormField>
          <UFormField label="Sharpness" :help="videoSize">
            <USelect v-model="scale" :items="SCALE_ITEMS" class="w-full" />
          </UFormField>
          <UFormField label="Frame rate">
            <USelect v-model="fps" :items="FPS_ITEMS" class="w-full" />
          </UFormField>
          <UFormField label="Longest, in minutes" help="It ends with the video; this only stops one that runs on.">
            <UInputNumber v-model="minutes" :min="1" :max="60" class="w-full" />
          </UFormField>
          <UFormField label="File" help="In packages/video/videos/" :error="nameValid ? undefined : 'A name ending .mp4, of letters, digits, - and _'">
            <UInput v-model="name" class="w-full" />
          </UFormField>
        </div>
        <USwitch v-model="rehearse" label="Rehearse first" description="Plays it through once to fetch the map's tiles, so no frame waits on one." />
      </section>

      <div class="flex flex-wrap items-center gap-3">
        <UButton label="Record" icon="i-lucide-circle-dot" color="error" :disabled="record.recording || !nameValid" @click="startRecording" />
        <span v-if="record.recording" class="text-muted text-sm">One video at a time: cancel this one to record another.</span>
      </div>

      <VideoRecordStatus :state="record.recorder" :error="record.error" :recording="record.recording" @cancel="record.CANCEL()" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { PlanInfo } from '@raillineage/network/facts.types';
  import type { ViewMode } from '@raillineage/renderer/transitMap.types';
  import { isVideoName } from '@raillineage/video/jobs.utils';
  import { RECORDING_DEFAULTS } from '@raillineage/video/recording.constants';
  import { computed, ref, watch } from 'vue';
  import { navigateTo } from '#imports';
  import { CITIES } from '~/constants/city.constants';
  import { useRecorderPolling } from '~/features/video/record/record.composable';
  import { RECORD_FPS, RECORD_SCALES, RECORD_SIZES } from '~/features/video/record/record.constants';
  import { useRecordStore } from '~/features/video/record/record.store';
  import { videoAddressOf, videoNameOf, videoQueryOf } from '~/features/video/record/record.utils';

  const props = defineProps<{
    /** The city shown, by its id. */
    city: string;
    /** Its plans, which one can play after its history. */
    plans: PlanInfo[];
    /** Whether it was never built, so its plan is its history. */
    planOnly: boolean;
    /** The plan its address names; `null` for none. */
    plan: string | null;
    /** In 3D, or flat, as its address says. */
    view: ViewMode;
    /** Whether the preview has played to its end. */
    ended: boolean;
  }>();
  const emit = defineEmits<{
    /** Play the video here, as it would be recorded. */
    preview: [];
  }>();

  /** The plan menu's "none", as a menu takes no `null`. */
  const NO_PLAN = '-';
  const VIEWS = [
    { label: '3D', value: '3d' },
    { label: 'Flat', value: '2d' },
  ];
  const SIZE_ITEMS = RECORD_SIZES.map((size, index) => ({ label: size.label, value: index }));
  const SCALE_ITEMS = RECORD_SCALES.map(sharpness => ({ label: sharpness.label, value: sharpness.scale }));
  const FPS_ITEMS = RECORD_FPS.map(rate => ({ label: `${rate} frames a second`, value: rate }));

  const record = useRecordStore();
  useRecorderPolling();
  const planItems = computed(() => [{ label: 'None: end on today', value: NO_PLAN }, ...props.plans.map(plan => ({ label: plan.name, value: plan.id }))]);
  // The recorder's own defaults, as the command takes them.
  const sizeIndex = ref(
    Math.max(
      0,
      RECORD_SIZES.findIndex(size => size.width === RECORDING_DEFAULTS.width && size.height === RECORDING_DEFAULTS.height),
    ),
  );
  const scale = ref(RECORDING_DEFAULTS.scale);
  const fps = ref(RECORDING_DEFAULTS.fps);
  const minutes = ref(RECORDING_DEFAULTS.seconds / 60);
  const rehearse = ref(RECORDING_DEFAULTS.rehearse);
  // Named for the video shown, until renamed.
  const name = ref('');
  watch(
    () => videoNameOf(props.city, props.plan, props.view),
    named => {
      name.value = named;
    },
    { immediate: true },
  );
  const nameValid = computed(() => isVideoName(name.value));
  // The video's own size: the page's, drawn at its sharpness.
  const videoSize = computed(() => {
    const size = RECORD_SIZES[sizeIndex.value];
    return size ? `The video: ${size.width * scale.value} × ${size.height * scale.value}` : undefined;
  });

  /**
   * Opens the video page as asked: afresh, as a video plays once.
   *
   * @param city - The city.
   * @param plan - The plan; `null` for none.
   * @param view - In 3D, or flat.
   */
  const open = async (city: string, plan: string | null, view: ViewMode) => {
    await navigateTo(videoAddressOf(city, plan, view), { external: true });
  };
  /**
   * Opens another city's video, with no plan: its plans are its own.
   *
   * @param city - The city.
   */
  const openCity = async (city: string) => {
    await open(city, null, props.view);
  };
  /**
   * Opens the video with another plan after its history, or none.
   *
   * @param plan - The plan, or `NO_PLAN`.
   */
  const openPlan = async (plan: string) => {
    await open(props.city, plan === NO_PLAN ? null : plan, props.view);
  };
  /**
   * Opens the video in 3D, or flat.
   *
   * @param view - As the menu says it.
   */
  const openView = async (view: string) => {
    await open(props.city, props.plan, view === '2d' ? '2d' : '3d');
  };

  /** Records the video as set up. */
  const startRecording = async () => {
    const size = RECORD_SIZES[sizeIndex.value];
    if (!size) return;
    await record.START({
      city: props.city,
      query: videoQueryOf(props.planOnly ? null : props.plan, props.view),
      fps: fps.value,
      width: size.width,
      height: size.height,
      scale: scale.value,
      seconds: Math.round(minutes.value * 60),
      rehearse: rehearse.value,
      name: name.value,
    });
  };
</script>
