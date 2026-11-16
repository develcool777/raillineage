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
        :ui="{ trigger: 'py-2.5', body: 'flex flex-col gap-1 pb-4' }">
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
          <!-- Its stops as its diagram draws them, each the way to the station on the map, with the other
               lines to change for there: their colours, and their names (a screen reader's alone on a phone). -->
          <LineDiagram
            :runs="item.line.runs"
            :color="lineColor(item.line.color)"
            :isInterchange="station => othersAt(station, item.line).length > 0"
            :label="`${item.line.name} stations`">
            <template #stop="{ stop, terminus, rejoins }">
              <ULink
                :to="mapLinkOf(city, { station: stop.id })"
                raw
                class="hover:text-primary truncate text-sm transition-colors"
                :class="terminus ? 'text-highlighted font-semibold' : 'text-default'">
                {{ stop.name }}
              </ULink>
              <span v-if="rejoins" class="text-dimmed flex-none text-xs"><span class="sr-only">, </span>rejoins the line</span>
              <span v-if="othersAt(stop.id, item.line).length > 0" class="text-muted flex flex-none items-center gap-2 text-xs">
                <!-- Read as words too: "Teatralna, change for Syretsko-Pecherska". -->
                <span class="sr-only">, change for </span>
                <span v-for="(other, place) in othersAt(stop.id, item.line)" :key="other.id" class="inline-flex items-center gap-1">
                  <span class="h-1 w-2.5 rounded-full" :style="{ background: lineColor(other.color) }" />
                  <span class="max-sm:sr-only"><span v-if="place > 0" class="sr-only">, </span>{{ other.name }}</span>
                </span>
              </span>
            </template>
          </LineDiagram>
          <ULink :to="mapLinkOf(city, { line: item.line.id })" class="text-primary w-fit pt-2 text-sm">Show the line on the map</ULink>
        </template>
      </UAccordion>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { LineId, StationId } from '@raillineage/schema/network.types';
  import { computed } from 'vue';
  import type { OverviewLine } from '~/features/overview/overview.types';
  import { lineFactsOf, linesByNetwork, mapLinkOf, unfoldedLinesOf } from '~/features/overview/overview.utils';
  import { lineColor } from '~/utils/format.utils';

  const props = defineProps<{
    /** The city, by its id: where each line's link opens. */
    city: string;
    /** Its lines. */
    lines: OverviewLine[];
    /** Where more than one line is to be had: the lines there, by their ids. */
    interchanges: Partial<Record<StationId, LineId[]>>;
  }>();

  const groups = computed(() => linesByNetwork(props.lines));
  const unfolded = computed(() => unfoldedLinesOf(props.lines));

  /**
   * The other lines to be had at a stop of a line, there or a transfer away: those to change for.
   *
   * @param station - The stop.
   * @param line - The line it is on.
   * @returns The others, in the network's order.
   */
  const othersAt = (station: StationId, line: OverviewLine): OverviewLine[] =>
    props.lines.filter(other => other.id !== line.id && (props.interchanges[station] ?? []).includes(other.id));
</script>
