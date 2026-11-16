<template>
  <div class="flex flex-col gap-4 px-4 pt-3 pb-6">
    <!-- One list at a time: its stops, or the changes that made it. -->
    <UTabs v-if="changes.length > 0" v-model="shown" :items="TABS" :content="false" class="w-full" :ui="{ trigger: 'grow' }" aria-label="Show" />

    <template v-if="shown === 'stops'">
      <UEmpty v-if="line.branches.length === 0" icon="i-lucide-calendar-x" title="Not open yet" description="The line is not open on the date shown." />
      <!-- Its stops as its diagram draws them, each row opening its station. -->
      <LineDiagram
        v-else
        :runs="line.branches"
        :color="lineColor(line.color)"
        :isInterchange="station => otherLines(station).length > 0"
        :label="`${line.name} stops`">
        <template #stop="{ stop, terminus, rejoins }">
          <ListRow class="-ms-2 gap-3" @click="emit('station', stop.id)">
            <span class="text-highlighted flex-1 truncate text-sm" :class="terminus || otherLines(stop.id).length > 0 ? 'font-semibold' : 'font-medium'">
              {{ stop.name }}
            </span>
            <span v-if="rejoins" class="text-dimmed flex-none text-xs">rejoins the line</span>
            <span class="flex flex-none gap-0.5">
              <span v-for="other in otherLines(stop.id)" :key="other.id" class="h-1 w-2.5 rounded-full" :style="{ background: lineColor(other.color) }" />
            </span>
          </ListRow>
        </template>
      </LineDiagram>
    </template>

    <ChangeTimeline v-else :changes :titleOf="change => titleInLine(change.title, line.name)" @pick="emit('pickChange', $event)" />
  </div>
</template>

<script setup lang="ts">
  import type { ChangeInfo, LineDetails, NamedLine } from '@raillineage/network/facts.types';
  import type { StationId } from '@raillineage/schema/network.types';
  import { ref } from 'vue';
  import { titleInLine } from '~/features/explorer/lines/line.utils';
  import { lineColor } from '~/utils/format.utils';

  const props = defineProps<{
    /** The line: its name, colour and stops. */
    line: LineDetails;
    /** The changes that made the line. */
    changes: ChangeInfo[];
    /** The lines to be had at each station on the map, there or a transfer away, to mark the interchanges. */
    interchanges: Map<StationId, NamedLine[]>;
  }>();
  const emit = defineEmits<{ station: [station: StationId]; pickChange: [index: number] }>();

  const shown = ref<'stops' | 'history'>('stops');
  /** The line's two lists. */
  const TABS = [
    { label: 'Stops', value: 'stops' as const },
    { label: 'History', value: 'history' as const },
  ];

  /**
   * The other lines to be had at a stop, there or a transfer away: none for a stop on this line alone.
   *
   * @param station - The stop.
   * @returns The others.
   */
  const otherLines = (station: StationId): NamedLine[] => (props.interchanges.get(station) ?? []).filter(other => other.id !== props.line.id);
</script>
