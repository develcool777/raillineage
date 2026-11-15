<template>
  <!-- "Generations": the first line along the bottom, each newer one branching off the one before at an interchange. -->
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <g fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 46H58" class="stroke-brand-700 dark:stroke-brand-600" />
      <path d="M17 46L31 32H58" class="stroke-brand-600 dark:stroke-brand-500" />
      <path d="M31 32L45 18H58" class="stroke-brand-500 dark:stroke-brand-300" />
    </g>
    <circle cx="5" cy="46" r="5" class="fill-brand-700 dark:fill-brand-600" />
    <circle cx="58" cy="46" r="5" class="fill-brand-700 dark:fill-brand-600" />
    <circle cx="58" cy="32" r="5" class="fill-brand-600 dark:fill-brand-500" />
    <circle cx="58" cy="18" r="5" class="fill-brand-500 dark:fill-brand-300" />
    <circle cx="17" cy="46" r="6" stroke-width="3" class="fill-(--ui-bg) stroke-(--ui-text-highlighted)" />
    <circle cx="31" cy="32" r="6" stroke-width="3" class="fill-(--ui-bg) stroke-(--ui-text-highlighted)" />
  </svg>
</template>
