<script setup lang="ts">
import { SERIES_GENRES } from '~/constants/filters'
// 保留组件实例：返回这个页面时筛选、页签和滚动位置都还在
definePageMeta({ keepalive: true })
</script>

<template>
  <MediaCategoryPage
    title="剧集"
    kind="series"
    subtitle="一集一集，陪你走完每个故事。"
    :genres="SERIES_GENRES"
  />
</template>
