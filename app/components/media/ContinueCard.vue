<script setup lang="ts">
import type { WatchRecord } from '~/types/media'

/** 继续观看卡：竖版小海报 + 进度 + 续播入口 */
const props = defineProps<{
  record: WatchRecord
  compact?: boolean
}>()

const playLink = computed(() => ({
  path: `/play/${props.record.media.id}`,
  query: props.record.episodeId
    ? { episodeId: props.record.episodeId }
    : undefined,
}))
const progress = computed(() => watchProgress(props.record))
const episodeLabel = computed(() => {
  const label = props.record.episodeLabel?.trim()
  if (label && /^\d+$/.test(label))
    return props.record.media.kind === 'movie' ? '正片' : `第 ${label} 集`
  return label
})
</script>

<template>
  <NuxtLink
    :to="playLink"
    class="glass-surface glass-control group flex items-center gap-3 rounded-2xl hover:border-line-strong"
    :class="compact ? 'p-1.5' : 'p-3'"
    :aria-label="`继续观看 ${record.media.title}，${progress.label}`"
  >
    <div :class="['shrink-0', compact ? 'w-10' : 'w-14']">
      <MediaPoster
        :media="record.media"
        compact
      />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <h3
            class="text-[0.8125rem] leading-5 font-medium text-ink"
            :class="compact ? 'truncate' : 'line-clamp-2'"
          >
            {{ record.media.title }}
          </h3>
          <p
            v-if="episodeLabel"
            class="mt-1 truncate text-[0.6875rem] text-ink-3"
          >
            {{ episodeLabel }}
          </p>
        </div>
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition-colors duration-200 ease-out-soft group-hover:bg-brand group-hover:text-white"
          aria-hidden="true"
        >
          <Icon
            name="lucide:play"
            class="size-3 translate-x-px fill-current"
          />
        </span>
      </div>
      <p
        class="truncate text-[0.6875rem] text-ink-3 tabular-nums"
        :class="compact ? 'mt-1' : 'mt-2'"
      >
        {{ progress.label }}
      </p>
      <UiProgress
        :value="progress.progress"
        :aria-label="`${record.media.title} 观看进度`"
        size="sm"
        class="w-full !bg-line"
        :class="compact ? 'mt-1' : 'mt-1.5'"
      />
    </div>
  </NuxtLink>
</template>
