import type { MaybeRefOrGetter } from 'vue'
import type { PlaybackSources } from '~/types/web-api'

interface SourceBinding {
  source: string
  seriesId: string
}

interface PlaybackSourcesOptions {
  binding?: MaybeRefOrGetter<SourceBinding | undefined>
  context: 'detail' | 'playback'
}

/** 已知来源时直接取分集，只有手动获取全量才搜索其他源。 */
export function usePlaybackSources(
  mediaId: MaybeRefOrGetter<string>,
  options: PlaybackSourcesOptions
) {
  const api = useApi()
  const app = useNuxtApp()
  const id = computed(() => toValue(mediaId))
  const binding = computed(() =>
    options.binding ? toValue(options.binding) : undefined
  )
  const baseKey = computed(() => `sources:${id.value}`)
  const searchingAll = shallowRef(false)
  const refreshBinding = shallowRef<SourceBinding>()
  const request = useAsyncData(
    () => `${baseKey.value}:${options.context}`,
    async (_app, { signal }) => {
      const key = baseKey.value
      const result = await api.sources(
        id.value,
        signal,
        searchingAll.value
          ? undefined
          : (refreshBinding.value ?? binding.value),
        searchingAll.value
      )
      if (!signal.aborted) app.payload.data[key] = result
      return result
    },
    {
      server: false,
      lazy: true,
      getCachedData: (key, app, context) => {
        if (context.cause === 'refresh:manual') return undefined
        return [app.payload.data[baseKey.value], app.payload.data[key]].find(
          (cached: PlaybackSources | undefined): cached is PlaybackSources =>
            !!cached?.available &&
            cached.mediaId === id.value &&
            (!binding.value ||
              cached.matches.some(
                match =>
                  match.source === binding.value!.source &&
                  match.seriesId === binding.value!.seriesId
              ))
        )
      },
    }
  )

  async function refresh(target?: SourceBinding) {
    if (request.status.value === 'pending') return
    refreshBinding.value = target
    try {
      await request.refresh()
    } finally {
      refreshBinding.value = undefined
    }
  }

  // 同一作品的来源参数变化时，仅在缓存缺少该来源时重取详情。
  watch(
    () => [binding.value?.source, binding.value?.seriesId],
    ([source, seriesId], previous) => {
      if (source === previous[0] && seriesId === previous[1]) return
      if (
        source &&
        seriesId &&
        request.data.value?.mediaId === id.value &&
        !request.data.value.matches.some(
          match => match.source === source && match.seriesId === seriesId
        )
      )
        void request.refresh()
    }
  )

  async function searchAll() {
    if (request.status.value === 'pending') return
    const current = request.data.value
    searchingAll.value = true
    try {
      await request.refresh()
      if (current?.mediaId !== id.value || !current.available) return
      // 全量搜索失败或部分源超时，仍保留已经取得的可播放分集。
      if (request.error.value) request.data.value = current
      else if (request.data.value) {
        const matches = request.data.value.matches
        request.data.value = {
          ...request.data.value,
          available: true,
          message: null,
          matches: [
            ...current.matches.map(
              cached =>
                matches.find(
                  match =>
                    match.source === cached.source &&
                    match.seriesId === cached.seriesId
                ) ?? cached
            ),
            ...matches.filter(
              match =>
                !current.matches.some(
                  cached =>
                    cached.source === match.source &&
                    cached.seriesId === match.seriesId
                )
            ),
          ],
        }
      }
      app.payload.data[baseKey.value] = request.data.value
    } finally {
      searchingAll.value = false
    }
  }

  return {
    data: request.data,
    status: request.status,
    error: request.error,
    refresh,
    searchAll,
  }
}
