import betterTailwindcss from 'eslint-plugin-better-tailwindcss';

/**
 * A Tailwind class written as its token, as in dataroom-ui: an arbitrary value that has one is the token
 * (`w-[100px]` → `w-25`, at the browser's 16px root), and a pair that one utility says is that one
 * (`w-4 h-4` → `size-4`, `px-4 py-4` → `p-4`). Read against the app's theme from its CSS entry, Nuxt UI's
 * included, so a token it defines counts; in a template, a `class`/`:class`, and in a script, a `cn()`.
 *
 * Not `collapse`, the canonical rule's merging of different properties: it would write `text-sm
 * leading-relaxed` as `text-sm/relaxed`, which sets the line height without the `--tw-leading` that
 * `leading-relaxed` sets, and a child with a `text-*` of its own inherits that.
 */
export const tailwindConfig = [
  {
    files: ['web/src/**/*.{ts,vue}'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    // Tailwind is web's, and the theme its CSS entry's: found from web/, against the root ESLint runs at.
    // Not found, the plugin turns its rules off with only a warning, so it is looked for where it is.
    settings: { 'better-tailwindcss': { cwd: 'web', entryPoint: 'src/css/main.css', rootFontSize: 16 } },
    rules: {
      'better-tailwindcss/enforce-canonical-classes': ['error', { collapse: false }],
      'better-tailwindcss/enforce-shorthand-classes': 'error',
    },
  },
];
