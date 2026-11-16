<template>
  <!-- A decade a row, how many changes it holds beside it; its first open, where the story starts. The rest
       folded, kept in the page, for search engines too. -->
  <UAccordion
    type="multiple"
    :items="history.map(group => ({ value: group.decade, group }))"
    :defaultValue="history.slice(0, 1).map(group => group.decade)"
    :unmountOnHide="false"
    :ui="{ trigger: 'py-2.5', body: 'pb-4' }">
    <template #default="{ item }">
      <span class="flex items-baseline gap-2">
        <span class="text-highlighted font-semibold">{{ item.group.decade }}</span>
        <span class="text-muted text-sm font-normal tabular-nums">{{ counted(item.group.changes.length, 'change') }}</span>
      </span>
    </template>
    <template #body="{ item }">
      <ol class="border-default flex flex-col gap-3 border-l ps-4">
        <li v-for="change in item.group.changes" :key="change.index" class="flex flex-col">
          <span class="text-dimmed text-xs/5 tabular-nums">{{ change.time === null ? 'Plan' : formatDay(change.time) }}</span>
          <!-- The change itself the link to the map that day. -->
          <ULink
            :to="mapLinkOf(city, { at: { day: change.time } })"
            class="text-highlighted hover:text-primary flex w-fit items-center gap-2 text-sm font-medium">
            <span class="size-2 flex-none rounded-full" :style="{ background: lineColor(change.color) }" />
            {{ change.title }}
            <UIcon name="i-lucide-map" class="text-dimmed size-3.5 flex-none" aria-hidden="true" />
          </ULink>
          <span v-if="change.subtitle" class="text-muted text-sm">{{ change.subtitle }}</span>
          <!-- The stations it opened, named where there are more than its two ends. -->
          <span v-if="change.stations.length > 2" class="text-muted text-sm">Stations: {{ change.stations.join(', ') }}</span>
        </li>
      </ol>
    </template>
  </UAccordion>
</template>

<script setup lang="ts">
  import { mapLinkOf } from '~/features/overview/overview.utils';
  import type { ChangeGroup } from '~/utils/changes.types';
  import { counted, formatDay, lineColor } from '~/utils/format.utils';

  defineProps<{
    /** The city, by its id: where each change's link opens. */
    city: string;
    /** Its dated changes, under their decades. */
    history: ChangeGroup[];
  }>();
</script>
