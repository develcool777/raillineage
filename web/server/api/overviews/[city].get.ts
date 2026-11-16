import { servedNetwork } from '@raillineage/schema/served.utils';
import { createError, defineEventHandler, getRouterParam } from 'h3';
import { useStorage } from 'nitropack/runtime';
import { cityOverviewOf } from '~/features/overview/cityOverview.utils';
import { isCity, networkFileOf } from '~/utils/city.utils';

/**
 * A city's overview, worked out from its network: what its page is prerendered with as the site is
 * built (`useCityOverview`). Nothing serves it once published: the site is static files, each overview
 * page with its own answer beside it (`_payload.json`). The network comes from the build's server assets
 * (`nitro.serverAssets` in `nuxt.config.ts`), as the prerenderer serves none of `public/`.
 */
export default defineEventHandler(async event => {
  const city = getRouterParam(event, 'city');
  if (!isCity(city)) throw createError({ statusCode: 404, statusMessage: `No city ${String(city)}` });
  const stored = await useStorage('assets:cities').getItem(networkFileOf(city));
  return cityOverviewOf(city, servedNetwork(stored));
});
