<script setup lang="ts">
/** 面板容器：统一卡片底色、描边与圆角 */
const props = withDefaults(
  defineProps<{
    padding?: 'none' | 'sm' | 'md' | 'lg'
    /** 显式开启真实折射；普通列表面板仅使用轻量玻璃外观。 */
    glass?: boolean
    /** 悬停抬升 */
    hoverable?: boolean
  }>(),
  { padding: 'md' }
)

const PADDING_CLASS = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
} as const

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const rootClass = computed(() =>
  cn(
    'glass-surface rounded-panel',
    props.glass && 'glass-refract',
    props.hoverable &&
      'ease-out-soft hover:border-line-strong transition-colors duration-200',
    PADDING_CLASS[props.padding],
    attrs.class
  )
)
</script>

<template>
  <div
    v-bind="omitClass($attrs)"
    :class="rootClass"
  >
    <slot />
  </div>
</template>
