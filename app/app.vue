<script setup lang="ts">
const site = useSite()
useHead({ title: () => site.siteName })
useSeoMeta({ description: () => site.siteDescription })
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <!-- 首次进入某个页面要等它的数据，顶部进度条让点击立刻有反馈 -->
    <NuxtLoadingIndicator
      color="var(--color-brand)"
      :height="2"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
