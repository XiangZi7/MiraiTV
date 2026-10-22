<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** 进度百分比 0-100 */
    value: number
    size?: 'xs' | 'sm' | 'md'
    tone?: 'brand' | 'ink'
  }>(),
  { size: 'sm', tone: 'brand' }
)

const SIZE_CLASS = {
  xs: 'h-0.5',
  sm: 'h-1',
  md: 'h-1.5',
} as const

const TONE_CLASS = {
  brand: 'bg-brand',
  ink: 'bg-ink',
} as const

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const rootClass = computed(() =>
  cn(
    'bg-white/12 overflow-hidden rounded-full',
    SIZE_CLASS[props.size],
    attrs.class
  )
)

/** 夹紧到 0-100，避免数据异常时溢出 */
const clamped = computed(() => Math.min(Math.max(props.value, 0), 100))
</script>

<template>
  <div
    v-bind="omitClass($attrs)"
    role="progressbar"
    :aria-valuenow="Math.round(clamped)"
    aria-valuemin="0"
    aria-valuemax="100"
    :class="rootClass"
  >
    <div
      :class="
        cn(
          'h-full rounded-full transition-[width] duration-500 ease-out-soft',
          TONE_CLASS[tone]
        )
      "
      :style="{ width: `${clamped}%` }"
    />
  </div>
</template>
