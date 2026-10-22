import type {
  FavoriteItem,
  HistoryRecord,
  HistoryPage,
  WatchlistResult,
} from '~/types/web-api'

export function useLibrary(kind: 'watchlist' | 'history', pageSize = 24) {
  const api = useApi()
  const activity = useActivityStore()
  const { user } = useAuth()
  const request = (page: number): Promise<WatchlistResult | HistoryPage> =>
    kind === 'watchlist'
      ? api.watchlist(page, pageSize)
      : user.value
        ? api.history(page, pageSize)
        : Promise.resolve({
            items: [],
            total: 0,
            page,
            pageSize,
            partial: false,
          })
  const key = computed(
    () => `private:${kind}:${user.value?.id ?? 'guest'}:${pageSize}`
  )
  const result = useAsyncData(key, () => request(1))
  // 响应式状态
  const state = reactive({
    // 后续分页的条目
    extra: [] as (FavoriteItem | HistoryRecord)[],
    // 已加载的页码
    page: 1,
    // 翻页请求状态
    loadingMore: false,
    // 操作失败提示
    actionError: '',
  })
  const items = computed(() => {
    const loaded = [...(result.data.value?.items ?? []), ...state.extra]
    if (kind !== 'history') return loaded
    const cleared = activity.cache.pending.some(
      item => item.change.type === 'clear-history'
    )
    const removed = new Set(
      activity.cache.pending.flatMap(item =>
        item.change.type === 'remove-history' ? [item.change.mediaId] : []
      )
    )
    const records = [
      ...activity.history,
      ...(cleared ? [] : (loaded as HistoryRecord[])),
    ]
      .filter(item => !removed.has(item.media.id))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    return records
      .filter(
        (item, index) =>
          records.findIndex(other => other.media.id === item.media.id) === index
      )
      .slice(0, state.page * pageSize)
  })
  const hasMore = computed(
    () =>
      state.page * pageSize <
      Math.max(
        result.data.value?.total ?? 0,
        kind === 'history' ? activity.history.length : 0
      )
  )
  watch(
    key,
    () => {
      state.extra = []
      state.page = 1
      state.loadingMore = false
      state.actionError = ''
    },
    { flush: 'sync' }
  )
  async function loadMore() {
    if (state.loadingMore || !hasMore.value) return
    state.loadingMore = true
    state.actionError = ''
    const requestedKey = key.value
    try {
      const page = await request(state.page + 1)
      if (key.value !== requestedKey) return
      state.extra.push(...page.items)
      state.page += 1
    } catch (error) {
      if (key.value === requestedKey) state.actionError = apiErrorMessage(error)
    } finally {
      if (key.value === requestedKey) state.loadingMore = false
    }
  }
  async function refresh() {
    state.extra = []
    state.page = 1
    await result.refresh()
  }
  return {
    ...result,
    initial: result,
    items,
    hasMore,
    ...toRefs(state),
    loadMore,
    refresh,
  }
}
