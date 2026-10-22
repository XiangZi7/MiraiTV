<script setup lang="ts">
/** MiraiTV 品牌标识：紫色二次元电视吉祥物。 */
withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    /** 仅显示图标 */
    iconOnly?: boolean
  }>(),
  { size: 'md' }
)

const SIZE_CLASS = {
  sm: { icon: 'size-6', text: 'text-sm' },
  md: { icon: 'size-7', text: 'text-base' },
  lg: { icon: 'size-12', text: 'text-2xl' },
} as const
</script>

<template>
  <NuxtLink
    to="/"
    class="group inline-flex shrink-0 items-center gap-2"
    aria-label="MiraiTV 首页"
  >
    <img
      src="/brand/mirai-mark.webp"
      alt=""
      width="48"
      height="48"
      :class="
        cn(
          'shrink-0 transition-transform duration-300 ease-out-soft motion-safe:group-hover:scale-105',
          SIZE_CLASS[size].icon
        )
      "
    />
    <span
      v-if="!iconOnly"
      :class="
        cn(
          'font-display font-semibold tracking-tight text-ink',
          SIZE_CLASS[size].text
        )
      "
    >
      Mirai<span class="text-brand">TV</span>
    </span>
  </NuxtLink>
</template>
