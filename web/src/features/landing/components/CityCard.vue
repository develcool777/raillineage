<template>
  <!-- The card opens the city's map, all of it a link; its overview a link of its own, over that one.
       Picked out on hover by its edge and shadow, its picture coming forward a little. -->
  <UPageCard
    :to="`/${city}/`"
    :title="name"
    :description="summary.networks.join(' · ')"
    variant="outline"
    class="group hover:ring-accented duration-200 hover:shadow-lg"
    :ui="{ header: 'overflow-hidden', footer: 'px-0 pb-0' }">
    <!-- The city's picture in each theme, drawn ahead by `pnpm data:previews`. Each loads lazily, as it comes into view:
         an image hidden by the theme then never loads, where one loaded eagerly would, the browser fetching it from the
         page's HTML before any style says it is hidden. -->
    <template #header>
      <UColorModeImage
        :light="previewUrlOf(city, 'light')"
        :dark="previewUrlOf(city, 'dark')"
        :alt="`Map of the ${name} network`"
        class="h-42.5 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        :width="PREVIEW_SIZE.width"
        :height="PREVIEW_SIZE.height"
        loading="lazy"
        :fetchpriority="preload ? 'high' : 'auto'"
        decoding="async" />
    </template>
    <template #footer>
      <div class="flex flex-col gap-3">
        <span class="flex flex-wrap items-center gap-1.5 px-4.5">
          <UBadge v-if="summary.planOnly" key="planOnly" color="warning" label="Never built" />
          <UBadge v-else key="history" color="success" label="History to play" />
          <UBadge v-if="summary.plans > 0" key="plans" color="info" :label="counted(summary.plans, 'plan')" />
          <span class="text-muted text-[11px] tabular-nums">
            <template v-if="!summary.planOnly">{{ summary.openedYear }} → today · </template>{{ counted(summary.lines, 'line') }} ·
            {{ counted(summary.stations, 'station') }}
          </span>
        </span>
        <!-- Its two ways in: the map, the card's own link, said here; and its overview, to read. -->
        <div class="border-default flex items-center justify-between gap-3 border-t px-4.5 py-2.5 text-sm">
          <span class="text-highlighted flex items-center gap-1 font-medium" aria-hidden="true">
            {{ summary.planOnly ? 'Open its plans' : 'Open the map' }}
            <UIcon name="i-lucide-arrow-right" class="group-hover:text-primary size-4 transition group-hover:translate-x-0.5" />
          </span>
          <ULink
            :to="overviewPathOf(city)"
            raw
            :aria-label="`${name} metro overview: history, lines and plans`"
            class="text-muted hover:text-primary focus-visible:outline-primary relative z-10 flex items-center gap-1.5 rounded-sm transition-colors focus-visible:outline-2">
            <UIcon name="i-lucide-book-open-text" class="size-4 flex-none" />
            <!-- Its words name the city too, for a search engine reading the link. -->
            <span
              ><span class="sr-only">{{ name }} metro </span>Overview</span
            >
          </ULink>
        </div>
      </div>
    </template>
  </UPageCard>
</template>

<script setup lang="ts">
  import { PREVIEW_SIZE, PREVIEW_THEMES } from '@raillineage/data/preview.constants';
  import type { CityIndexEntry } from '@raillineage/schema/cityIndex.types';
  import { computed } from 'vue';
  import { useHead } from '#imports';
  import { cityNameOf, overviewPathOf, previewUrlOf } from '~/utils/city.utils';
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
