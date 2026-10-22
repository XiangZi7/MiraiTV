<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeo({ title: '设置', noindex: true })
</script>
<template>
  <div class="container-page max-w-4xl py-10">
    <h1 class="text-2xl font-semibold tracking-tight">设置</h1>
    <p class="mt-2 mb-8 text-sm text-ink-3">管理你的账号与个人资料。</p>
    <AccountSettings />
  </div>
</template>
