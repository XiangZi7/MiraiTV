<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/** 视觉风格 */
type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'outline' | 'danger'
/** 尺寸 */
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    /** 胶囊形，UI 稿中主按钮均为胶囊 */
    pill?: boolean
    /** 左侧图标名，取 lucide 图标集 */
    icon?: string
    /** 右侧图标名 */
    iconRight?: string
    /** 撑满父容器宽度 */
    block?: boolean
    disabled?: boolean
    loading?: boolean
    /** 传入后渲染为 NuxtLink */
    to?: RouteLocationRaw
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    pill: true,
    type: 'button',
  }
)

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'glass-surface glass-control glass-accent',
  glass: 'glass-surface glass-control text-ink',
  ghost: 'text-ink-2 hover:bg-white/8 hover:text-ink',
  outline: 'glass-surface glass-control text-ink hover:border-ink-3',
  danger: 'glass-surface glass-control glass-danger',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2.5 px-6 text-[0.9375rem]',
}

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-[1.125rem]',
}

/** 有 to 时渲染为路由链接，否则为原生按钮 */
const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'button'))

const isDisabled = computed(() => props.disabled || props.loading)

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const rootClass = computed(() =>
  cn(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap',
    'ease-out-soft transition-all duration-200 active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-45',
    props.pill ? 'rounded-full' : 'rounded-lg',
    props.block && 'w-full',
    SIZE_CLASS[props.size],
    VARIANT_CLASS[props.variant],
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
    :disabled="to ? undefined : isDisabled"
    :aria-busy="loading || undefined"
    :class="rootClass"
  >
    <Icon
      v-if="loading"
      name="lucide:loader-circle"
      :class="cn(ICON_SIZE[size], 'animate-spin')"
    />
    <Icon
      v-else-if="icon"
      :name="icon"
      :class="ICON_SIZE[size]"
    />

    <slot />

    <Icon
      v-if="iconRight"
      :name="iconRight"
      :class="ICON_SIZE[size]"
    />
  </component>
</template>
