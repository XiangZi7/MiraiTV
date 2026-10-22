<script setup lang="ts">
import type { MediaItem } from '~/types/media'

/**
 * 紧凑横向卡：缩略图 + 标题 + 元信息
 * 用于播放页侧栏的相关推荐等窄栏列表
 * 关联条目的元数据常常不全，缺失字段直接省略，不留下孤立的分隔符
 */
const props = defineProps<{
  media: MediaItem
  /** 列表序号，标在缩略图左上角 */
  index?: number
}>()

const meta = computed(() =>
  [
    props.media.year,
    props.media.region,
    props.media.genres[0],
    props.media.episodes ? `全 ${props.media.episodes} 集` : null,
  ]
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ')
)
</script>

<template>
  <NuxtLink
    :to="`/detail/${media.id}`"
    class="group flex items-start gap-3 rounded-lg p-2 transition-colors duration-200 ease-out-soft hover:bg-surface-2/70"
  >
    <div class="relative w-18 shrink-0">
      <MediaPoster
        :media="media"
        playable
        compact
      />
      <span
        v-if="index"
        class="absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full bg-brand text-[0.625rem] font-semibold text-white tabular-nums shadow-lg shadow-black/40"
      >
        {{ index }}
      </span>
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
      <h3
        class="line-clamp-2 text-xs leading-snug font-medium text-ink transition-colors duration-200 ease-out-soft group-hover:text-brand"
      >
        {{ media.title }}
      </h3>
      <p
        v-if="media.originalTitle && media.originalTitle !== media.title"
        class="truncate text-[0.6875rem] text-ink-3"
      >
        {{ media.originalTitle }}
      </p>
      <p
        v-if="meta"
        class="truncate text-[0.6875rem] text-ink-3"
      >
        {{ meta }}
      </p>
      <UiRating
        :value="media.rating"
        class="mt-0.5"
      />
    </div>
  </NuxtLink>
</template>
