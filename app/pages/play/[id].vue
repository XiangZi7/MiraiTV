<script setup lang="ts">
const site = useSite()
const route = useRoute()
const player = usePlayback(() => String(route.params.id))
const playerRef = useTemplateRef<{ play: () => Promise<void> }>('playerRef')
const {
  detail,
  history,
  sources,
  playback,
  match,
  episode,
  line,
  media,
  episodes,
  currentIndex,
  resumeSeconds,
  historyError,
  pending: playerPending,
  requestError: playerError,
  unavailable: unavailableMessage,
  retry: retryPlayer,
  recoverPlayback,
  playbackSucceeded,
  recoveryMessage,
  saveProgress,
  selectEpisode,
  selectSource,
  selectLine,
} = player
const {
  data: detailData,
  error: detailError,
  status: detailStatus,
  refresh: refreshDetail,
} = detail
const {
  data: sourceData,
  status: sourceStatus,
  error: sourceError,
  searchAll,
} = sources
const { data: playbackData, status: playbackStatus } = playback
const { error: resumeError } = history
await Promise.all([detail, history])
const episodeLabel = computed(() => episode.value?.title ?? '')
const related = computed(() => detailData.value?.related ?? [])
const sourceOptions = computed(() =>
  (sourceData.value?.matches ?? []).map(item => ({
    label: item.sourceName,
    value: item.source,
  }))
)
const lineOptions = computed(() =>
  (episode.value?.lines ?? []).map(item => ({
    label: item.name,
    value: item.id,
  }))
)
// 再次点选当前集时直接继续播放，其他集由新资源加载后自动播放。
function chooseEpisode(index: number) {
  if (index === currentIndex.value + 1) void playerRef.value?.play()
  else selectEpisode(index)
}
// 同一部作品的每一集都会生成一个播放页，内容与详情页高度重复：
// 统一不收录，canonical 指回详情页，权重集中在那一页。
useSeo(() => ({
  title: `${media.value?.title ?? '播放'} · 正在播放`,
  description: media.value
    ? mediaDescription(media.value, site.siteName)
    : null,
  image: media.value?.poster,
  noindex: true,
  canonicalPath: `/detail/${route.params.id}`,
}))
</script>

<template>
  <div class="container-page py-4 sm:py-6">
    <UiRequestState
      v-if="!media"
      :pending="detailStatus === 'pending'"
      :error="detailError"
      @retry="refreshDetail"
    />
    <template v-if="media">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-7">
        <div class="max-w-5xl min-w-0">
          <MediaPlayer
            ref="playerRef"
            :key="`${media.id}:${match?.source}:${match?.seriesId}:${episode?.id}`"
            :media="media"
            :source-episode="episode"
            :source-name="match?.sourceName"
            :series-id="match?.seriesId"
            :lines="lineOptions"
            :line="line"
            :episode-label="episodeLabel"
            :playback="playbackStatus === 'success' ? playbackData : null"
            :request-pending="playerPending"
            :request-error="playerError"
            :recovery-message="recoveryMessage"
            :unavailable-message="unavailableMessage"
            :resume-seconds="resumeSeconds"
            :has-prev="currentIndex > 0"
            :has-next="currentIndex >= 0 && currentIndex < episodes.length - 1"
            @next="selectEpisode(currentIndex + 2)"
            @prev="selectEpisode(currentIndex)"
            @progress="saveProgress"
            @retry="retryPlayer"
            @failure="recoverPlayback"
            @started="playbackSucceeded"
            @update:line="selectLine"
          />
          <p
            v-if="historyError"
            role="alert"
            class="mt-2 text-xs text-danger"
          >
            观看进度同步失败：{{ historyError }}
          </p>
          <UiRequestState
            :error="resumeError"
            @retry="history.refresh"
          />
          <MediaPlaybackInfo
            :media="media"
            :episode-label="episodeLabel"
            :binding="match"
            class="mt-5"
          >
            <template #episodes>
              <div
                v-if="sourceOptions.length || episodes.length"
                class="mt-5 border-t border-line/60 pt-4"
              >
                <MediaSourceBar
                  v-if="sourceOptions.length"
                  :sources="sourceOptions"
                  :lines="lineOptions"
                  :source="match?.source ?? ''"
                  :line="line ?? ''"
                  :pending="playerPending"
                  :sources-pending="sourceStatus === 'pending'"
                  :error="sourceError"
                  @update:source="selectSource"
                  @update:line="selectLine"
                  @refresh="retryPlayer"
                  @search-all="searchAll"
                />
                <MediaEpisodeList
                  v-if="episodes.length"
                  :episodes="episodes"
                  :current="currentIndex + 1"
                  class="mt-2 border-t-0"
                  @select="chooseEpisode"
                />
              </div>
            </template>
          </MediaPlaybackInfo>
        </div>
        <aside
          class="min-w-0 lg:sticky lg:top-24 lg:self-start"
          aria-label="相关推荐"
        >
          <MediaPlaybackRecommendations
            :media="media"
            :related="related"
          />
        </aside>
      </div>
    </template>
  </div>
</template>
