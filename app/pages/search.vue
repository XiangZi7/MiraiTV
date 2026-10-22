<script setup lang="ts">
// 保留组件实例：返回这个页面时筛选、页签和滚动位置都还在
definePageMeta({ keepalive: true })
const router = useRouter()
const route = useRoute()
const api = useApi()
const activity = useActivityStore()
// 响应式状态
const state = reactive({
  // 输入框草稿，提交后才更新查询
  keyword: '',
})
const { keyword } = toRefs(state)
const searchTerm = computed(() =>
  String(
    Array.isArray(route.query.q)
      ? (route.query.q[0] ?? '')
      : (route.query.q ?? '')
  ).trim()
)
const { trackSearch } = useAnalytics()
function recordSearch() {
  if (route.path === '/search' && searchTerm.value)
    activity.recordSearch(searchTerm.value)
}
onMounted(recordSearch)
watch(searchTerm, () => {
  if (import.meta.client) recordSearch()
})
watch(
  searchTerm,
  value => {
    state.keyword = value
    if (route.path === '/search' && value) trackSearch(value)
  },
  { immediate: true }
)
// 不指定来源，后端检索全部注册视频源，复合游标保留各源剩余结果。
const list = useMediaList(() => ({ pageSize: 24 }), searchTerm)
const {
  items: results,
  status,
  error,
  hasMore,
  loadingMore,
  moreError,
  loadMore,
  retry,
  partial,
} = list
const suggestionsState = usePageData('suggestions', () => api.suggestions())
await Promise.all([list.initial, suggestionsState])
const {
  data: suggestions,
  error: suggestionsError,
  refresh: refreshSuggestions,
} = suggestionsState
const HOT_SEARCHES = computed(() =>
  (suggestions.value?.trending ?? []).slice(0, 4)
)
const recommended = computed(() => suggestions.value?.recommendations ?? [])
const { siteUrl } = useSeo(() => ({
  title: searchTerm.value ? `${searchTerm.value} · 搜索` : '搜索',
  description: '在 MiraiTV 搜索电影、剧集与动漫，发现热门作品和高分推荐。',
  noindex: Boolean(searchTerm.value),
  canonicalPath: '/search',
}))
useStructuredData(() =>
  searchTerm.value
    ? []
    : [
        breadcrumbSchema(
          [
            { name: '首页', path: '/' },
            { name: '搜索', path: '/search' },
          ],
          siteUrl
        ),
        itemListSchema(recommended.value, siteUrl),
      ]
)
function search(value: string) {
  const q = value.trim()
  state.keyword = q
  void router.replace({ path: '/search', query: q ? { q } : {} })
}
</script>

<template>
  <div class="container-page pt-3 pb-4 sm:pt-5">
    <section
      class="relative z-10 max-w-2xl"
      aria-labelledby="search-title"
    >
      <h1
        id="search-title"
        class="text-2xl font-semibold tracking-tight text-ink"
      >
        搜索
      </h1>
      <UiSearchInput
        v-model="keyword"
        class="mt-5"
        size="lg"
        label="搜索作品"
        placeholder="搜索电影、剧集、动漫…"
        with-submit
        @submit="search"
      />
      <div
        v-if="!searchTerm && HOT_SEARCHES.length"
        class="mt-4 flex flex-wrap items-center gap-2"
      >
        <span class="mr-1 text-xs text-ink-3">推荐搜索</span>
        <NuxtLink
          v-for="word in HOT_SEARCHES"
          :key="word"
          :to="{ path: '/search', query: { q: word } }"
          :title="word"
          class="glass-surface glass-control max-w-full truncate rounded-full px-3 py-2 text-xs text-ink-2 hover:text-brand"
          >{{ word }}</NuxtLink
        >
      </div>
    </section>

    <MediaSearchResults
      v-if="searchTerm"
      class="mt-8"
      :keyword="searchTerm"
      :items="results"
      :pending="status === 'pending'"
      :error="error"
      :partial="partial"
      :total="list.data.value.total"
      @retry="retry"
    />
    <div
      v-if="searchTerm && (hasMore || (status === 'success' && results.length))"
      class="mt-6 text-center"
    >
      <UiInfiniteLoader
        v-if="hasMore"
        :has-more="hasMore"
        :pending="loadingMore || status === 'pending'"
        :error="moreError"
        :disabled="!!error"
        :load-more="loadMore"
      />
      <p
        v-else
        class="py-4 text-sm text-ink-3"
        role="status"
        data-search-end
      >
        没有更多数据了
      </p>
    </div>

    <section
      v-if="!searchTerm && (recommended.length || suggestionsError)"
      class="mt-8"
      aria-labelledby="search-recommendations-title"
    >
      <h2
        id="search-recommendations-title"
        class="text-lg font-semibold text-ink"
      >
        为你推荐
      </h2>
      <UiButton
        v-if="suggestionsError"
        class="mt-4"
        size="sm"
        variant="outline"
        @click="refreshSuggestions"
        >重新加载推荐</UiButton
      >
      <div
        v-if="recommended.length"
        class="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6"
      >
        <MediaCard
          v-for="item in recommended"
          :key="item.id"
          :media="item"
          variant="inline"
          playable
        />
      </div>
    </section>
  </div>
</template>
