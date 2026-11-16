<template>
  <!-- A city's video, set up, previewed and recorded, opened at its address under pnpm dev only; the site
       built leaves it out (nuxt.config.ts). What it records is /<city>/video/preview. -->
  <div class="bg-page flex min-h-dvh flex-col">
    <SiteHeader>
      <!-- The city, after the logo, as the explorer has it: its menu sets up another's video. -->
      <template #context>
        <CitySelect v-model:open="pickingCity" :city @city="openCity" />
      </template>
    </SiteHeader>
    <UMain class="flex-1 pb-16">
      <UContainer class="flex flex-col gap-6 pt-8">
        <div>
          <h1 class="text-highlighted text-2xl font-bold">Record a video of {{ cityName }}</h1>
          <p class="text-muted text-sm">Set it up beside its preview, then record it into packages/video/videos/.</p>
        </div>
        <VideoRecordSetup :city :plans :planOnly="entry.planOnly" />
      </UContainer>
    </UMain>
  </div>
</template>

<script setup lang="ts">
  import { NetworkFacts } from '@raillineage/network/facts.service';
  import { computed, ref } from 'vue';
  import { definePageMeta, navigateTo, useRoute } from '#imports';
  import { videoAskedOf, videoSetupAddressOf } from '~/features/video/video.utils';
  import { useCityNetwork } from '~/utils/city.composable';
  import { cityNameOf, citySummaryOf, isCity } from '~/utils/city.utils';

  // Only cities with a dataset have a video, each a page mounted afresh.
  definePageMeta({ validate: route => isCity(route.params.city), key: route => String(route.params.city) });

  const route = useRoute();
  const city = String(route.params.city);
  const cityName = cityNameOf(city);
  const entry = citySummaryOf(city);
  // Its plans, to pick one to play after its history: asked of its network, fetched in the browser.
  const { network } = useCityNetwork(city);
  const plans = computed(() => (network.value ? NetworkFacts.create(network.value).plans() : null));

  /** Whether the city menu is open. */
  const pickingCity = ref(false);
  /**
   * Sets up another city's video, seen and paced as this one is, with no plan: its plans are its own.
   *
   * @param next - The city, by its id.
   * @returns The navigation.
   */
  const openCity = (next: string) => navigateTo(videoSetupAddressOf(next, { ...videoAskedOf(route.query), plan: null }));
</script>
