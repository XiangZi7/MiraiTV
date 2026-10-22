<script setup lang="ts">
// 登录已改为全站弹窗，这里只兼容旧链接与书签：带着来源回发现页触发弹窗
definePageMeta({
  middleware: to =>
    navigateTo(
      {
        path: '/',
        query: {
          login:
            typeof to.query.redirect === 'string' ? to.query.redirect : '/',
        },
      },
      { replace: true }
    ),
})
</script>

<template>
  <div />
</template>
