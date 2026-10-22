<script setup lang="ts">
/**
 * 胶囊筛选组：分类页题材标签、片单页签
 * 与 UiTabs 共用玻璃滑块，可换行或竖向排列。
 */
const props = withDefaults(
  defineProps<{
    items: string[]
    size?: 'sm' | 'md'
    variant?: 'glass' | 'solid'
    /** 竖向排列，用于电影页左侧题材栏 */
    vertical?: boolean
  }>(),
  { size: 'md', variant: 'glass' }
)

const active = defineModel<string>({ required: true })

const SIZE_CLASS = {
  sm: 'h-7 px-3 text-xs',
  md: 'h-8 px-3.5 text-[0.8125rem]',
} as const
</script>

<template>
  <div
    :class="
      cn(
        'scrollbar-none flex gap-2',
        variant === 'glass' && 'glass-track',
        props.vertical ? 'flex-col' : 'flex-wrap items-center overflow-x-auto'
      )
    "
  >
    <UiGlassIndicator
      v-if="variant === 'glass'"
      :active="active"
    />
    <button
      v-for="item in items"
      :key="item"
      :data-glass-key="item"
      type="button"
      :aria-pressed="active === item"
      :class="
        cn(
          'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-medium whitespace-nowrap transition-all duration-200 ease-out-soft',
          SIZE_CLASS[size],
          variant === 'solid' && 'h-9',
          props.vertical && 'justify-start',
          active === item
            ? variant === 'solid'
              ? 'bg-brand text-white'
              : 'glass-selected'
            : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
        )
      "
      @click="active = item"
    >
      {{ item }}
    </button>
  </div>
</template>
