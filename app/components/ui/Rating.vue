<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 评分，10 分制 */
    value?: number | null
    /** 评分人数等补充文案 */
    hint?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'sm' }
)

const SIZE_CLASS = {
  sm: { text: 'text-xs', icon: 'size-3' },
  md: { text: 'text-sm', icon: 'size-3.5' },
  lg: { text: 'text-base', icon: 'size-4' },
} as const
</script>

<template>
  <span
    v-if="value != null && Number.isFinite(value)"
    :class="
      cn('inline-flex items-center gap-1 text-star', SIZE_CLASS[size].text)
    "
  >
    <Icon
      name="lucide:star"
      :class="cn(SIZE_CLASS[size].icon, 'fill-current')"
    />
    <span class="font-semibold tabular-nums">{{ value.toFixed(1) }}</span>
    <span
      v-if="hint"
      class="font-normal text-ink-3"
      >{{ hint }}</span
    >
  </span>
</template>
