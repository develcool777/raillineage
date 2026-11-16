<template>
  <!-- A city's history as a video, as it is recorded (pnpm video:record, or Record on its setup page, /<city>/video/), and played there in a frame; only under pnpm dev: the site built leaves it out (nuxt.config.ts). 3D, or flat with ?view=2d; at another speed with ?speed=1|1.25|1.5|2; on past today to a plan with ?plan=<id>. -->
  <ClientOnly>
    <VideoView v-if="network" :network :city />
    <div v-else class="grid h-dvh place-items-center bg-black text-sm text-white/60">
      {{ error ? `Could not load the network: ${error.message}` : 'Loading…' }}
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
  import { definePageMeta, useHead, useRoute } from '#imports';
  import { useCityNetwork } from '~/utils/city.composable';
  import { isCity } from '~/utils/city.utils';

  // Only cities with a dataset have a video, each a page mounted afresh; a video is always dark.
  definePageMeta({ validate: route => isCity(route.params.city), key: route => String(route.params.city), colorMode: 'dark' });

  // Nothing but the video in the frame: the dev tools' button too would be recorded.
  useHead({ style: [{ innerHTML: '#nuxt-devtools-container { display: none !important; }' }] });

  const city = String(useRoute().params.city);
  const { network, error } = useCityNetwork(city);
</script>
