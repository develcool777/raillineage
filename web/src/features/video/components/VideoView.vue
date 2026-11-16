<template>
  <!-- A video's frame: the map edge to edge, and over it the scene shown, each piece as much as `layers` says. -->
  <div class="relative h-dvh w-full overflow-hidden bg-[#0b0d10] text-white">
    <!-- MapLibre makes the map's own element relative: it fills a frame of its own. -->
    <div class="absolute inset-0"><div ref="container" class="size-full" /></div>
    <!-- MapLibre makes the minimap's element relative too. Always laid out, so it is framed before it shows. -->
    <div
      class="absolute left-[5vmin] w-[36vmin] overflow-hidden rounded-[1.4vmin] ring-1 ring-white/20"
      :style="{ top: `${MINIMAP_TOP_VMIN}vmin`, height: `${MINIMAP_HEIGHT_VMIN}vmin`, opacity: store.layers.minimap }">
      <div ref="minimapContainer" class="size-full" aria-label="Overview of the whole city" />
    </div>
    <VideoTitle :name="cityName" :networks="summary.networks" :span="store.span" :shown="store.layers.title" />
    <VideoPlanIntro v-if="store.plan" :plan="store.plan" :shown="store.layers.planIntro" />
    <!-- Down the right: the year, and the panels that side filling what it leaves, wherever it ends. -->
    <div class="pointer-events-none absolute top-[4vmin] right-[2.5vmin] bottom-[4vmin] flex flex-col items-end">
      <VideoYear v-if="store.time" :time="store.time" :plan="store.plan" :shown="store.layers.year" :totals="store.layers.totals" class="mr-[2.5vmin]" />
      <VideoTodayPanels v-if="store.insights" :insights="store.insights" :motion="store.insightsMotion" class="min-h-0 flex-1" />
    </div>
    <VideoCaption v-if="store.caption" :step="store.caption" :shown="store.layers.caption" />
    <VideoHistoryPanels v-if="store.insights" :insights="store.insights" :motion="store.insightsMotion" />
    <VideoPlanEnd
      v-if="store.plan && store.planGain"
      :plan="store.plan"
      :gains="store.planGain"
      :counted="store.endCounted"
      :address
      :shown="store.layers.end" />
    <VideoEnd v-else :name="cityName" :stats="store.time?.stats ?? null" :counted="store.endCounted" :address :shown="store.layers.end" />
    <MapCredits :credits="store.credits" plain class="absolute right-[2vmin] bottom-[1.2vmin] opacity-70" />
  </div>
</template>

<script setup lang="ts">
  import type { Network } from '@raillineage/schema/network.types';
  import type { RecordedWindow } from '@raillineage/video/videoPage.types';
  import { computed, useTemplateRef, watch } from 'vue';
  import { useRoute, useRuntimeConfig } from '#imports';
  import { useVideoMap } from '~/features/video/video.composable';
  import { MINIMAP_HEIGHT_VMIN, MINIMAP_TOP_VMIN } from '~/features/video/video.constants';
  import { useVideoStore } from '~/features/video/video.store';
  import { spokenAddress, videoPlanAskedOf, videoSpeedOf, videoViewOf } from '~/features/video/video.utils';
  import { boundaryUrlOf, cityNameOf, citySummaryOf } from '~/utils/city.utils';

  const props = defineProps<{
    /** The city's network. */
    network: Network;
    /** The city, by its id. */
    city: string;
  }>();

  const store = useVideoStore();
  const container = useTemplateRef<HTMLElement>('container');
  const minimapContainer = useTemplateRef<HTMLElement>('minimapContainer');
  // The video opens on the city's network, as its address asks: in 3D, or flat (`?view=2d`); on past
  // today to a plan, if it names one (`?plan=<id>`).
  const route = useRoute();
  const baseURL = useRuntimeConfig().app.baseURL;
  const viewAsked = computed(() => videoViewOf(route.query.view));
  const planAsked = computed(() => videoPlanAskedOf(route.query.plan));
  const speedAsked = computed(() => videoSpeedOf(route.query.speed));
  useVideoMap({ container, minimapContainer }, () => ({
    network: props.network,
    viewMode: viewAsked.value,
    speed: speedAsked.value,
    outline: `${baseURL}${boundaryUrlOf(props.city)}`,
    plan: planAsked.value,
  }));

  // Recorded, the recorder starts it; watched (opened by hand, or framed by its setup page,
  // `/<city>/video/`), it plays as soon as it is ready, once: opened afresh, it plays again.
  const recorded = Boolean((window as Window & RecordedWindow).raillineageRecorder);
  watch(
    () => store.pageState,
    state => {
      if (!recorded && state === 'ready') store.START();
    },
    { immediate: true },
  );

  const cityName = computed(() => cityNameOf(props.city));
  const summary = computed(() => citySummaryOf(props.city));
  const address = spokenAddress(useRuntimeConfig().public.publishedUrl);
</script>
