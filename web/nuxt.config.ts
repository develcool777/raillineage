// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url';
import { CITIES } from './src/constants/city.constants';

/** Where the site is published, on Cloudflare (`wrangler.jsonc`): what a page run anywhere else (under `pnpm dev`, a video recorded) names it by. */
const SITE_URL = 'https://raillineage.com';
/** The path the app is served under, with its slash: what public/'s files are fetched from. */
const BASE_URL = process.env.NUXT_APP_BASE_URL ?? '/';

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  // The investors site's layout: shared code at the top of src/, each product surface in features/<name>/.
  srcDir: 'src/',
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    // The video pages (features/video) are for recording, under pnpm dev: the site built leaves them out.
    // Their Record button's server side is modules/videoRecorder.ts, which Nuxt installs, as each file in modules/.
    (_options, nuxt) => {
      if (nuxt.options.dev) return;
      nuxt.hook('pages:extend', pages => {
        const kept = pages.filter(page => !page.path.startsWith('/video'));
        pages.splice(0, pages.length, ...kept);
      });
    },
  ],
  css: ['~/css/main.css', '@raillineage/renderer/transitMap.css'],
  // The map follows the system theme until the user picks one.
  colorMode: { preference: 'system', fallback: 'dark' },
  // Components are used by tag, without an import: the shared ones in components/, and each feature's
  // own in features/<name>/components/ or, in a feature made of parts, features/<name>/<part>/components/.
  // A feature's other code is imported by its path, so what one feature takes from another can be
  // searched for.
  components: [
    { path: '~/components', pathPrefix: false },
    { path: '~/features', pathPrefix: false, pattern: '**/components/**' },
  ],
  // Tests are type-checked with the app, and reach their shared factories as @test/.
  typescript: {
    strict: true,
    tsConfig: {
      // The packages' strictness (`tsconfig.base.json`), but `exactOptionalPropertyTypes`: a template
      // passes `undefined` to an optional prop to mean it is not given, as Vue and Nuxt UI read it.
      compilerOptions: {
        paths: { '@test/*': ['../test/*'] },
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
      },
      include: ['../test/**/*'],
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'RailLineage',
      // The logo mark, served from public/ under the base URL: the SVG where a browser takes one (in its
      // dark colours, on any tab bar), the .ico where it does not, and the picture a phone puts on its home screen.
      link: [
        { rel: 'icon', href: `${BASE_URL}favicon.ico`, sizes: 'any' },
        { rel: 'icon', type: 'image/svg+xml', href: `${BASE_URL}favicon.svg` },
        { rel: 'apple-touch-icon', href: `${BASE_URL}apple-touch-icon.png` },
      ],
      meta: [
        {
          name: 'description',
          content: 'Metro networks on the real map, on any day since they opened: play their history, or open a plan for what they could become.',
        },
        { property: 'og:site_name', content: 'RailLineage' },
        { property: 'og:type', content: 'website' },
      ],
    },
  },
  // The site's address as published, whatever the app runs under: a video names it (`publishedUrl`).
  runtimeConfig: { public: { publishedUrl: SITE_URL } },
  // Every page's canonical address and the sitemap start here; the base URL is added to it. Cloudflare
  // serves a page's folder at its address with a slash (it redirects /kyiv to /kyiv/).
  site: { url: SITE_URL, name: 'RailLineage', trailingSlash: true },
  // Written at build time from the prerendered pages: no runtime endpoint. Its images would lose the
  // base URL, and add nothing a page's own social card does not.
  sitemap: { zeroRuntime: true, discoverImages: false },
  // Each city's dataset, packages/data/cities/<country>/<city>/<city>.json, served as it is kept
  // (/data/united-kingdom/london/london.json), with its pictures beside it.
  // `nuxt generate` prerenders the landing page, About, Privacy, Terms, and every city's page and overview.
  nitro: {
    publicAssets: [{ dir: fileURLToPath(new URL('../packages/data/cities', import.meta.url)), baseURL: '/data' }],
    // The same files for the build's own server, which works out each city's overview as its page is
    // prerendered (`server/api/overviews/`): the prerenderer serves none of the public ones.
    serverAssets: [{ baseName: 'cities', dir: fileURLToPath(new URL('../packages/data/cities', import.meta.url)) }],
    prerender: {
      // Every page is listed here, so nothing is found by following links.
      crawlLinks: false,
      routes: ['/', '/about', '/privacy', '/terms', ...CITIES.flatMap(city => [`/${city.value}`, `/${city.value}/overview`])],
    },
  },
  // Icons come with the site, from @iconify-json/lucide: a visitor's browser never asks Iconify for one.
  // The scan reads .ts too, where a panel's sections name theirs; an icon it missed would show blank.
  icon: { provider: 'none', clientBundle: { scan: { globInclude: ['**/*.{vue,ts}'] } }, fallbackToApi: false },
  // Links end with a slash, as the pages' canonical addresses do: no redirect on the way.
  experimental: { defaults: { nuxtLink: { trailingSlash: 'append' } } },
  // The map's engine, found only through the renderer's source: bundled up front, so the dev server
  // does not find it on the first page and reload.
  vite: { optimizeDeps: { include: ['maplibre-gl'] } },
  devtools: { enabled: true },
});
