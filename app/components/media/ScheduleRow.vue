<script setup lang="ts">
import type { ScheduleItem } from '~/types/media'

/** 周番排期列表行：小海报 + 标题标签 + 播出时刻 */
defineProps<{
  item: ScheduleItem
}>()
</script>

<template>
  <NuxtLink
    :to="`/detail/${item.media.id}`"
    class="group flex items-center gap-4 border-b border-line/60 px-2 py-3 transition-colors duration-200 ease-out-soft last:border-b-0 hover:bg-surface-2/50"
  >
    <div class="w-14 shrink-0">
      <MediaPoster
        :media="item.media"
        playable
        compact
      />
    </div>

    <div class="min-w-0 flex-1">
      <h3
        class="truncate text-[0.8125rem] font-medium text-ink transition-colors duration-200 ease-out-soft group-hover:text-brand"
      >
        {{ item.media.title }}
      </h3>
      <p
        v-if="item.media.originalTitle"
        class="mt-0.5 truncate text-xs text-ink-3"
      >
        {{ item.media.originalTitle }}
      </p>

      <div class="mt-2 flex flex-wrap items-center gap-1.5">
        <UiBadge
          v-if="item.status === 'airing'"
          tone="live"
          dot
          >更新中</UiBadge
        >
        <UiBadge
          v-if="item.latestEpisode != null"
          tone="brand"
          >EP {{ item.latestEpisode }}</UiBadge
        >
        <UiBadge
          v-for="genre in item.media.genres.slice(0, 2)"
          :key="genre"
        >
          {{ genre }}
        </UiBadge>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <span class="text-[0.8125rem] text-ink-2 tabular-nums">{{
        item.airTime ?? '时刻待定'
      }}</span>
      <Icon
        name="lucide:chevron-right"
        class="size-4 text-ink-3 transition-transform duration-200 ease-out-soft group-hover:translate-x-0.5"
      />
    </div>
  </NuxtLink>
</template>
