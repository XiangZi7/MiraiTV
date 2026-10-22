<script setup lang="ts">
/** 空状态占位 */
withDefaults(
  defineProps<{
    icon?: string
    title: string
    description?: string
  }>(),
  { icon: 'lucide:film' }
)
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center"
  >
    <div
      class="flex size-14 items-center justify-center rounded-full bg-surface-2 text-ink-3"
    >
      <Icon
        :name="icon"
        class="size-6"
      />
    </div>
    <p class="text-sm font-medium text-ink">{{ title }}</p>
    <p
      v-if="description"
      class="max-w-xs text-xs leading-relaxed text-ink-3"
    >
      {{ description }}
    </p>
    <div
      v-if="$slots.default"
      class="mt-2"
    >
      <slot />
    </div>
  </div>
</template>
