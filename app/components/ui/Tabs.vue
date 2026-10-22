<script setup lang="ts">
/** 页签项，字符串会被归一化为 { label, value } */
export type TabItem =
  string | { label: string; value: string; badge?: string | number }

const props = withDefaults(
  defineProps<{
    items: TabItem[]
    size?: 'sm' | 'md' | 'lg'
    /** 胶囊轨道对齐方式 */
    align?: 'start' | 'center'
    label?: string
    /** 首页手机日期筛选：收紧横向留白，保留可点击高度。 */
    compact?: boolean
  }>(),
  { size: 'md', align: 'start', label: '内容筛选' }
)

/** 当前选中值 */
const active = defineModel<string>({ required: true })

const SIZE_CLASS = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-[0.9375rem]',
} as const

const normalized = computed(() =>
  props.items.map(item =>
    typeof item === 'string'
      ? { label: item, value: item, badge: undefined }
      : item
  )
)

const tabs = useTemplateRef<HTMLDivElement>('tabs')
function onKeydown(event: KeyboardEvent, index: number) {
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % normalized.value.length
  else if (event.key === 'ArrowLeft')
    next = (index - 1 + normalized.value.length) % normalized.value.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = normalized.value.length - 1
  else return
  event.preventDefault()
  active.value = normalized.value[next]!.value
  tabs.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
}
</script>

<template>
  <div
    ref="tabs"
    role="tablist"
    :aria-label="label"
    :class="
      cn(
        'glass-track glass-surface scrollbar-none flex w-fit max-w-full items-center gap-1 overflow-x-auto !rounded-full p-1',
        SIZE_CLASS[size],
        compact && 'tabs-compact',
        align === 'center' && 'justify-center'
      )
    "
  >
    <UiGlassIndicator :active="active" />
    <button
      v-for="(item, index) in normalized"
      :key="item.value"
      :data-glass-key="item.value"
      type="button"
      role="tab"
      :aria-selected="active === item.value"
      :tabindex="active === item.value ? 0 : -1"
      :class="
        cn(
          'relative min-h-9 shrink-0 cursor-pointer rounded-full px-4 py-2 font-medium transition-colors duration-200 ease-out-soft sm:px-5',
          active === item.value
            ? 'glass-selected'
            : 'text-ink-3 hover:bg-white/5 hover:text-ink'
        )
      "
      @click="active = item.value"
      @keydown="onKeydown($event, index)"
    >
      <span class="inline-flex items-center gap-1.5">
        {{ item.label }}
        <span
          v-if="item.badge !== undefined"
          class="text-[0.6875rem] text-ink-3 tabular-nums"
        >
          {{ item.badge }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
@media (max-width: 639px) {
  .tabs-compact {
    gap: 0;
    padding: 0.125rem;
    font-size: 0.75rem;
  }
  .tabs-compact > button {
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0.5rem 0.25rem;
  }
}
</style>
