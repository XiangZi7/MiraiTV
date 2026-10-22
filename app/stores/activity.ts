import type { AccountUser } from '~/types/account'
import type { MediaItem } from '~/types/media'
import type { HistoryRecord, HistorySave } from '~/types/web-api'
import type {
  ActivityCache,
  ActivityChange,
  ActivityResult,
  SearchRecord,
} from '~/types/activity'

const emptyCache = (): ActivityCache => ({
  searches: [],
  history: [],
  pending: [],
})
const cacheKey = (owner: number | null) =>
  `miraitv:activity:v1:${owner ?? 'guest'}`
const newest = <T extends { updatedAt: string }>(items: T[]) =>
  [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
const unique = <T extends { updatedAt: string }>(
  items: T[],
  key: (item: T) => string,
  limit: number
) =>
  newest(items)
    .filter(
      (item, index, all) =>
        all.findIndex(other => key(other) === key(item)) === index
    )
    .slice(0, limit)

function readCache(owner: number | null): ActivityCache {
  try {
    const value = JSON.parse(localStorage.getItem(cacheKey(owner)) ?? 'null')
    if (
      !value ||
      !Array.isArray(value.searches) ||
      !Array.isArray(value.history) ||
      !Array.isArray(value.pending)
    )
      return emptyCache()
    return {
      searches: unique<SearchRecord>(
        value.searches.filter(
          (item: SearchRecord) =>
            typeof item?.keyword === 'string' &&
            item.keyword.trim().length > 0 &&
            item.keyword.length <= 100 &&
            Number.isFinite(Date.parse(item.updatedAt))
        ),
        item => item.keyword,
        30
      ),
      history: unique<HistoryRecord>(
        value.history.filter(
          (item: HistoryRecord) =>
            typeof item?.media?.id === 'string' &&
            typeof item.media.title === 'string' &&
            item.media.tint &&
            Number.isFinite(item.progress) &&
            Number.isFinite(Date.parse(item.updatedAt))
        ),
        item => item.media.id,
        100
      ),
      pending: value.pending.filter(
        (item: ActivityCache['pending'][number]) =>
          typeof item?.id === 'string' &&
          [
            'search',
            'history',
            'remove-search',
            'remove-history',
            'clear-searches',
            'clear-history',
          ].includes(item.change?.type)
      ),
    }
  } catch {
    return emptyCache()
  }
}

function historyChange(record: HistoryRecord): ActivityChange {
  return {
    type: 'history',
    history: {
      mediaId: record.media.id,
      title: record.media.title.slice(0, 200),
      poster: record.media.poster ?? null,
      episodeId: record.episodeId,
      episodeLabel: record.episodeLabel,
      episodeNumber: record.episodeNumber,
      progress: record.progress,
      positionSeconds: record.positionSeconds,
      durationSeconds: record.durationSeconds,
      updatedAt: record.updatedAt,
    },
  }
}

export const useActivityStore = defineStore('activity', () => {
  const api = useApi()
  const user = useState<AccountUser | null>('session-user', () => null)
  const state = reactive({
    owner: null as number | null,
    ready: false,
    syncing: false,
    error: '',
    cache: emptyCache(),
  })
  let generation = 0
  let flight: Promise<void> | undefined
  const searches = computed(() => state.cache.searches)
  const history = computed(() => state.cache.history)

  function persist() {
    try {
      localStorage.setItem(cacheKey(state.owner), JSON.stringify(state.cache))
      return true
    } catch {
      // 禁用存储/空间不足时，当前页面仍可正常搜索和播放。
      return false
    }
  }

  function enqueue(change: ActivityChange) {
    if (state.owner === null) return
    const searchChange = (item: ActivityChange) =>
      ['search', 'remove-search', 'clear-searches'].includes(item.type)
    const key = (item: ActivityChange) =>
      item.type === 'search'
        ? item.search.keyword
        : item.type === 'remove-search'
          ? item.keyword
          : item.type === 'history'
            ? item.history.mediaId
            : item.type === 'remove-history'
              ? item.mediaId
              : undefined
    state.cache.pending = state.cache.pending.filter(item => {
      if (searchChange(item.change) !== searchChange(change)) return true
      if (change.type.startsWith('clear-')) return false
      return key(item.change) !== key(change)
    })
    state.cache.pending.push({ id: crypto.randomUUID(), change })
  }

  function apply(result: ActivityResult, change: ActivityChange) {
    if (change.type === 'search') {
      result.searches = unique(
        [change.search, ...result.searches],
        item => item.keyword,
        30
      )
    } else if (change.type === 'history') {
      const value = change.history
      const cached = state.cache.history.find(
        item => item.media.id === value.mediaId
      )
      const record: HistoryRecord = {
        id: cached?.id ?? `local:${value.mediaId}`,
        media: cached?.media ?? {
          id: value.mediaId,
          title: value.title,
          poster: value.poster,
          tint: { from: '#7a6f9f', to: '#110d18' },
          year: null,
          kind: null,
          rating: null,
          genres: [],
        },
        episodeId: value.episodeId ?? null,
        episodeLabel: value.episodeLabel ?? null,
        episodeNumber: value.episodeNumber ?? null,
        progress: value.progress ?? 0,
        positionSeconds: value.positionSeconds ?? null,
        durationSeconds: value.durationSeconds ?? null,
        updatedAt: value.updatedAt,
        watchedAt: new Date(value.updatedAt).toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Shanghai',
        }),
      }
      result.history = unique(
        [record, ...result.history],
        item => item.media.id,
        100
      )
    } else if (change.type === 'remove-search') {
      result.searches = result.searches.filter(
        item => item.keyword !== change.keyword
      )
    } else if (change.type === 'remove-history') {
      result.history = result.history.filter(
        item => item.media.id !== change.mediaId
      )
    } else if (change.type === 'clear-searches') result.searches = []
    else result.history = []
  }

  function changeAccount(owner: number | null) {
    if (state.ready && state.owner === owner) return
    if (state.ready) persist()
    generation += 1
    flight = undefined
    state.owner = owner
    state.cache = readCache(owner)
    state.ready = true
    state.syncing = false
    state.error = ''
    if (owner !== null) {
      const guest = readCache(null)
      for (const search of guest.searches) {
        const saved = state.cache.searches.find(
          item => item.keyword === search.keyword
        )
        if (
          !saved ||
          Date.parse(search.updatedAt) > Date.parse(saved.updatedAt)
        )
          enqueue({ type: 'search', search })
      }
      for (const record of guest.history) {
        const saved = state.cache.history.find(
          item => item.media.id === record.media.id
        )
        if (
          !saved ||
          Date.parse(record.updatedAt) > Date.parse(saved.updatedAt)
        )
          enqueue(historyChange(record))
      }
      state.cache.searches = unique(
        [...state.cache.searches, ...guest.searches],
        item => item.keyword,
        30
      )
      state.cache.history = unique(
        [...state.cache.history, ...guest.history],
        item => item.media.id,
        100
      )
      // 先持久化到目标账号再移除游客数据，失败的上传仍可在下次重试。
      if (persist()) {
        try {
          localStorage.removeItem(cacheKey(null))
        } catch {
          /* 存储不可用 */
        }
      }
    }
  }

  function sync(): Promise<void> {
    if (!state.ready || state.owner === null || user.value?.id !== state.owner)
      return Promise.resolve()
    if (flight) return flight
    const version = generation
    state.syncing = true
    state.error = ''
    const request = async () => {
      try {
        do {
          const batch = state.cache.pending.slice(0, 500)
          const result = await api.syncActivity(batch.map(item => item.change))
          if (version !== generation) return
          const ids = new Set(batch.map(item => item.id))
          const pending = state.cache.pending.filter(item => !ids.has(item.id))
          for (const item of result.history) {
            const cached = state.cache.history.find(
              record => record.media.id === item.media.id
            )
            if (cached)
              item.media = {
                ...cached.media,
                ...item.media,
                kind: item.media.kind ?? cached.media.kind,
                year: item.media.year ?? cached.media.year,
                rating: item.media.rating ?? cached.media.rating,
              }
          }
          for (const item of pending) apply(result, item.change)
          state.cache = { ...result, pending }
          persist()
        } while (state.cache.pending.length)
      } catch (error) {
        if (version === generation) state.error = apiErrorMessage(error)
      } finally {
        if (version === generation) {
          state.syncing = false
          flight = undefined
        }
      }
    }
    flight = request()
    return flight
  }

  function commit(change: ActivityChange) {
    if (!state.ready) changeAccount(user.value?.id ?? null)
    apply(state.cache, change)
    enqueue(change)
    persist()
    void sync()
  }

  function recordSearch(value: string) {
    const keyword = value.trim().slice(0, 100)
    const latest = state.cache.searches[0]
    if (
      latest?.keyword === keyword &&
      Date.now() - Date.parse(latest.updatedAt) < 1000
    )
      return
    if (keyword)
      commit({
        type: 'search',
        search: { keyword, updatedAt: new Date().toISOString() },
      })
  }

  function recordHistory(value: HistorySave, media: MediaItem) {
    if (!state.ready) changeAccount(user.value?.id ?? null)
    // 保留本地作品快照，游客离线时同样能够显示和续播。
    const previous = state.cache.history.find(
      item => item.media.id === value.mediaId
    )
    const updatedAt = new Date().toISOString()
    const record: HistoryRecord = {
      ...value,
      id: previous?.id ?? `local:${value.mediaId}`,
      media,
      episodeId: value.episodeId ?? null,
      episodeLabel: value.episodeLabel ?? null,
      episodeNumber: value.episodeNumber ?? null,
      progress: value.progress ?? 0,
      positionSeconds: value.positionSeconds ?? null,
      durationSeconds: value.durationSeconds ?? null,
      updatedAt,
      watchedAt: new Date().toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Shanghai',
      }),
    }
    state.cache.history = unique(
      [record, ...state.cache.history],
      item => item.media.id,
      100
    )
    commit(historyChange(record))
  }

  return {
    ...toRefs(state),
    searches,
    history,
    changeAccount,
    sync,
    recordSearch,
    recordHistory,
    removeSearch: (keyword: string) =>
      commit({ type: 'remove-search', keyword }),
    clearSearches: () => commit({ type: 'clear-searches' }),
    removeHistory: (mediaId: string) =>
      commit({ type: 'remove-history', mediaId }),
    clearHistory: () => commit({ type: 'clear-history' }),
  }
})
