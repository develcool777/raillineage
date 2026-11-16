<template>
  <!-- One setting of a video: its name, what it does in a tooltip on the mark beside it, and its control under them. -->
  <UFormField :label="props.label" :error="props.error" :ui="{ labelWrapper: 'justify-start gap-1.5' }">
    <template #hint>
      <UTooltip :text="props.tip" :content="{ side: 'top' }" :ui="{ content: 'h-auto max-w-72 py-1.5', text: 'text-pretty whitespace-normal' }">
        <UIcon name="i-lucide-info" class="text-dimmed hover:text-default size-3.5 cursor-help transition-colors" :aria-label="props.tip" />
      </UTooltip>
    </template>
    <slot />
  </UFormField>
</template>

<script setup lang="ts">
  const props = defineProps<{
    /** Its name. */
    label: string;
    /** What it does, in a sentence or two. */
    tip: string;
    /** What is wrong with its value, if anything. */
    error?: string;
  }>();

  defineSlots<{
    /** Its control. */
    default: () => unknown;
  }>();
</script>
