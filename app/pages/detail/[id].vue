<script setup lang="ts">
const route = useRoute()
const api = useApi()
const id = computed(() => String(route.params.id))
const favorite = useFavorite(id)
const { data, error, status, refresh } = await usePageData(
  () => `detail:${id.value}`,
  () => api.detail(id.value)
)
if (error.value?.statusCode === 404)
  throw createError({ statusCode: 404, statusMessage: '作品不存在' })
const media = computed(() => data.value?.media)
const selectedSource = shallowRef('')
const binding = computed(() =>
  typeof route.query.source === 'string' &&
  typeof route.query.seriesId === 'string'
    ? { source: route.query.source, seriesId: route.query.seriesId }
    : undefined
)
watch(binding, value => (selectedSource.value = value?.source ?? ''), {
  immediate: true,
})
const {
  data: sourceData,
  status: sourceStatus,
  error: sourceError,
  refresh: reloadSources,
  searchAll,
} = usePlaybackSources(id, { binding, context: 'detail' })
const selectedMatch = computed(() => {
  const matches = sourceData.value?.matches.filter(
    match => match.episodes.length
  )
  return (
    matches?.find(match => match.source === selectedSource.value) ??
    matches?.[0]
  )
})
const playTo = computed(() =>
  selectedMatch.value?.episodes[0]
    ? {
        path: `/play/${id.value}`,
        query: {
          source: selectedMatch.value.source,
          seriesId: selectedMatch.value.seriesId,
          episodeId: selectedMatch.value.episodes[0].id,
        },
      }
    : undefined
)
function searchAllSources() {
  selectedSource.value = selectedMatch.value?.source ?? selectedSource.value
  void searchAll()
}
function refreshSources() {
  void reloadSources(
    selectedMatch.value
      ? {
          source: selectedMatch.value.source,
          seriesId: selectedMatch.value.seriesId,
        }
      : undefined
  )
}
const { collected, saving, actionError, toggle: toggleCollection } = favorite
await favorite.initial
const { siteUrl } = useSeo(() => ({
  title: media.value?.title ?? '作品详情',
  description: media.value ? mediaDescription(media.value) : null,
  image: media.value?.poster,
  noindex: !media.value,
  // 有分集的按剧集声明，单片按电影声明
  type:
    media.value && media.value.kind !== 'movie' && media.value.episodes !== 1
      ? 'video.tv_show'
      : 'video.movie',
}))
useStructuredData(() =>
  data.value
    ? [
        mediaSchema(data.value, siteUrl),
        breadcrumbSchema(
          [
            { name: '首页', path: '/' },
            { name: data.value.media.title, path: `/detail/${id.value}` },
          ],
          siteUrl
        ),
      ]
    : []
)
</script>

<template>
  <div class="pb-4">
    <UiRequestState
      class="container-page"
      :pending="status === 'pending'"
      :error="error"
      :partial="data?.partial"
      @retry="refresh"
    />
    <template v-if="media && data">
      <section class="relative isolate -mt-14 overflow-hidden pt-14">
        <img
          v-if="media.backdrop || media.poster"
          :src="mediaImageUrl(media.backdrop ?? media.poster ?? '', 1080)"
          :srcset="mediaImageSrcset(media.backdrop ?? media.poster ?? '')"
          sizes="100vw"
          alt=""
          loading="eager"
          decoding="async"
          class="absolute inset-0 size-full object-cover opacity-55"
        />
        <div
          v-else
          class="absolute inset-0"
          :style="tintToBackdrop(media.tint)"
        />
        <div
          class="absolute inset-0 bg-linear-to-r from-base via-base/85 to-base/65"
        />
        <div
          class="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-base to-transparent"
        />
        <div class="relative container-page py-4 sm:py-6">
          <UiButton
            to="/"
            icon="lucide:arrow-left"
            variant="ghost"
            size="sm"
            class="min-h-11 cursor-pointer px-0"
          >
            返回首页
          </UiButton>
          <div class="mt-3 max-w-2xl">
            <MediaDetailHeader
              :media="media"
              :collected="collected"
              :saving="saving"
              :action-error="actionError"
              :play-to="playTo"
              :episode-count="selectedMatch?.episodes.length"
              :source-pending="
                !selectedMatch &&
                (sourceStatus === 'pending' || sourceStatus === 'idle')
              "
              @collect="toggleCollection"
            />
          </div>
        </div>
      </section>
      <MediaDetailInfo
        v-model:source="selectedSource"
        :key="media.id"
        :detail="data"
        :sources="sourceData"
        :source-pending="sourceStatus === 'idle' || sourceStatus === 'pending'"
        :source-error="sourceError"
        @retry-sources="refreshSources"
        @search-all-sources="searchAllSources"
      />
    </template>
  </div>
</template>
