<script setup lang="ts">
defineProps<{ pending?: boolean; error?: unknown; partial?: boolean }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div aria-live="polite">
    <p
      v-if="pending"
      class="py-5 text-sm text-ink-3"
    >
      正在加载…
    </p>
    <UiEmpty
      v-else-if="error"
      icon="lucide:wifi-off"
      title="加载失败"
      :description="apiErrorMessage(error)"
    >
      <UiButton
        size="sm"
        @click="$emit('retry')"
        >重试</UiButton
      >
    </UiEmpty>
    <p
      v-else-if="partial"
      class="py-3 text-xs text-ink-3"
    >
      部分数据暂时不可用，已展示可用内容。
    </p>
  </div>
</template>
