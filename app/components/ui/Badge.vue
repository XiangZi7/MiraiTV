<script setup lang="ts">
type BadgeTone = 'neutral' | 'brand' | 'live' | 'star' | 'danger' | 'glass'
type BadgeSize = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    tone?: BadgeTone
    size?: BadgeSize
    /** 左侧呼吸圆点，用于「更新中」 */
    dot?: boolean
    icon?: string
    /** 方角，用于海报左上角角标 */
    square?: boolean
  }>(),
  {
    tone: 'neutral',
    size: 'sm',
  }
)

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-surface-3/80 text-ink-2',
  brand: 'bg-brand/18 text-brand',
  live: 'bg-live/14 text-live',
  star: 'bg-star/16 text-star',
  danger: 'bg-danger text-white',
  glass: 'glass-surface glass-on-image',
}

const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: 'h-5 gap-1 px-2 text-[0.6875rem]',
  md: 'h-6 gap-1.5 px-2.5 text-xs',
}
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex shrink-0 items-center font-medium whitespace-nowrap',
        props.square ? 'rounded-sm' : 'rounded-full',
        SIZE_CLASS[props.size],
        TONE_CLASS[props.tone]
      )
    "
  >
    <span
      v-if="dot"
      class="size-1.5 rounded-full bg-current"
    />
    <Icon
      v-if="icon"
      :name="icon"
      class="size-3"
    />
    <slot />
  </span>
</template>
