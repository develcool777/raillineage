<template>
  <div class="flex flex-col gap-6">
    <div v-for="group in groups" :key="group.network" class="flex flex-col gap-1">
      <!-- A brand's name over its lines, where the city runs more than one. -->
      <h3 v-if="groups.length > 1" class="text-highlighted font-semibold">{{ group.network }}</h3>
      <!-- Each line a row, its stops folded under it in a big network: kept in the page, for search engines too. -->
      <UAccordion
        type="multiple"
        :items="group.lines.map(line => ({ value: line.id, line }))"
        :defaultValue="unfolded"
        :unmountOnHide="false"
        :ui="{ trigger: 'py-2.5', body: 'flex flex-col gap-1 pb-3' }">
        <template #leading="{ item }">
          <span class="h-1.5 w-5.5 flex-none rounded-full" :style="{ background: lineColor(item.line.color) }" />
        </template>
        <template #default="{ item }">
          <span class="flex flex-wrap items-baseline gap-x-2 text-start">
            <span class="text-highlighted font-semibold">{{ item.line.name }}</span>
            <span class="text-muted text-sm font-normal tabular-nums">{{ lineFactsOf(item.line) }}</span>
          </span>
        </template>
        <template #body="{ item }">
          <!-- Its stops as the line runs them, drawn as its diagram is: a rail in its colour, a dot a station,
               each the way to the station on the map. Then each branch, from the station it leaves. -->
          <div v-for="(run, position) in item.line.runs" :key="position" class="flex flex-col gap-1">
            <p v-if="position > 0" class="text-dimmed pt-2 text-xs">Branch from {{ run[0]?.name }}</p>
            <ol class="sm:columns-2 sm:gap-x-8" :aria-label="position > 0 ? `Branch from ${run[0]?.name}` : `${item.line.name} stations`">
              <li v-for="(stop, place) in run" :key="stop.id" class="relative break-inside-avoid ps-6">
                <span
                  class="absolute inset-s-1.25 w-0.5"
                  :class="[place === 0 ? 'top-1/2' : 'top-0', place === run.length - 1 ? 'bottom-1/2' : 'bottom-0']"
                  :style="{ background: lineColor(item.line.color) }" />
                <span
                  class="bg-default absolute inset-s-0 top-1/2 size-3 -translate-y-1/2 rounded-full border-2"
                  :style="{ borderColor: lineColor(item.line.color) }" />
                <ULink :to="mapLinkOf(city, { station: stop.id })" raw class="text-default hover:text-primary block py-1 text-sm transition-colors">
                  {{ stop.name }}
                </ULink>
              </li>
            </ol>
          </div>
          <ULink :to="mapLinkOf(city, { line: item.line.id })" class="text-primary w-fit pt-2 text-sm">Show the line on the map</ULink>
        </template>
      </UAccordion>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import type { OverviewLine } from '~/features/overview/overview.types';
  import { lineFactsOf, linesByNetwork, mapLinkOf, unfoldedLinesOf } from '~/features/overview/overview.utils';
  import { lineColor } from '~/utils/format.utils';

  const props = defineProps<{
    /** The city, by its id: where each line's link opens. */
    city: string;
    /** Its lines. */
    lines: OverviewLine[];
  }>();

  const groups = computed(() => linesByNetwork(props.lines));
  const unfolded = computed(() => unfoldedLinesOf(props.lines));
</script>
