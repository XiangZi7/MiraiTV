<script setup lang="ts">
import type { FilterOption } from '~/constants/filters'

/**
 * 轻量下拉筛选，用于分类页「默认排序 / 全部年代 / 全部地区 / 全部评分」
 * 面板 Teleport 到 body 并用视口坐标定位：页头等容器的 overflow-hidden 不会再裁掉它
 */
const props = defineProps<{
  options: FilterOption[]
  /** 未选中时显示的占位文案 */
  placeholder: string
  /** 播放工具栏使用无边框的紧凑样式 */
  variant?: 'glass' | 'plain' | 'solid'
  /** 为有独立字段标签的选择器提供可访问名称 */
  label?: string
}>()

const selected = defineModel<string>({ required: true })

// 响应式状态
const state = reactive({
  // 下拉面板展开状态
  open: false,
  // 面板的视口定位，展开与滚动时重算
  position: { top: 0, left: 0, width: 0, openUp: false },
})

const { open } = toRefs(state)

const triggerRef = ref<HTMLButtonElement>()
const panelRef = ref<HTMLElement>()

/** 面板最大高度，决定向上还是向下展开 */
const PANEL_MAX_HEIGHT = 288
const GAP = 8

function place() {
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return
  const below = window.innerHeight - rect.bottom
  state.position = {
    // 向下空间不足且向上更宽裕时改为向上展开，长年份列表不会被视口截断
    openUp: below < PANEL_MAX_HEIGHT + GAP && rect.top > below,
    top: rect.bottom + GAP,
    left: rect.left,
    width: rect.width,
  }
}

function toggle() {
  if (!state.open) place()
  state.open = !state.open
}

function select(value: string) {
  selected.value = value
  state.open = false
}

onClickOutside(triggerRef, () => (state.open = false), { ignore: [panelRef] })

// 面板脱离了文档流，滚动与缩放时跟随触发按钮；capture 以覆盖内部滚动容器
useEventListener('scroll', () => state.open && place(), {
  passive: true,
  capture: true,
})
useEventListener('resize', () => state.open && place(), { passive: true })

/** 当前选中项文案，兜底占位符 */
const currentLabel = computed(
  () =>
    props.options.find(item => item.value === selected.value)?.label ??
    props.placeholder
)

const panelStyle = computed(() => ({
  left: `${state.position.left}px`,
  minWidth: `${Math.max(state.position.width, 144)}px`,
  maxHeight: `${PANEL_MAX_HEIGHT}px`,
  ...(state.position.openUp
    ? { bottom: `${window.innerHeight - state.position.top + GAP * 2}px` }
    : { top: `${state.position.top}px` }),
}))
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      type="button"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-label="label"
      :title="currentLabel"
      :class="
        cn(
          'inline-flex cursor-pointer items-center gap-1.5 text-[0.8125rem] transition-colors duration-200 ease-out-soft',
          variant === 'plain'
            ? 'h-11 max-w-full min-w-0 rounded-md px-1 hover:bg-brand-soft'
            : variant === 'solid'
              ? 'h-9 rounded-full border border-line-strong bg-surface-2 px-3.5 hover:bg-surface-3'
              : 'glass-surface glass-control h-8 rounded-full px-3.5',
          open ? 'text-ink' : 'text-ink-2 hover:text-ink'
        )
      "
      @click="toggle"
    >
      <span :class="variant === 'plain' ? 'truncate' : 'whitespace-nowrap'">{{
        currentLabel
      }}</span>
      <Icon
        name="lucide:chevron-down"
        :class="
          cn(
            'size-3.5 shrink-0 transition-transform duration-200 ease-out-soft',
            open && 'rotate-180'
          )
        "
      />
    </button>

    <ClientOnly>
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-150 ease-out-soft"
          enter-from-class="opacity-0 -translate-y-1"
          leave-active-class="transition duration-100 ease-out-soft"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <ul
            v-if="open"
            ref="panelRef"
            role="listbox"
            :style="panelStyle"
            class="glass-surface glass-popover fixed z-60 overflow-y-auto rounded-xl p-1.5"
          >
            <li
              v-for="option in options"
              :key="option.value"
            >
              <button
                type="button"
                role="option"
                :aria-selected="selected === option.value"
                :class="
                  cn(
                    'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[0.8125rem] transition-colors',
                    selected === option.value
                      ? 'bg-brand-soft text-brand'
                      : 'text-ink-2 hover:bg-surface-3 hover:text-ink'
                  )
                "
                @click="select(option.value)"
              >
                <span class="whitespace-nowrap">{{ option.label }}</span>
                <Icon
                  v-if="selected === option.value"
                  name="lucide:check"
                  class="size-3.5"
                />
              </button>
            </li>
          </ul>
        </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>
