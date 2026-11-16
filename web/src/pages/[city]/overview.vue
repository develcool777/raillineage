<template>
  <div class="bg-page flex min-h-dvh flex-col">
    <SiteHeader />

    <!-- Laid out as Nuxt UI's docs are: the article in the middle, its contents beside it on a wide screen,
         the section read marked; the story first in a reading face, the reference below it. -->
    <UMain class="min-h-0 flex-1 pb-16">
      <UContainer>
        <UPage>
          <template #right>
            <OverviewContents class="hidden lg:flex" :city :planOnly="entry.planOnly" :sections="contents" :read />
          </template>

          <UPageHeader :headline="entry.country" :title="heading.title" :description="heading.description" />

          <UPageBody>
            <article>
              <!-- Its opening, the picture and the story: the first entry of its contents. -->
              <section :id="OVERVIEW_SECTIONS.overview" class="flex scroll-mt-20 flex-col gap-8">
                <figure class="flex flex-col gap-2">
                  <UColorModeImage
                    :light="`${baseURL}${previewUrlOf(city, 'light')}`"
                    :dark="`${baseURL}${previewUrlOf(city, 'dark')}`"
                    :alt="`Map of the ${cityName} network`"
                    :width="PREVIEW_SIZE.width"
                    :height="PREVIEW_SIZE.height"
                    class="w-full rounded-lg" />
                  <figcaption class="text-muted text-center text-sm">
                    {{ entry.planOnly ? `${cityName}'s first plan, as it would run` : `${cityName}'s network today` }}
                  </figcaption>
                </figure>

                <div class="text-highlighted flex flex-col gap-6 font-serif text-lg leading-relaxed sm:text-xl">
                  <p v-for="paragraph in intro" :key="paragraph">{{ paragraph }}</p>
                </div>
              </section>

              <!-- On a narrow screen, with no room beside it: what the page holds, each section a jump away. -->
              <nav aria-label="On this page" class="border-default mt-10 flex lg:hidden flex-wrap items-center gap-x-4 gap-y-1 border-y py-3 text-sm">
                <span class="text-dimmed">On this page</span>
                <ULink v-for="section in contents" :key="section.id" :to="`#${section.id}`" class="text-primary">
                  {{ section.label }}<span v-if="section.count" class="text-muted"> · {{ section.count }}</span>
                </ULink>
              </nav>

              <OverviewSection v-if="sections.lines" key="lines" :section="sections.lines">
                <OverviewLines :city :lines="overview.lines" />
              </OverviewSection>

              <OverviewSection v-if="sections.growth && overview.growth" key="growth" :section="sections.growth">
                <GrowthChart :points="growthSeries(overview.growth.years, 'stations')" metric="stations" :height="180" @pick="openYear" />
                <h3 class="text-highlighted font-semibold">Stations opened, by decade</h3>
                <DecadeChart :decades="overview.growth.decades" :busiest="overview.growth.busiest" :height="140" @pick="openYear" />
                <p class="text-dimmed text-xs">Pick a year on a chart to see the map then.</p>
              </OverviewSection>

              <OverviewSection v-if="sections.changes" key="changes" :section="sections.changes">
                <OverviewHistory :city :history="overview.history" />
              </OverviewSection>

              <OverviewSection v-if="sections.plans" key="plans" :section="sections.plans">
                <OverviewPlans :city :plans="overview.plans" />
              </OverviewSection>

              <!-- Where a reader goes next, as an article ends: the map, to watch it themselves. -->
              <aside class="border-default mt-14 flex flex-col items-start gap-3 rounded-xl border p-6">
                <h2 class="text-highlighted text-xl font-bold">{{ entry.planOnly ? 'See it on the map' : 'Watch it grow' }}</h2>
                <p class="text-muted">
                  {{
                    entry.planOnly
                      ? `Open ${cityName}'s plans on the real map, and play each one section by section.`
                      : `Play ${cityName}'s history on the real map, one opening at a time, or open any of its plans.`
                  }}
                </p>
                <UButton :to="mapLinkOf(city)" icon="i-lucide-map" :label="entry.planOnly ? 'Open it on the map' : 'Play its history on the map'" />
              </aside>
            </article>
          </UPageBody>
        </UPage>
      </UContainer>
    </UMain>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
  import { PREVIEW_SIZE } from '@raillineage/data/preview.constants';
  import { ref } from 'vue';
  import { createError, definePageMeta, navigateTo, useRoute, useRuntimeConfig } from '#imports';
  import { useCityOverview, useSectionRead } from '~/features/overview/overview.composable';
  import { OVERVIEW_SECTIONS } from '~/features/overview/overview.constants';
  import { mapLinkOf, overviewContentsOf, overviewHeadingOf, overviewIntroOf, yearLinkOf } from '~/features/overview/overview.utils';
  import { usePageSeo } from '~/features/seo/pageSeo.composable';
  import { cityOverviewSeo } from '~/features/seo/seo.utils';
  import { cityNameOf, citySummaryOf, isCity, previewUrlOf } from '~/utils/city.utils';
  import { growthSeries } from '~/utils/growth.utils';

  // Only cities with a dataset have an overview: any other address is a 404.
  definePageMeta({ validate: route => isCity(route.params.city), key: route => String(route.params.city) });

  const city = String(useRoute().params.city);
  const cityName = cityNameOf(city);
  const baseURL = useRuntimeConfig().app.baseURL;
  const entry = citySummaryOf(city);
  const heading = overviewHeadingOf(cityName, entry);
  usePageSeo(cityOverviewSeo(city, entry));

  // Worked out as the site is built: a page that could not be fails, never published empty.
  const { overview: fetched, error } = await useCityOverview(city);
  if (!fetched.value) throw createError({ statusCode: 500, statusMessage: `No overview of ${city}: ${error.value?.message ?? 'nothing came'}`, fatal: true });
  const overview = fetched.value;
  const intro = overviewIntroOf(cityName, entry, overview);
  const contents = overviewContentsOf(overview, entry);
  /** Each section by its anchor: what the page has a section for is what its contents name. */
  const sections = Object.fromEntries(contents.map(section => [section.id, section]));
  /** The section being read, marked in the contents; none above the first. */
  const read = ref<string | null>(null);
  useSectionRead(
    contents.map(section => section.id),
    section => {
      read.value = section;
    },
  );

  /**
   * Opens the map as a year picked on a chart left it.
   *
   * @param year - The year.
   * @returns The navigation.
   */
  const openYear = (year: number) => navigateTo(yearLinkOf(city, year));
</script>
