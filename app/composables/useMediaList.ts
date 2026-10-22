import type { MaybeRefOrGetter } from 'vue'
import type { CatalogQuery, MediaPage } from '~/types/web-api'
import type { MediaItem } from '~/types/media'

/** 首屏交给 Nuxt payload；继续翻页保留游标，筛选变化取消旧请求。 */
export function useMediaList(
  query: MaybeRefOrGetter<CatalogQuery>,
  keyword?: MaybeRefOrGetter<string>
) {
  const api = useApi()
  const key = computed(
    () =>
      `media-list:${JSON.stringify(toValue(query))}:${keyword ? toValue(keyword) : ''}`
  )
  const empty = (): MediaPage => ({
    items: [],
    total: null,
    hasMore: false,
    nextCursor: null,
    partial: false,
  })
  const fetchPage = (cursor?: string, signal?: AbortSignal) => {
    const filters = { ...toValue(query), cursor }
    return keyword
      ? toValue(keyword)
        ? api.search(toValue(keyword), filters, signal)
        : Promise.resolve(empty())
      : api.catalog(filters, signal)
  }
  const result = useAsyncData(
    key,
    (_app, { signal }) => fetchPage(undefined, signal),
    { default: empty, getCachedData: cachedPayload<MediaPage>() }
  )
  // 响应式状态
  const state = reactive({
    // 已追加的分页结果
    pages: [] as MediaPage[],
    // 翻页加载状态
    loadingMore: false,
    // 翻页错误提示
    moreError: '',
  })
  let controller: AbortController | undefined
  let requestVersion = 0
  watch(
    key,
    () => {
      requestVersion += 1
      controller?.abort()
      state.pages = []
      state.loadingMore = false
      state.moreError = ''
    },
    { flush: 'sync' }
  )
  onScopeDispose(() => controller?.abort())
  const lastPage = computed(() => state.pages.at(-1) ?? result.data.value)
  const items = computed(() => {
    const unique = new Map<string, MediaItem>()
    for (const page of [result.data.value, ...state.pages])
      for (const item of page?.items ?? []) unique.set(item.id, item)
    return [...unique.values()]
  })
  async function loadMore() {
    if (
      state.loadingMore ||
      result.status.value === 'pending' ||
      !lastPage.value?.hasMore ||
      !lastPage.value.nextCursor
    )
      return
    const requestKey = key.value
    const version = requestVersion
    const cursor = lastPage.value.nextCursor
    const seenCursors = new Set([
      result.data.value?.nextCursor,
      ...state.pages.map(page => page.nextCursor),
    ])
    controller = new AbortController()
    state.loadingMore = true
    state.moreError = ''
    try {
      const page = await fetchPage(cursor, controller.signal)
      if (key.value === requestKey && version === requestVersion) {
        // 防止上游返回重复游标，自动滚动时无限请求同一页。
        if (page.hasMore && page.nextCursor && seenCursors.has(page.nextCursor))
          throw new Error('后续内容暂时无法加载，请稍后重试。')
        state.pages.push(page)
      }
    } catch (error) {
      if (key.value === requestKey && version === requestVersion)
        state.moreError = apiErrorMessage(error)
    } finally {
      if (key.value === requestKey && version === requestVersion)
        state.loadingMore = false
    }
  }
  async function retry() {
    requestVersion += 1
    controller?.abort()
    state.loadingMore = false
    state.moreError = ''
    state.pages = []
    await result.refresh()
  }
  return {
    ...result,
    initial: result,
    items,
    hasMore: computed(() =>
      Boolean(lastPage.value?.hasMore && lastPage.value.nextCursor)
    ),
    partial: computed(
      () => result.data.value?.partial || state.pages.some(page => page.partial)
    ),
    ...toRefs(state),
    loadMore,
    retry,
  }
}
