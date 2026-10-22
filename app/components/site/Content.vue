<script setup lang="ts">
// 独立读取，不受首页视频源故障影响；重新进入首页时更新数据库开关。
const { data, refresh } = await useSiteContent()
let activated = false
onActivated(() => {
  // KeepAlive 首次挂载也触发 activated，此时已有 SSR 数据。
  if (activated) void refresh()
  activated = true
})
</script>

<template>
  <div
    v-if="
      (data.announcementsEnabled && data.announcements.length) ||
      (data.promotionsEnabled && data.apps.length)
    "
    class="container-page mt-3 sm:mt-6"
    data-site-content
  >
    <SiteAnnouncements
      v-if="data.announcementsEnabled"
      :items="data.announcements"
    />
    <SiteAppPromotions
      v-if="data.promotionsEnabled"
      :apps="data.apps"
    />
  </div>
</template>
