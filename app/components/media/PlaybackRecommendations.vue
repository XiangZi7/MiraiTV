<script setup lang="ts">
import type { MediaItem } from '~/types/media'

const props = defineProps<{ media: MediaItem; related: MediaItem[] }>()
const api = useApi()
function candidates(items: MediaItem[]) {
  const seen = new Set([props.media.id])
  return items
    .filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .slice(0, 6)
}
const relatedItems = computed(() => candidates(props.related))
// 关联作品为空时再异步查找同类高分作品，不阻塞视频与播放源加载。
const {
  data: fallback,
  status,
  error,
  refresh,
} = usePageData<MediaItem[]>(
  () =>
    `playback-recommendations:${props.media.id}:${Boolean(relatedItems.value.length)}`,
  async (_app, context) => {
    if (relatedItems.value.length) return []
    const result = await api.catalog(
      {
        kind: props.media.kind ?? undefined,
        sort: 'rating',
        pageSize: 12,
      },
      context?.signal
    )
    return candidates(result.items)
  },
  { server: false, lazy: true }
)
const items = computed(() =>
  relatedItems.value.length
    ? relatedItems.value
    : candidates(fallback.value ?? [])
)
const browseLink = computed(() => {
  if (props.media.kind === 'anime') return '/anime'
  if (props.media.kind === 'series' || props.media.kind === 'variety')
    return '/series'
  return '/movies'
})
</script>

<template>
  <div
    class="glass-surface p-4 sm:p-5"
    data-playback-recommendations
  >
    <MediaRecommendations
      v-if="items.length"
      :items="items"
      :title="
        relatedItems.length ? '相关推荐' : media.kind ? '同类推荐' : '为你推荐'
      "
    />
    <section
      v-else
      aria-label="相关推荐"
    >
      <h2 class="mb-4 font-semibold text-base">相关推荐</h2>
      <UiRequestState
        :pending="status === 'pending' || status === 'idle'"
        :error="error"
        @retry="refresh"
      />
      <template v-if="status === 'success'">
        <p class="text-sm text-ink-3">暂时没有可用的推荐。</p>
        <UiTextLink
          :to="browseLink"
          class="mt-4"
          >发现更多作品</UiTextLink
        >
      </template>
    </section>
  </div>
</template>
