<script setup lang="ts">
/**
 * 点分隔元信息行：2023 · 日本 · 动画 · 奇幻
 * 自动过滤空值，避免出现悬空的分隔点
 */
const props = defineProps<{
  items: (string | number | undefined | null | false)[]
}>()

const visibleItems = computed(() =>
  props.items.filter(
    (item): item is string | number => Boolean(item) || item === 0
  )
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
    <template
      v-for="(item, index) in visibleItems"
      :key="`${item}-${index}`"
    >
      <span
        v-if="index > 0"
        class="text-ink-3/60 select-none"
        >·</span
      >
      <span>{{ item }}</span>
    </template>
    <slot />
  </div>
</template>
