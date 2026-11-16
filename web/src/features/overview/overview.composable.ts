import { useEventListener } from '@vueuse/core';
import { onMounted, type Ref } from 'vue';
import { useFetch } from '#imports';
import { READING_LINE_PX } from '~/features/overview/overview.constants';
import type { CityOverview } from '~/features/overview/overview.types';
import { sectionReadOf } from '~/features/overview/overview.utils';

/**
 * A city's overview, as the site is built: asked of the build's own server
 * (`server/api/overviews/[city].get.ts`), which works it out from the city's network, and written into
 * the page with it, so a visitor's browser reads it from the page, never asks for it, and never loads
 * the network to draw it.
 *
 * @param city - The city, by its id: the page's, which is mounted afresh for each.
 * @returns The overview once fetched, and what went wrong, if anything.
 */
export const useCityOverview = async (city: string): Promise<{ overview: Ref<CityOverview | undefined>; error: Ref<Error | undefined> }> => {
  const { data, error } = await useFetch(`/api/overviews/${city}`, { key: `overview-${city}` });
  return { overview: data, error };
};

/**
 * Follows the section being read as the reader scrolls (`sectionReadOf`): hands it to the page, which
 * marks it in its contents, and keeps the address on it, so a link copied from it opens there. As the page
 * opens it is only marked: an address naming a section is scrolled to after, which moves on from there. In place, no step added to the browser's history, so Back still leaves the page,
 * and without the router, which would scroll to it. Once a frame at most.
 *
 * @param sections - The sections' anchors, in the page's order.
 * @param take - What is done with the section read: its anchor.
 */
export const useSectionRead = (sections: string[], take: (read: string | null) => void): void => {
  let frame = 0;
  const follow = (address: boolean) => {
    frame = 0;
    const tops = sections.flatMap(id => {
      const section = document.querySelector(`#${id}`);
      return section ? [{ id, top: section.getBoundingClientRect().top }] : [];
    });
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
    const read = sectionReadOf(tops, READING_LINE_PX, atEnd);
    take(read);
    if (!address) return;
    // The page's opening is its own address: no anchor for it.
    const hash = read === null || read === sections[0] ? '' : `#${read}`;
    if (window.location.hash === hash) return;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
  };
  onMounted(() => follow(false));
  useEventListener(
    'scroll',
    () => {
      if (frame === 0) frame = requestAnimationFrame(() => follow(true));
    },
    { passive: true },
  );
};
