<template>
  <!-- The way into the video pages (the header's Video, under pnpm dev only): the first city's, whose panel picks another. -->
  <div class="bg-page h-dvh" />
</template>

<script setup lang="ts">
  import { required } from '@raillineage/core/required.utils';
  import { navigateTo } from '#imports';
  import { CITIES } from '~/constants/city.constants';
  import { videoAddressOf } from '~/features/video/record/record.utils';

  await navigateTo(videoAddressOf(required(CITIES[0], 'a city').value, null, '3d'), { replace: true });
</script>
