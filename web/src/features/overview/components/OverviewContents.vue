<template>
  <!-- What the page holds, beside it as it scrolls, the section read marked, as Nuxt UI's docs have theirs (its
       ContentToc's look; that component comes only with Nuxt Content, and keeps a reading of its own). Only as
       tall as its links (`self-start`): stretched down its column, it would leave the screen near the page's end. -->
  <nav
    aria-label="On this page"
    class="sticky top-(--ui-header-height) flex self-start max-h-[calc(100vh-var(--ui-header-height))] flex-col gap-6 overflow-y-auto py-8">
    <div class="flex flex-col gap-3">
      <p class="text-highlighted text-sm font-semibold">On this page</p>
      <ul class="border-default ms-2.5 border-s">
        <li v-for="section in sections" :key="section.id" class="-ms-px">
          <ULink
            :to="`#${section.id}`"
            raw
            :aria-current="section.id === read ? 'location' : undefined"
            class="block border-s py-1 ps-4 text-sm transition-colors"
            :class="section.id === read ? 'border-primary text-primary' : 'text-muted hover:text-default border-transparent'">
            {{ section.label }}
            <span v-if="section.count" class="text-dimmed tabular-nums"> · {{ section.count }}</span>
          </ULink>
        </li>
      </ul>
    </div>
    <USeparator type="dashed" />
    <!-- Where a reader goes next, at hand all the way down. -->
    <ULink :to="mapLinkOf(city)" raw class="text-muted hover:text-primary flex items-center gap-1.5 text-sm transition-colors">
      <UIcon name="i-lucide-map" class="size-4 flex-none" />
      {{ planOnly ? 'Open it on the map' : 'Play its history on the map' }}
    </ULink>
  </nav>
</template>

<script setup lang="ts">
  import type { OverviewContentsEntry } from '~/features/overview/overview.types';
  import { mapLinkOf } from '~/features/overview/overview.utils';

  defineProps<{
    /** The city, by its id: where its map link opens. */
    city: string;
    /** Never built: its map shows its plans, not a history. */
    planOnly: boolean;
    /** The page's sections. */
    sections: OverviewContentsEntry[];
    /** The section being read; `null` above the first. */
    read: string | null;
  }>();
</script>
