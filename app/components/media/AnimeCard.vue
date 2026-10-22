<script setup lang="ts">
import type { ScheduleItem } from '~/types/media'
import { WEEKDAY_FULL } from '~/constants/navigation'

/**
 * 新番卡：首页只显示标题，片单可展示播出时间与更新状态。
 */
const props = withDefaults(
  defineProps<{
    item: ScheduleItem
    /** 标注为本周推荐，海报左上角出现角标 */
    featured?: boolean
    showDetails?: boolean
    compact?: boolean
  }>(),
  { showDetails: true }
)

const STATUS_TEXT = {
  airing: '更新中',
  finished: '已完结',
  upcoming: '即将播出',
} as const

/** 周五 00:30 · EP 08 */
const airLabel = computed(() => {
  const time = props.item.airTime ? ` ${props.item.airTime}` : ''
  const episode =
    props.item.latestEpisode != null
      ? ` · EP ${String(props.item.latestEpisode).padStart(2, '0')}`
      : ''
  return `${WEEKDAY_FULL[props.item.weekday]}${time}${episode}`
})
</script>

<template>
  <MediaCard
    :media="item.media"
    playable
    :compact="compact"
  >
    <template #overlay>
      <UiBadge
        v-if="featured"
        tone="danger"
        square
        class="absolute top-2 left-2"
      >
        本周推荐
      </UiBadge>
    </template>

    <template #footer>
      <h3
        class="truncate text-[0.8125rem] font-medium text-ink transition-colors duration-200 ease-out-soft group-hover:text-brand"
      >
        {{ item.media.title }}
      </h3>
      <p
        v-if="showDetails"
        class="truncate text-xs text-ink-3"
      >
        {{ airLabel }}
      </p>
      <span
        v-if="showDetails && item.status"
        :class="
          cn(
            'inline-flex items-center gap-1.5 text-xs',
            item.status === 'airing' ? 'text-live' : 'text-ink-3'
          )
        "
      >
        <span class="size-1.5 rounded-full bg-current" />
        {{ STATUS_TEXT[item.status] }}
      </span>
    </template>
  </MediaCard>
</template>
