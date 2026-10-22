<script setup lang="ts">
import { MOVIE_GENRES } from '~/constants/filters'
// 保留组件实例：返回这个页面时筛选、页签和滚动位置都还在
definePageMeta({ keepalive: true })
</script>

<template>
  <MediaCategoryPage
    title="电影"
    kind="movie"
    subtitle="用光影，讲述世界的万千面貌。"
    :genres="MOVIE_GENRES"
  />
</template>
