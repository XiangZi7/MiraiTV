<script setup lang="ts">
import type { PosterTint } from '~/types/media'

const props = withDefaults(
  defineProps<{
    /** 头像图地址，缺省时用渐变 + 首字母兜底 */
    src?: string
    /** 用于生成兜底首字母 */
    name?: string
    tint?: PosterTint
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    /** 外描边，叠在图片上时使用 */
    ring?: boolean
  }>(),
  {
    size: 'md',
    tint: () => ({ from: '#8f6fbf', to: '#1d172c' }),
  }
)

const SIZE_CLASS = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-16 text-xl',
  xl: 'size-24 text-3xl',
} as const

/** 兜底首字母 */
const initial = computed(() => props.name?.trim().charAt(0).toUpperCase() ?? '')

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const rootClass = computed(() =>
  cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
    'font-semibold text-white/90 select-none',
    SIZE_CLASS[props.size],
    props.ring && 'ring-2 ring-white/20',
    attrs.class
  )
)
</script>

<template>
  <span
    v-bind="omitClass($attrs)"
    :class="rootClass"
    :style="src ? undefined : tintToGradient(tint)"
  >
    <img
      v-if="src"
      :src="src"
      :alt="name ?? ''"
      loading="lazy"
      decoding="async"
      class="size-full object-cover"
    />
    <template v-else>{{ initial }}</template>
  </span>
</template>
