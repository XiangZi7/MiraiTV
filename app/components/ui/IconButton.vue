<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

type IconButtonVariant = 'ghost' | 'glass' | 'solid' | 'brand'
type IconButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    /** lucide 图标名 */
    icon: string
    /** 无障碍名称，图标按钮必填 */
    label: string
    variant?: IconButtonVariant
    size?: IconButtonSize
    /** 右上角红点，用于消息提醒 */
    dot?: boolean
    /** 激活态，如已收藏 */
    active?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    to?: RouteLocationRaw
  }>(),
  {
    variant: 'ghost',
    size: 'md',
    type: 'button',
    active: undefined,
  }
)

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  ghost: 'text-ink-2 hover:bg-white/8 hover:text-ink',
  glass: 'glass-surface glass-control text-ink',
  solid: 'glass-surface glass-control text-ink-2 hover:text-ink',
  brand: 'glass-surface glass-control glass-accent',
}

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-11',
}

const ICON_SIZE: Record<IconButtonSize, string> = {
  sm: 'size-4',
  md: 'size-[1.125rem]',
  lg: 'size-5',
}

const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'button'))

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const rootClass = computed(() =>
  cn(
    'inline-flex shrink-0 items-center justify-center rounded-full',
    'ease-out-soft transition-all duration-200 active:scale-90',
    'disabled:pointer-events-none disabled:opacity-40',
    // 仅红点需要定位参照，避免无条件占用 position 与调用方的 absolute 冲突
    props.dot && 'relative',
    SIZE_CLASS[props.size],
    VARIANT_CLASS[props.variant],
    props.active && 'text-brand',
    attrs.class
  )
)
</script>

<template>
  <component
    :is="tag"
    v-bind="omitClass($attrs)"
    :to="to"
    :type="to ? undefined : type"
    :disabled="to ? undefined : disabled"
    :aria-label="label"
    :title="label"
    :aria-pressed="to ? undefined : active"
    :class="rootClass"
  >
    <Icon
      :name="icon"
      aria-hidden="true"
      :class="ICON_SIZE[size]"
    />
    <span
      v-if="dot"
      class="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger ring-2 ring-base"
    />
  </component>
</template>
