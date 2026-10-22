<script setup lang="ts">
import type { MediaKind } from '~/types/media'
import type { CatalogQuery } from '~/types/web-api'
import {
  RATING_OPTIONS,
  REGION_OPTIONS,
  YEAR_OPTIONS,
} from '~/constants/filters'
const props = defineProps<{
  title: string
  kind: MediaKind
  subtitle: string
  genres: string[]
}>()
const route = useRoute()
const api = useApi()
const providerState = usePageData('providers', () => api.providers())
const { data: providers } = providerState
// 响应式状态
const state = reactive({
  // 题材筛选
  genre: '全部',
  // 排序使用后端枚举
  sort: 'latest',
  // 精确上映年份
  year: 'all',
  // 制作地区
  region: 'all',
  // 最低评分
  rating: 'all',
})
const { genre, sort, year, region, rating } = toRefs(state)
const provider = computed(() => (props.kind === 'anime' ? 'xifan' : 'huarw'))
const query = computed<CatalogQuery>(() => ({
  provider: provider.value,
  kind:
    props.kind === 'movie' && route.query.kind === 'documentary'
      ? 'documentary'
      : props.kind,
  sort: state.sort as CatalogQuery['sort'],
  genre: state.genre === '全部' ? undefined : state.genre,
  year: state.year === 'all' ? undefined : Number(state.year),
  region: state.region === 'all' ? undefined : state.region,
  minRating:
    provider.value === 'xifan' && state.rating !== 'all'
      ? Number(state.rating)
      : undefined,
  pageSize: 24,
}))
const sorts = computed(() =>
  [
    { value: 'latest', label: '最新上线' },
    { value: 'rating', label: '评分最高' },
    { value: 'popular', label: '热度排序' },
  ].filter(item =>
    (
      providers.value?.find(item => item.key === provider.value)?.sorts ?? [
        'latest',
        'rating',
        'popular',
      ]
    ).includes(item.value)
  )
)
const list = useMediaList(query)
// 电影页带 ?kind=documentary 时是另一个主题，标题与描述跟着切换
const pageTitle = computed(() =>
  query.value.kind === 'documentary' ? '纪录片' : props.title
)
const canonicalPath = computed(() =>
  query.value.kind === 'documentary' ? '/movies?kind=documentary' : route.path
)
const { siteUrl } = useSeo(() => ({
  title: pageTitle.value,
  description: `${props.subtitle} 在 ${SITE_NAME} 浏览${pageTitle.value}，可按题材、年份、地区与评分筛选。`,
  canonicalPath: canonicalPath.value,
}))
const {
  items,
  status,
  error,
  hasMore,
  partial,
  loadingMore,
  moreError,
  retry,
  loadMore,
} = list
await Promise.all([providerState, list.initial])
useStructuredData(() => [
  breadcrumbSchema(
    [
      { name: '首页', path: '/' },
      { name: pageTitle.value, path: canonicalPath.value },
    ],
    siteUrl
  ),
  itemListSchema(items.value, siteUrl),
])
</script>

<template>
  <div class="pb-4">
    <header class="container-page pt-3 pb-2 sm:pt-5">
      <h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {{ pageTitle }}
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-ink-2">{{ subtitle }}</p>
      <div
        class="mt-5 rounded-card border border-line bg-surface-1 p-3 sm:mt-6 sm:p-5"
        role="group"
        aria-label="作品筛选"
      >
        <UiChipGroup
          v-model="genre"
          :items="genres"
          variant="solid"
        />
        <div
          class="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4"
        >
          <UiSelect
            v-model="sort"
            :options="sorts"
            placeholder="排序"
            variant="solid"
          />
          <UiSelect
            v-model="year"
            :options="YEAR_OPTIONS"
            placeholder="年份"
            variant="solid"
          />
          <UiSelect
            v-model="region"
            :options="REGION_OPTIONS"
            placeholder="地区"
            variant="solid"
          />
          <UiSelect
            v-if="provider === 'xifan'"
            v-model="rating"
            :options="RATING_OPTIONS"
            placeholder="评分"
            variant="solid"
          />
        </div>
      </div>
    </header>
    <section class="container-page mt-4">
      <UiSectionHeader
        title="作品列表"
        kicker="Catalog"
      />
      <UiRequestState
        :pending="status === 'pending'"
        :error="error"
        :partial="partial"
        @retry="retry"
      />
      <div
        class="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
      >
        <MediaCard
          v-for="item in items"
          :key="item.id"
          :media="item"
          variant="inline"
          playable
        />
      </div>
      <UiEmpty
        v-if="!items.length && status !== 'pending' && !error"
        title="当前条件暂无作品"
        :description="
          hasMore
            ? '后续页面可能有匹配作品，可以继续加载。'
            : '试试其他筛选条件。'
        "
      />
      <p
        v-if="moreError"
        role="alert"
        class="mt-4 text-sm text-danger"
      >
        {{ moreError }}
      </p>
      <UiInfiniteLoader
        :has-more="hasMore"
        :pending="loadingMore || status === 'pending'"
        :error="moreError"
        :disabled="!!error"
        :load-more="loadMore"
      />
    </section>
  </div>
</template>
