import { defineVitestProject } from '@nuxt/test-utils/config';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { projectsOf, SHARED_TEST_OPTIONS } from '../vitest.shared.ts';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

/** How a test reaches the app, from `~/` as Nuxt does, and its factories, from `@test/`. */
const resolve = { alias: { '~': `${ROOT}src`, '@test': `${ROOT}test` } };

/** The app's plain helpers and stores (`test/unit/` mirrors `src/`), in node. */
const [logic] = projectsOf('web', { resolve });

/**
 * Its components (`*.spec.ts`), each rendered in the app itself: Nuxt booted in happy-dom
 * (`@nuxt/test-utils`), so a component finds what it is given by tag (Nuxt UI's, the app's own),
 * `#imports` and the router, as on the page.
 */
const components = await defineVitestProject({
  resolve,
  test: {
    ...SHARED_TEST_OPTIONS,
    name: 'web-dom',
    environment: 'nuxt',
    environmentOptions: { nuxt: { rootDir: ROOT, domEnvironment: 'happy-dom' } },
    include: ['test/unit/**/*.spec.ts'],
  },
});

export default defineConfig({ test: { projects: [logic, components] } });
