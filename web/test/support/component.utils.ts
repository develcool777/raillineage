import { renderSuspended } from '@nuxt/test-utils/runtime';
import type { Component } from 'vue';
import { defineComponent, h } from 'vue';
import type { ComponentProps } from 'vue-component-type-helpers';
import { UApp } from '#components';

/**
 * Renders a component as the page does: inside `<UApp>` (`app.vue`), whose providers Nuxt UI's
 * tooltips, toasts and overlays need, in the app Nuxt booted for the spec. What it emits is heard as
 * the page hears it, through its `on…` props (`onSettings` for `settings`), as the component is not the
 * root rendered.
 *
 * @param component - The component.
 * @param props - Its props and its listeners.
 * @returns What Testing Library returns for the render.
 */
export const renderInApp = <C extends Component>(component: C, props: ComponentProps<C>): ReturnType<typeof renderSuspended> =>
  renderSuspended(defineComponent({ setup: () => () => h(UApp, null, { default: () => h(component, props) }) }));
