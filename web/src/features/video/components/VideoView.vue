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
    <VideoRecordPanel
      v-if="panelShown"
      :city="props.city"
      :plans="store.facts?.plans() ?? []"
      :planOnly="store.facts?.planOnly ?? false"
      :plan="planAsked"
      :view="viewAsked"
      :ended="store.pageState === 'done'"
      @preview="preview" />
  </div>
</template>

<script setup lang="ts">
  import type { Network } from '@raillineage/schema/network.types';
  import type { RecordedWindow } from '@raillineage/video/videoPage.types';
  import { useEventListener } from '@vueuse/core';
  import { computed, useTemplateRef } from 'vue';
  import { navigateTo, useRoute, useRuntimeConfig } from '#imports';
  import { useVideoMap } from '~/features/video/video.composable';
  import { MINIMAP_HEIGHT_VMIN, MINIMAP_TOP_VMIN } from '~/features/video/video.constants';
  import { useVideoStore } from '~/features/video/video.store';
  import { spokenAddress, videoPlanAskedOf, videoViewOf } from '~/features/video/video.utils';
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
  useVideoMap({ container, minimapContainer }, () => ({
    network: props.network,
    viewMode: viewAsked.value,
    outline: `${baseURL}${boundaryUrlOf(props.city)}`,
    plan: planAsked.value,
  }));

  // Recorded, the recorder starts it; watched, it waits on its panel, which sets it up, previews it and
  // records it, and comes back when the preview ends. A recording never shows the panel.
  const recorded = Boolean((window as Window & RecordedWindow).raillineageRecorder);
  const panelShown = computed(() => !recorded && (store.pageState === 'ready' || store.pageState === 'done'));
  /** Plays the video here: from the start, or again, the page opened afresh, as a video plays once. */
  const preview = async () => {
    if (store.pageState === 'done') await navigateTo(route.fullPath, { external: true });
    else store.START();
  };
  // Esc stops a preview: the page opens afresh, at its panel.
  useEventListener(window, 'keydown', event => {
    if (event.key === 'Escape' && !recorded && store.pageState === 'playing') void navigateTo(route.fullPath, { external: true });
  });

  const cityName = computed(() => cityNameOf(props.city));
  const summary = computed(() => citySummaryOf(props.city));
  const address = spokenAddress(useRuntimeConfig().public.publishedUrl);
</script>
