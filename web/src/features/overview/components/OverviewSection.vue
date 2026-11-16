<template>
  <!-- A section of the article, its heading the anchor its contents link to, clear of the header above it. -->
  <section :id="section.id" class="mt-14 flex scroll-mt-20 flex-col gap-4">
    <header class="flex flex-col gap-1.5">
      <!-- The heading its own link, as Nuxt UI's prose headings are (ProseH2's classes): on hover its anchor
           mark beside it, and the heading with it, in the brand's colour. -->
      <h2 class="text-highlighted relative text-2xl font-bold">
        <a
          :href="`#${section.id}`"
          class="group hover:text-primary focus-visible:text-primary outline-primary/25 rounded-sm transition-colors focus-visible:outline-3 lg:after:absolute lg:after:inset-y-0 lg:after:-inset-s-2 lg:after:w-2">
          <span
            class="bg-elevated text-muted group-hover:text-primary group-focus:text-primary absolute top-1 -ms-8 hidden rounded-md p-1 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100 lg:flex">
            <UIcon name="i-lucide-hash" class="size-4 shrink-0" />
          </span>
          {{ section.title }}
        </a>
      </h2>
      <p v-if="section.description" class="text-muted">{{ section.description }}</p>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
  import type { OverviewContentsEntry } from '~/features/overview/overview.types';

  defineProps<{
    /** The section: its anchor, its heading and what it holds. */
    section: OverviewContentsEntry;
  }>();

  defineSlots<{
    /** What it holds. */
    default: () => unknown;
  }>();
</script>
