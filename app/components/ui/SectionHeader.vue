<script setup lang="ts">
/**
 * 区块标题：中文主标 + 英文副标 + 说明文案 + 右侧操作区
 * UI 稿中每个内容区块都使用这一结构，确保节奏统一
 */
withDefaults(
  defineProps<{
    title: string
    /** 英文副标，全大写加字距 */
    kicker?: string
    /** 标题下方说明 */
    description?: string
    size?: 'md' | 'lg'
    /** 首页手机布局：保留主标题，减少辅助文案占用。 */
    compact?: boolean
  }>(),
  { size: 'md' }
)

const SIZE_CLASS = {
  md: 'text-xl',
  lg: 'text-2xl',
} as const
</script>

<template>
  <div
    :class="
      cn(
        'flex items-end justify-between gap-6',
        compact && 'section-header-compact'
      )
    "
  >
    <div class="min-w-0">
      <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2
          :class="cn('font-semibold tracking-tight text-ink', SIZE_CLASS[size])"
        >
          {{ title }}
        </h2>
        <span
          v-if="kicker"
          class="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase"
        >
          {{ kicker }}
        </span>
      </div>
      <p
        v-if="description"
        class="mt-1.5 text-[0.8125rem] text-ink-3"
      >
        {{ description }}
      </p>
    </div>

    <div
      v-if="$slots.actions"
      class="flex shrink-0 items-center gap-3"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 639px) {
  .section-header-compact {
    gap: 0.75rem;
    align-items: center;
  }
  .section-header-compact h2 {
    font-size: 1.125rem;
    line-height: 1.75rem;
  }
  .section-header-compact h2 + span,
  .section-header-compact p {
    display: none;
  }
}
</style>
