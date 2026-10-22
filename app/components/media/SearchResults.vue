<script setup lang="ts">
import type { MediaItem } from '~/types/media'

defineProps<{
  keyword: string
  items: MediaItem[]
  pending?: boolean
  error?: unknown
  partial?: boolean
  total?: number | null
}>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <section
    aria-label="搜索结果"
    aria-live="polite"
  >
    <UiSectionHeader
      title="搜索结果"
      :description="`“${keyword}” · ${total == null ? `已加载 ${items.length}` : `共 ${total}`} 部作品`"
    />
    <UiRequestState :pending="pending" />
    <UiButton
      v-if="!pending && (error || partial)"
      class="mt-4"
      size="sm"
      variant="outline"
      @click="$emit('retry')"
      >重新搜索</UiButton
    >

    <div
      v-if="items.length"
      class="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6"
    >
      <MediaCard
        v-for="item in items"
        :key="item.id"
        :media="item"
        variant="inline"
        playable
      >
        <template #overlay>
          <span
            v-if="item.sourceName"
            :title="item.sourceName"
            class="absolute top-2 left-2 z-10 max-w-[calc(100%-1rem)] truncate rounded-md bg-brand px-2 py-1 text-[0.625rem] font-medium text-white sm:text-xs"
            data-source-badge
            >{{ item.sourceName }}</span
          >
        </template>
      </MediaCard>
    </div>

    <UiEmpty
      v-else-if="!pending && !error"
      icon="lucide:search"
      title="没有数据"
      description="试试其他片名、原名或题材关键词。"
    />
  </section>
</template>
