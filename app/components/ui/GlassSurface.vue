<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: 'div' | 'section' | 'aside' | 'nav'
    /** Reserve live optics for navigation and focal controls, not dense lists. */
    refraction?: boolean
  }>(),
  { as: 'div' }
)
</script>

<template>
  <component
    :is="as"
    class="glass-surface"
    :class="{ 'glass-refract': refraction }"
  >
    <slot />
  </component>
</template>
