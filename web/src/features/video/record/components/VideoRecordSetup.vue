<template>
  <!-- A city's video, set up, previewed and recorded on one page: on the left, the video as it is recorded,
       framed at the size it records at and scaled to fit; on the right, kept in view, every setting, and Record. -->
  <div class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
    <section class="flex min-w-0 flex-col gap-3" aria-label="Preview">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-highlighted text-sm font-semibold">
          Preview <span class="text-muted font-normal">· laid out at {{ size.width }} × {{ size.height }}, as it records, scaled to fit</span>
        </p>
        <div class="flex items-center gap-1">
          <UButton label="Play again" icon="i-lucide-rotate-ccw" color="neutral" variant="ghost" size="sm" @click="replays += 1" />
          <UButton :to="previewAddress" target="_blank" label="Open on its own" icon="i-lucide-external-link" color="neutral" variant="ghost" size="sm" />
        </div>
      </div>
      <div ref="frameBox" class="flex justify-center">
        <div class="relative overflow-hidden rounded-lg bg-black" :style="{ width: `${size.width * shrink}px`, height: `${size.height * shrink}px` }">
          <!-- `key`: played again, or laid out afresh at another size, the video opens anew. -->
          <iframe
            :key="`${previewAddress}-${size.width}x${size.height}-${replays}`"
            :src="previewAddress"
            title="The video, as it is recorded"
            class="absolute top-0 left-0 origin-top-left border-0"
            :style="{ width: `${size.width}px`, height: `${size.height}px`, transform: `scale(${shrink})` }" />
        </div>
      </div>
    </section>

    <!-- Every setting, a row each, in the order a video is made: what it shows, then how it is recorded; what each does on its mark. -->
    <aside class="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--ui-header-height)+1rem)]">
      <UCard :ui="{ header: 'px-4 py-3 sm:px-4', body: 'flex flex-col gap-4 p-4 sm:p-4' }">
        <template #header>
          <h2 class="text-highlighted text-sm font-semibold">What it shows</h2>
        </template>
        <VideoSetting label="Then a plan" :tip="TIPS.plan">
          <USelect
            :modelValue="asked.plan ?? NO_PLAN"
            :items="planItems"
            :disabled="props.planOnly || props.plans === null"
            class="w-full"
            @update:modelValue="pickPlan" />
        </VideoSetting>
        <VideoSetting label="View" :tip="TIPS.view">
          <UTabs :modelValue="asked.view" :items="VIEWS" :content="false" class="w-full" aria-label="View" @update:modelValue="pickView" />
        </VideoSetting>
        <VideoSetting label="Speed" :tip="TIPS.speed">
          <USelect :modelValue="asked.speed" :items="SPEED_ITEMS" class="w-full" @update:modelValue="pickSpeed" />
        </VideoSetting>
      </UCard>

      <UCard :ui="{ header: 'px-4 py-3 sm:px-4', body: 'flex flex-col gap-4 p-4 sm:p-4' }">
        <template #header>
          <h2 class="text-highlighted text-sm font-semibold">Output</h2>
        </template>
        <VideoSetting label="Size" :tip="TIPS.size">
          <USelect v-model="sizeIndex" :items="SIZE_ITEMS" class="w-full" />
        </VideoSetting>
        <template v-if="sizeIndex === CUSTOM_SIZE">
          <VideoSetting label="Width, px" :tip="TIPS.custom">
            <UInputNumber v-model="customWidth" :min="SMALLEST_SIDE" :max="LARGEST_SIDE" :step="2" class="w-full" />
          </VideoSetting>
          <VideoSetting label="Height, px" :tip="TIPS.custom">
            <UInputNumber v-model="customHeight" :min="SMALLEST_SIDE" :max="LARGEST_SIDE" :step="2" class="w-full" />
          </VideoSetting>
        </template>
        <VideoSetting label="Frame rate" :tip="TIPS.fps">
          <USelect v-model="fps" :items="FPS_ITEMS" class="w-full" />
        </VideoSetting>
        <VideoSetting label="Rehearse first" :tip="TIPS.rehearse">
          <USwitch v-model="rehearse" :label="rehearse ? 'On' : 'Off'" />
        </VideoSetting>
        <VideoSetting label="File" :tip="TIPS.file" :error="nameValid ? undefined : 'Letters, digits, - and _, ending .mp4'">
          <UInput v-model="name" class="w-full" />
        </VideoSetting>
      </UCard>

      <VideoRecordStatus :state="record.recorder" :error="record.error" :recording="record.recording" @cancel="record.CANCEL()" />
      <UButton
        :label="record.recording ? 'Recording…' : 'Record'"
        icon="i-lucide-circle-dot"
        size="lg"
        block
        :loading="record.recording"
        :disabled="record.recording || !nameValid"
        @click="startRecording" />
    </aside>
  </div>
</template>

<script setup lang="ts">
  import type { PlanInfo } from '@raillineage/network/facts.types';
  import { isVideoName } from '@raillineage/video/jobs.utils';
  import { LARGEST_SIDE, RECORDING_DEFAULTS } from '@raillineage/video/recording.constants';
  import { evenSideOf } from '@raillineage/video/recording.utils';
  import { useElementSize, useWindowSize } from '@vueuse/core';
  import { computed, ref, useTemplateRef, watch } from 'vue';
  import { useRoute, useRouter } from '#imports';
  import { useRecorderPolling } from '~/features/video/record/record.composable';
  import { RECORD_FPS, RECORD_SIZES } from '~/features/video/record/record.constants';
  import { useRecordStore } from '~/features/video/record/record.store';
  import { videoNameOf } from '~/features/video/record/record.utils';
  import { VIDEO_SPEED, VIDEO_SPEEDS } from '~/features/video/video.constants';
  import type { VideoAsked } from '~/features/video/video.types';
  import { videoAddressOf, videoAskedOf, videoPlanOf, videoQueryOf, videoSetupAddressOf } from '~/features/video/video.utils';

  const props = defineProps<{
    /** The city, by its id. */
    city: string;
    /** Its plans, one of which it can play after its history; `null` while its network loads. */
    plans: PlanInfo[] | null;
    /** Whether it was never built, so its plan is its history. */
    planOnly: boolean;
  }>();

  /** The plan menu's "none", as a menu takes no `null`. */
  const NO_PLAN = '-';
  const VIEWS = [
    { label: '3D', value: '3d' },
    { label: 'Flat', value: '2d' },
  ];
  /** The size menu's "of one's own", its width and height then typed in. */
  const CUSTOM_SIZE = -1;
  /** The smallest side of a size of one's own, px; the largest is the recorder's (`LARGEST_SIDE`). */
  const SMALLEST_SIDE = 320;
  const SIZE_ITEMS = [...RECORD_SIZES.map((entry, index) => ({ label: entry.label, value: index })), { label: 'Custom…', value: CUSTOM_SIZE }];
  const FPS_ITEMS = RECORD_FPS.map(rate => ({ label: `${rate} fps`, value: rate }));
  const SPEED_ITEMS = VIDEO_SPEEDS.map(offered => ({ label: offered === VIDEO_SPEED ? `${offered}× (its own)` : `${offered}×`, value: offered }));
  /** What each setting does, on the mark beside its name. */
  const TIPS = {
    plan: 'Played after the history reaches today, the video then ending on the network with it built. A city never built plays its first plan as its history.',
    view: 'While it plays: 3D tilts the camera over the buildings; flat looks straight down. The scenes between, the whole network and its numbers, are flat either way.',
    speed: `How fast the history plays: ${VIDEO_SPEED}× is the video's own, each change given time to be read. Faster makes a shorter video.`,
    size: "The video's size. 4K lays the page out as 1080p and draws it twice as sharp, as a Retina screen; the others draw it a pixel to a pixel, which records faster. Custom takes any size.",
    custom: "The video's size, drawn a pixel to a pixel: even, as it is encoded, an odd one taken down to the next.",
    fps: 'Frames a second in the video: 60 is smoother, 30 a smaller file and a faster recording.',
    rehearse:
      'Plays the video through once first, unrecorded, fetching every map tile the camera will see, so no frame of the take waits on one. Twice as long, every frame sharp.',
    file: 'Saved in packages/video/videos/, replacing one of the same name. Named for the video shown, until renamed.',
  };
  /** The most of the window's height the preview takes, so a vertical video fits with its buttons. */
  const FRAME_HEIGHT_SHARE = 0.7;

  const record = useRecordStore();
  useRecorderPolling();

  // What it shows is the page's address, as the video's own is: a link to it opens it set up so.
  const route = useRoute();
  const router = useRouter();
  /**
   * What the video is asked to show: the page's address says it, its plan the one the video will play
   * (`videoPlanOf`), as asked until the city's plans have come.
   */
  const asked = computed((): VideoAsked => {
    const address = videoAskedOf(route.query);
    const plan = props.plans === null ? address.plan : (videoPlanOf(props.plans, props.planOnly, address.plan)?.id ?? null);
    return { ...address, plan };
  });
  const planItems = computed(() => [
    { label: 'None: end on today', value: NO_PLAN },
    ...(props.plans ?? []).map(entry => ({ label: entry.name, value: entry.id })),
  ]);
  const previewAddress = computed(() => videoAddressOf(props.city, asked.value));

  /**
   * Sets the video up as asked: the page's address, in place, which the preview follows.
   *
   * @param changed - What changes of the plan, the view and the speed.
   */
  const setUp = async (changed: Partial<VideoAsked>) => {
    await router.replace(videoSetupAddressOf(props.city, { ...asked.value, ...changed }));
  };
  /**
   * Sets another plan after the history, or none.
   *
   * @param picked - The plan, or `NO_PLAN`.
   */
  const pickPlan = async (picked: string) => {
    await setUp({ plan: picked === NO_PLAN ? null : picked });
  };
  /**
   * Sets it in 3D, or flat.
   *
   * @param picked - As the switch says it.
   */
  const pickView = async (picked: string | number) => {
    await setUp({ view: picked === '2d' ? '2d' : '3d' });
  };
  /**
   * Sets how fast the history plays.
   *
   * @param picked - The speed.
   */
  const pickSpeed = async (picked: number) => {
    await setUp({ speed: picked });
  };

  // How it is recorded: the recorder's own defaults, as the command takes them.
  const sizeIndex = ref(
    Math.max(
      0,
      RECORD_SIZES.findIndex(
        entry => entry.width === RECORDING_DEFAULTS.width && entry.height === RECORDING_DEFAULTS.height && entry.scale === RECORDING_DEFAULTS.scale,
      ),
    ),
  );
  // A field cleared is `null` until typed in again: its size is the default's meanwhile.
  const customWidth = ref<number | null>(RECORDING_DEFAULTS.width);
  const customHeight = ref<number | null>(RECORDING_DEFAULTS.height);
  /** The page's size as it lays out, and how sharp it is drawn: a preset's, or one's own, made even (`evenSideOf`), a pixel to a pixel. */
  const size = computed(() => {
    const preset = RECORD_SIZES[sizeIndex.value];
    if (preset) return preset;
    return { width: evenSideOf(customWidth.value ?? RECORDING_DEFAULTS.width), height: evenSideOf(customHeight.value ?? RECORDING_DEFAULTS.height), scale: 1 };
  });
  const fps = ref(RECORDING_DEFAULTS.fps);
  const rehearse = ref(RECORDING_DEFAULTS.rehearse);
  // Named for the video shown, until renamed.
  const name = ref('');
  watch(
    () => videoNameOf(props.city, asked.value.plan, asked.value.view),
    named => {
      name.value = named;
    },
    { immediate: true },
  );
  const nameValid = computed(() => isVideoName(name.value));

  // The frame: the video at the size it is recorded at, shrunk to the room it has.
  const frameBox = useTemplateRef<HTMLElement>('frameBox');
  const { width: roomWide } = useElementSize(frameBox);
  const { height: windowHigh } = useWindowSize();
  const shrink = computed(() => Math.min(roomWide.value / size.value.width, (windowHigh.value * FRAME_HEIGHT_SHARE) / size.value.height));
  /** How many times it has been played again. */
  const replays = ref(0);
  /** Records the video as set up. */
  const startRecording = async () => {
    await record.START({
      city: props.city,
      query: videoQueryOf(asked.value),
      fps: fps.value,
      width: size.value.width,
      height: size.value.height,
      scale: size.value.scale,
      // As long as it plays: the recorder's longest is only a runaway's stop.
      seconds: RECORDING_DEFAULTS.seconds,
      rehearse: rehearse.value,
      name: name.value,
    });
  };
</script>
