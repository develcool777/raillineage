<template>
  <UPageCard :to="`/${city}`" :title="name" :description="summary.networks.join(' · ')" variant="outline" spotlight>
    <!-- The city's picture in each theme, drawn ahead by `pnpm data:previews`. Each loads lazily, as it comes into view:
         an image hidden by the theme then never loads, where one loaded eagerly would, the browser fetching it from the
         page's HTML before any style says it is hidden. -->
    <template #header>
      <UColorModeImage
        :light="previewUrlOf(city, 'light')"
        :dark="previewUrlOf(city, 'dark')"
        :alt="`Map of the ${name} network`"
        class="h-42.5 w-full object-cover"
        :width="PREVIEW_SIZE.width"
        :height="PREVIEW_SIZE.height"
        loading="lazy"
        :fetchpriority="preload ? 'high' : 'auto'"
        decoding="async" />
    </template>
    <template #footer>
      <span class="flex flex-wrap items-center gap-1.5">
        <UBadge v-if="summary.planOnly" key="planOnly" color="warning" label="Never built" />
        <UBadge v-else key="history" color="success" label="History to play" />
        <UBadge v-if="summary.plans > 0" key="plans" color="info" :label="counted(summary.plans, 'plan')" />
        <span class="text-muted text-[11px] tabular-nums">
          <template v-if="!summary.planOnly">{{ summary.openedYear }} → today · </template>{{ counted(summary.lines, 'line') }} ·
          {{ counted(summary.stations, 'station') }}
        </span>
      </span>
    </template>
  </UPageCard>
</template>

<script setup lang="ts">
  import { PREVIEW_SIZE, PREVIEW_THEMES } from '@railtime/data/preview.constants';
  import type { CityIndexEntry } from '@railtime/schema/cityIndex.types';
  import { computed } from 'vue';
  import { useHead } from '#imports';
  import { cityNameOf, previewUrlOf } from '~/utils/city.utils';
  import { counted } from '~/utils/format.utils';

  const props = defineProps<{
    /** The city, by its id. */
    city: string;
    /** Its entry in the index of cities. */
    summary: CityIndexEntry;
    /** Among the first cards on the page: its picture fetched at once, not when scrolled to. */
    preload?: boolean;
  }>();
  const name = computed(() => cityNameOf(props.city));

  // A first card's picture is fetched with the page, in the theme the system prefers, which the site shows
  // unless the visitor picked the other: a preload says which by its media query, where an eager image cannot.
  useHead(() => ({
    link: props.preload
      ? PREVIEW_THEMES.map(theme => ({
          key: `preview-${props.city}-${theme}`,
          rel: 'preload',
          as: 'image',
          href: previewUrlOf(props.city, theme),
          media: `(prefers-color-scheme: ${theme})`,
          fetchpriority: 'high',
        }))
      : [],
  }));
</script>
