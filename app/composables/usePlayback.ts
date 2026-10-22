import type { MaybeRefOrGetter } from 'vue'
import type { Episode } from '~/types/media'
import type { HistoryRecord, HistorySave } from '~/types/web-api'
import type { AnalyticsEvents } from '~/types/analytics'
import {
  matchingSourceEpisode,
  playbackCandidates,
} from '~/utils/playback-recovery'

export function usePlayback(mediaId: MaybeRefOrGetter<string>) {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()
  const activity = useActivityStore()
  const { track } = useAnalytics()
  const { user, loggedIn } = useAuth()
  const id = computed(() => toValue(mediaId))
  const detail = usePageData(
    () => `detail:${id.value}`,
    () => api.detail(id.value)
  )
  const history = useAsyncData<HistoryRecord | null>(
    () => `private:resume:${user.value?.id ?? 'guest'}:${id.value}`,
    () =>
      loggedIn.value
        ? api.mediaHistory(id.value)
        : Promise.resolve(
            activity.history.find(item => item.media.id === id.value) ?? null
          )
  )
  watch(
    () => [activity.ready, id.value, activity.owner],
    () => {
      const cached = activity.history.find(item => item.media.id === id.value)
      if (
        cached &&
        (!history.data.value ||
          Date.parse(cached.updatedAt) >
            Date.parse(history.data.value.updatedAt))
      )
        history.data.value = cached
    }
  )
  // 源站匹配较慢，浏览器显示加载态；SSR 先展示作品信息。
  const binding = computed(() =>
    typeof route.query.source === 'string' &&
    typeof route.query.seriesId === 'string'
      ? { source: route.query.source, seriesId: route.query.seriesId }
      : undefined
  )
  const sources = usePlaybackSources(id, { binding, context: 'playback' })
  const match = computed(() => {
    const matches = sources.data.value?.matches ?? []
    if (route.query.source)
      return matches.find(
        item =>
          item.source === route.query.source &&
          (!route.query.seriesId || item.seriesId === route.query.seriesId)
      )
    return (
      matches.find(item => item.source === route.query.source) ??
      matches.find(
        item =>
          history.data.value?.episodeId &&
          item.episodes.some(
            episode => episode.id === history.data.value?.episodeId
          )
      ) ??
      matches[0]
    )
  })
  const episode = computed(
    () =>
      match.value?.episodes.find(item => item.id === route.query.episodeId) ??
      match.value?.episodes.find(
        item => item.id === history.data.value?.episodeId
      ) ??
      match.value?.episodes[0]
  )
  const line = computed(
    () =>
      episode.value?.lines.find(item => item.id === route.query.line)?.id ??
      episode.value?.lines[0]?.id
  )
  const playback = useAsyncData(
    () =>
      `playback:${id.value}:${match.value?.source}:${match.value?.seriesId}:${episode.value?.id}:${line.value}`,
    (_app, { signal }) => {
      if (!match.value || !episode.value) return Promise.resolve(null)
      return api.play(
        id.value,
        {
          source: match.value.source,
          seriesId: match.value.seriesId,
          episodeId: episode.value.id,
          line: line.value,
        },
        signal
      )
    },
    { server: false }
  )
  const media = computed(() => detail.data.value?.media)
  const episodes = computed<Episode[]>(() =>
    (match.value?.episodes ?? []).map((item, index) => ({
      id: item.id,
      index: index + 1,
      title: item.title,
      duration: item.durationSeconds
        ? `${Math.round(item.durationSeconds / 60)}m`
        : null,
      tint: media.value?.tint ?? { from: '#8f6fbf', to: '#1d172c' },
    }))
  )
  const currentIndex = computed(
    () =>
      match.value?.episodes.findIndex(item => item.id === episode.value?.id) ??
      -1
  )
  const resumeSeconds = computed(() =>
    history.data.value?.episodeId === episode.value?.id
      ? (history.data.value?.positionSeconds ?? 0)
      : 0
  )
  const waiting = (status: string) => status === 'idle' || status === 'pending'
  /** 源站匹配或播放地址仍在请求中，播放器显示加载态 */
  const pending = computed(
    () =>
      recovery.recovering.value ||
      (!match.value && waiting(sources.status.value)) ||
      (!!episode.value && waiting(playback.status.value))
  )
  /** 取址失败的提示文案，交给播放器内部展示 */
  const requestError = computed(() =>
    recovery.recovering.value
      ? ''
      : recovery.recoveryMessage.value ||
        (sources.error.value && !match.value
          ? apiErrorMessage(sources.error.value)
          : playback.error.value
            ? apiErrorMessage(playback.error.value)
            : '')
  )
  /** 源站有响应但没有可播放的分集 */
  const unavailable = computed(() =>
    sources.data.value && !match.value
      ? (sources.data.value.message ?? '当前播放源暂无可用分集，请切换播放源。')
      : ''
  )
  /** 先重试失败的那一环，匹配不到分集时重新找源 */
  function retry() {
    recovery.reset()
    if (!match.value) void sources.refresh()
    else void playback.refresh()
  }
  // 响应式状态
  const state = reactive({
    // 观看进度同步提示
    historyError: '',
  })
  const recovery = usePlaybackRecovery({
    current: () =>
      match.value && episode.value
        ? {
            source: match.value.source,
            seriesId: match.value.seriesId,
            episodeId: episode.value.id,
            line: line.value,
          }
        : undefined,
    candidates: () =>
      match.value && episode.value
        ? playbackCandidates(
            sources.data.value?.matches ?? [],
            match.value,
            episode.value
          )
        : [],
    retry: () => playback.refresh(),
    failed: () => !!playback.error.value,
    select: target => router.replace({ query: { ...target } }),
  })
  watch(playback.error, error => {
    if (error) recovery.recover()
  })
  watch(id, () => recovery.reset())
  let lastSave = 0
  async function saveProgress(
    position: number,
    duration: number,
    force: boolean,
    played: Pick<
      HistorySave,
      'mediaId' | 'episodeId' | 'episodeLabel' | 'episodeNumber'
    >
  ) {
    if (
      !played.episodeId ||
      !media.value ||
      media.value.id !== played.mediaId ||
      !Number.isFinite(position) ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      position <= 0 ||
      (!force && Date.now() - lastSave < 15_000)
    )
      return
    lastSave = Date.now()
    try {
      activity.recordHistory(
        {
          ...played,
          progress: Math.min(100, (position / duration) * 100),
          positionSeconds: position,
          durationSeconds: duration,
        },
        media.value!
      )
      await activity.sync()
      state.historyError = activity.error
      clearNuxtData(
        key =>
          key.startsWith('private:history:') || key.startsWith('private:home:')
      )
    } catch (error) {
      state.historyError = apiErrorMessage(error)
    }
  }
  watch(
    () => [id.value, episode.value?.id],
    () => {
      lastSave = 0
    }
  )
  function reportSelection(
    type: AnalyticsEvents['playback_select']['selection_type'],
    value: string,
    label: string
  ) {
    const item = media.value
    const source = match.value
    if (!item || !source) return
    track('playback_select', {
      media_id: item.id,
      media_title: item.title,
      media_type: item.kind,
      source_id: source.source,
      source_name: source.sourceName,
      series_id: source.seriesId,
      episode_id: episode.value?.id,
      episode_title: episode.value?.title,
      episode_number: episode.value?.index,
      line_id: line.value,
      selection_type: type,
      selected_value: value,
      selected_label: label,
    })
  }
  function selectEpisode(index: number) {
    const target = match.value?.episodes[index - 1]
    if (target) {
      recovery.reset()
      if (target.id !== episode.value?.id)
        reportSelection('episode', target.id, target.title)
      void router.replace({
        query: {
          source: match.value?.source,
          seriesId: match.value?.seriesId,
          episodeId: target.id,
        },
      })
    }
  }
  function selectSource(source: string) {
    const target = sources.data.value?.matches.find(
      item => item.source === source
    )
    const targetEpisode =
      target && episode.value
        ? matchingSourceEpisode(
            episode.value,
            target,
            match.value?.episodes.length === 1
          )
        : target?.episodes[0]
    if (targetEpisode) {
      recovery.reset()
      if (target?.source !== match.value?.source)
        reportSelection('source', source, target?.sourceName ?? source)
      void router.replace({
        query: {
          source,
          seriesId: target?.seriesId,
          episodeId: targetEpisode.id,
        },
      })
    }
  }
  function selectLine(value: string) {
    const target = episode.value?.lines.find(item => item.id === value)
    if (!target) return
    recovery.reset()
    if (value !== line.value) reportSelection('line', value, target.name)
    void router.replace({
      query: {
        source: match.value?.source,
        seriesId: match.value?.seriesId,
        episodeId: episode.value?.id,
        line: value,
      },
    })
  }
  return {
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
    pending,
    requestError,
    unavailable,
    ...toRefs(state),
    retry,
    recoverPlayback: recovery.recover,
    playbackSucceeded: recovery.succeeded,
    recoveryMessage: recovery.recoveryMessage,
    saveProgress,
    selectEpisode,
    selectSource,
    selectLine,
  }
}
