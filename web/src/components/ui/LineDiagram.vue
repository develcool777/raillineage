<template>
  <!-- A line drawn as its diagram is: a rail in its colour down the side, a dot at each stop, each branch
       curving off the stop it leaves. Each stop's row says what its surface makes of it. -->
  <div class="flex flex-col gap-4">
    <LineDiagramRun
      v-for="(run, position) in diagram"
      :key="position"
      :run
      :color
      :isInterchange
      :label="position === 0 ? label : `${label}, from ${run[0]?.stop.name}`">
      <template #stop="row">
        <slot name="stop" v-bind="row" />
      </template>
    </LineDiagramRun>
  </div>
</template>

<script setup lang="ts">
  import type { Stop } from '@raillineage/network/facts.types';
  import type { StationId } from '@raillineage/schema/network.types';
  import { computed } from 'vue';
  import type { DiagramRow } from '~/utils/lineDiagram.types';
  import { lineDiagramOf } from '~/utils/lineDiagram.utils';

  const props = defineProps<{
    /** The line's runs of track: the longest first, then each branch, whose first stop is the station it leaves from. */
    runs: Stop[][];
    /** Its colour, as CSS. */
    color: string;
    /** Whether another line calls at a station: its dot is drawn as an interchange's. */
    isInterchange: (station: StationId) => boolean;
    /** What its list of stops is called, for a screen reader. */
    label: string;
  }>();

  defineSlots<{
    /** A stop's row, beside its dot: its name, and what else its surface says of it. */
    stop: (row: DiagramRow) => unknown;
  }>();

  const diagram = computed(() => lineDiagramOf(props.runs));
</script>
