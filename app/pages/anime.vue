<script setup lang="ts">
import { ANIME_GENRES } from '~/constants/filters'
// 保留组件实例：返回这个页面时筛选、页签和滚动位置都还在
definePageMeta({ keepalive: true })
</script>

<template>
  <MediaCategoryPage
    title="动漫"
    kind="anime"
    subtitle="二次元，还有另一个世界。"
    :genres="ANIME_GENRES"
  />
</template>
