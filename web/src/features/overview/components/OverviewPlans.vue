<template>
  <!-- One plan under another, the column a long read's: two side by side would be narrow, and uneven. -->
  <div class="flex flex-col gap-3">
    <!-- Each plan a card, the whole card a link to it built on the map. -->
    <UPageCard
      v-for="plan in plans"
      :key="plan.id"
      :to="mapLinkOf(city, { plan: plan.id })"
      :title="plan.name"
      :description="plan.description"
      variant="outline">
      <template #footer>
        <span class="flex flex-wrap items-center gap-2">
          <UBadge :color="PLAN_STATUSES[plan.status].color" :label="PLAN_STATUSES[plan.status].label" />
          <span v-if="plan.facts.lines.length > 0" class="flex flex-wrap gap-1">
            <span
              v-for="line in plan.facts.lines"
              :key="line.id"
              class="h-1.5 w-5.5 rounded-full"
              :style="{ background: lineColor(line.color) }"
              :title="line.name" />
          </span>
          <span class="text-muted text-xs tabular-nums">{{ formatPlanFacts(plan.facts.stations, plan.facts.km) }}</span>
        </span>
      </template>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
  import type { PlanInfo } from '@raillineage/network/facts.types';
  import { PLAN_STATUSES } from '~/constants/plan.constants';
  import { mapLinkOf } from '~/features/overview/overview.utils';
  import { formatPlanFacts, lineColor } from '~/utils/format.utils';

  defineProps<{
    /** The city, by its id: where each plan's link opens. */
    city: string;
    /** Its plans, each with what it would add. */
    plans: PlanInfo[];
  }>();
</script>
