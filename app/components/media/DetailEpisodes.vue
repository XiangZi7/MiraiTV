<script setup lang="ts">
import type { PlaybackSources } from '~/types/web-api'

const props = defineProps<{
  mediaId: string
  sources?: PlaybackSources | null
  pending: boolean
  error?: unknown
}>()
defineEmits<{ retry: []; searchAll: [] }>()
const selectedSource = defineModel<string>('source', { required: true })

// 响应式状态
const state = reactive({
  // 分集默认倒序，追番时最新一集排在最前
  descending: true,
})
const { descending } = toRefs(state)
const matches = computed(
  () => props.sources?.matches.filter(item => item.episodes.length) ?? []
)
const activeMatch = computed(
  () =>
    matches.value.find(item => item.source === selectedSource.value) ??
    matches.value[0]
)
const episodes = computed(() => {
  const items =
    activeMatch.value?.episodes.map((episode, index) => ({
      id: episode.id,
      index: episode.index ?? index + 1,
      title: episode.title,
      to: {
        path: `/play/${props.mediaId}`,
        query: {
          source: activeMatch.value!.source,
          seriesId: activeMatch.value!.seriesId,
          episodeId: episode.id,
        },
      },
    })) ?? []
  return state.descending ? [...items].reverse() : items
})
const sourceOptions = computed(() =>
  matches.value.map(match => ({ label: match.sourceName, value: match.source }))
)
const loading = computed(() => props.pending && !activeMatch.value)
const statusMessage = computed(() => {
  if (loading.value) return '正在查找播放资源…'
  if (props.error) return '播放资源加载失败，请重试。'
  if (!activeMatch.value)
    return props.sources?.message ?? '暂未找到播放资源，稍后再试。'
  return '选择一集开始观看'
})
</script>

<template>
  <div
    id="detail-episodes"
    role="region"
    aria-label="选集"
    :aria-busy="loading"
  >
    <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div class="flex min-h-11 flex-wrap items-center gap-3">
        <span class="text-xs text-ink-3">播放源</span>
        <UiSelect
          v-if="matches.length > 1"
          :model-value="activeMatch?.source ?? ''"
          :options="sourceOptions"
          placeholder="选择播放源"
          class="[&>button]:min-h-11"
          @update:model-value="selectedSource = $event"
        />
        <span
          v-else-if="activeMatch"
          class="text-sm text-ink-2"
          >{{ activeMatch.sourceName }}</span
        >
        <span
          v-else
          class="inline-flex items-center gap-2 text-xs text-ink-2"
          role="status"
        >
          <Icon
            v-if="loading"
            name="lucide:loader-circle"
            class="size-3.5 animate-spin text-brand motion-reduce:animate-none"
          />
          {{ statusMessage }}
        </span>
        <button
          v-if="activeMatch || !pending"
          type="button"
          :disabled="pending"
          class="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-xs text-brand hover:underline disabled:cursor-wait disabled:opacity-60"
          @click="$emit('retry')"
        >
          <Icon
            name="lucide:refresh-cw"
            :class="
              cn(
                'size-3.5',
                pending && 'animate-spin motion-reduce:animate-none'
              )
            "
          />
          {{ activeMatch ? '刷新当前源' : '重试' }}
        </button>
        <button
          type="button"
          :disabled="pending"
          title="搜索所有播放源，获取更多可用资源"
          class="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-xs text-brand hover:underline disabled:cursor-wait disabled:opacity-60"
          @click="$emit('searchAll')"
        >
          <Icon
            name="lucide:list-video"
            class="size-3.5"
          />
          获取全量
        </button>
      </div>
      <div class="flex items-center gap-4 text-xs text-ink-3">
        <span v-if="episodes.length">可播放 {{ episodes.length }} 集</span>
        <button
          v-if="episodes.length > 1"
          type="button"
          class="inline-flex min-h-11 cursor-pointer items-center gap-1 text-ink-2 transition-colors hover:text-ink"
          :aria-label="descending ? '切换为正序' : '切换为倒序'"
          @click="descending = !descending"
        >
          <Icon
            :name="
              descending
                ? 'lucide:arrow-down-narrow-wide'
                : 'lucide:arrow-up-narrow-wide'
            "
            class="size-3.5"
          />
          {{ descending ? '倒序' : '正序' }}
        </button>
      </div>
    </div>
    <p
      v-if="error && activeMatch"
      role="status"
      class="mt-2 text-xs text-ink-3"
    >
      获取资源失败，可继续使用当前播放源或重试。
    </p>
    <div
      v-if="episodes.length"
      class="mt-3 flex max-h-64 flex-wrap gap-2 overflow-y-auto p-0.5"
      aria-label="分集列表"
    >
      <NuxtLink
        v-for="episode in episodes"
        :key="episode.id"
        :to="episode.to"
        :aria-label="`播放 ${episode.title}`"
        :title="episode.title"
        :class="
          cn(
            'flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-surface-2 px-3 text-xs font-medium text-ink-2 tabular-nums transition-colors hover:bg-brand-soft hover:text-brand',
            episodes.length === 1 ? 'max-w-48 min-w-24' : 'w-14 sm:w-16'
          )
        "
      >
        <span class="truncate">{{
          episodes.length === 1 ? episode.title : episode.index
        }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
