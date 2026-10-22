<script setup lang="ts">
import type { WatchRecord } from '~/types/media'

/** 观看历史行：缩略图 + 观看进度 + 日期 + 移除 */
const props = defineProps<{
  record: WatchRecord
}>()
const progress = computed(() => watchProgress(props.record))

const emit = defineEmits<{
  remove: [id: string]
}>()
</script>

<template>
  <div
    class="group flex items-center gap-4 border-b border-line/60 px-2 py-3 transition-colors duration-200 ease-out-soft last:border-b-0 hover:bg-surface-2/50"
  >
    <NuxtLink
      :to="{
        path: `/play/${record.media.id}`,
        query: record.episodeId ? { episodeId: record.episodeId } : undefined,
      }"
      class="w-14 shrink-0"
    >
      <MediaPoster
        :media="record.media"
        playable
        compact
      />
    </NuxtLink>

    <div class="min-w-0 flex-1">
      <NuxtLink
        :to="`/detail/${record.media.id}`"
        class="block truncate text-[0.8125rem] font-medium text-ink transition-colors duration-200 ease-out-soft hover:text-brand"
      >
        {{ record.media.title }}
      </NuxtLink>

      <p class="mt-1 truncate text-xs text-ink-3">
        <template v-if="record.episodeLabel"
          >{{ record.episodeLabel }} ·
        </template>
        {{ progress.label }}
      </p>

      <UiProgress
        :value="progress.progress"
        size="xs"
        class="mt-2 max-w-60"
      />
    </div>

    <span class="hidden shrink-0 text-xs text-ink-3 tabular-nums sm:block">
      {{ record.watchedAt }}
    </span>

    <UiButton
      variant="ghost"
      size="sm"
      icon="lucide:x"
      class="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      @click="emit('remove', record.id)"
    >
      移除
    </UiButton>
  </div>
</template>
