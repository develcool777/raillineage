<template>
  <!-- One run of a line's diagram, row by row, each row as tall as the next (h-8), so the rail and a
       branch's curve meet each dot at its middle: the rail down a gutter (centred 8px in), a branch a
       gutter in (ms-6) under the stop it leaves, curving off the rail it leaves from. -->
  <ol class="relative" :aria-label="label">
    <svg v-if="branch" class="absolute -top-4 -left-4.5 h-8 w-7 overflow-visible" viewBox="0 0 28 32" aria-hidden="true">
      <path d="M2 0C2 16 26 16 26 32" fill="none" :stroke="color" stroke-width="4" />
    </svg>
    <li v-for="(entry, position) in run" :key="`${entry.stop.id}-${position}`" class="relative">
      <!-- Its rail: from its dot, at a run's start; to its dot, at its end; else through, past its branches. -->
      <span
        v-if="run.length > 1"
        class="absolute left-1.5 w-1"
        :class="[position === 0 ? 'top-4' : 'top-0', position === run.length - 1 ? 'h-4' : 'bottom-0']"
        :style="{ background: color }" />
      <div class="flex h-8 items-center gap-3">
        <span class="relative z-10 flex w-4 flex-none justify-center">
          <span v-if="isInterchange(entry.stop.id)" class="bg-default size-3.5 rounded-full border-2 border-(--ui-text-highlighted)" />
          <span v-else class="bg-default size-2.5 rounded-full border-2" :style="{ borderColor: color }" />
        </span>
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <slot name="stop" :stop="entry.stop" :terminus="entry.terminus" :rejoins="entry.rejoins" />
        </div>
      </div>
      <LineDiagramRun
        v-for="(onwards, place) in entry.branches"
        :key="place"
        :run="onwards"
        :color
        :isInterchange
        :label="`Branch from ${entry.stop.name}`"
        branch
        class="ms-6">
        <template #stop="row">
          <slot name="stop" v-bind="row" />
        </template>
      </LineDiagramRun>
    </li>
  </ol>
</template>

<script setup lang="ts">
  import type { StationId } from '@raillineage/schema/network.types';
  import type { DiagramRow, DiagramStop } from '~/utils/lineDiagram.types';

  defineProps<{
    /** The run's stops, with the branches leaving each. */
    run: DiagramStop[];
    /** The line's colour, as CSS. */
    color: string;
    /** Whether another line calls at a station: its dot is drawn as an interchange's. */
    isInterchange: (station: StationId) => boolean;
    /** What its list of stops is called, for a screen reader. */
    label: string;
    /** A branch, curving off the rail of the stop it leaves. */
    branch?: boolean;
  }>();

  defineSlots<{
    /** A stop's row, beside its dot. */
    stop: (row: DiagramRow) => unknown;
  }>();
</script>
