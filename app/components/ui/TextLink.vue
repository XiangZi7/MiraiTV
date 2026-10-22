<script setup lang="ts">
/** 「查看全部 →」类文字链接 */
const props = withDefaults(
  defineProps<{
    to?: string
    icon?: string
  }>(),
  { icon: 'lucide:arrow-right' }
)

const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'button'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :type="to ? undefined : 'button'"
    class="group inline-flex cursor-pointer items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors duration-200 ease-out-soft hover:text-ink"
  >
    <slot />
    <Icon
      :name="icon"
      class="size-3.5 transition-transform duration-200 ease-out-soft group-hover:translate-x-0.5"
    />
  </component>
</template>
