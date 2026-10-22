<script setup lang="ts">
import { WATCHLIST_TABS } from '~/constants/filters'
import { WEEKDAY_FULL } from '~/constants/navigation'
import type { FavoriteItem } from '~/types/web-api'
definePageMeta({ middleware: 'auth', keepalive: true })
useSeo({ title: '我的片单', noindex: true })
const api = useApi()
const today = useShanghaiWeekday()
const library = useLibrary('watchlist')
const {
  data,
  error,
  status,
  refresh,
  hasMore,
  loadingMore,
  loadMore,
  actionError,
} = library
await library.initial
const WATCHLIST_ITEMS = computed(() => library.items.value as FavoriteItem[])
const COLLECTIONS = computed(() =>
  data.value && 'collections' in data.value ? data.value.collections : []
)
const {
  data: schedule,
  error: scheduleError,
  refresh: refreshSchedule,
} = await usePageData('schedule', () => api.schedule())
const TAB_KIND = { 电影: 'movie', 剧集: 'series', 动漫: 'anime' } as const
// 响应式状态
const state = reactive({
  // 当前收藏分类
  tab: WATCHLIST_TABS[0]!,
  // 周番星期筛选
  weekday: String(today.value),
})
const { tab, weekday } = toRefs(state)
watch(today, (value, previous) => {
  if (state.weekday === String(previous)) state.weekday = String(value)
})
const visibleItems = computed(() => {
  const kind = TAB_KIND[state.tab as keyof typeof TAB_KIND]
  return kind
    ? WATCHLIST_ITEMS.value.filter(item => item.kind === kind)
    : WATCHLIST_ITEMS.value
})
// 手机列表只保留一行关键信息，完整标签在作品详情中查看。
function mobileMeta(item: FavoriteItem) {
  return [item.year, item.region, ...item.genres.slice(0, 2)]
    .filter(Boolean)
    .join(' · ')
}
const weekdayTabs = computed(() => [
  { label: '全部', value: 'all' },
  ...WEEKDAY_FULL.slice(1).map((label, index) => ({
    label,
    value: String(index + 1),
  })),
])
const visibleSchedule = computed(() =>
  (schedule.value?.items ?? []).filter(
    item => state.weekday === 'all' || String(item.weekday) === state.weekday
  )
)
</script>

<template>
  <div class="pb-4">
    <MediaPageHero
      title="我的片单"
      subtitle="收藏的、想看的，都是你的影像。"
      :tint="{ from: '#7f5fbf', to: '#140e20' }"
    >
      <template #actions>
        <span class="text-xs text-ink-3">共 {{ data?.total ?? 0 }} 部</span>
      </template>
    </MediaPageHero>

    <!-- 片单集合 -->
    <section class="container-page mt-4">
      <UiRequestState
        :pending="status === 'pending'"
        :error="error"
        :partial="data?.partial"
        @retry="refresh"
      />
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MediaCollectionCard
          v-for="collection in COLLECTIONS"
          :key="collection.id"
          :collection="collection"
        />
      </div>
    </section>

    <!-- 收藏作品 -->
    <section class="container-page mt-6 sm:mt-12">
      <div
        class="flex min-w-0 items-end justify-between gap-4 border-b border-line/60 sm:gap-6"
      >
        <UiTabs
          v-model="tab"
          :items="WATCHLIST_TABS"
          class="min-w-0"
        />
        <UiTextLink class="shrink-0 pb-2.5">最近添加</UiTextLink>
      </div>

      <div class="mt-1 divide-line/60 sm:mt-5">
        <NuxtLink
          v-for="item in visibleItems"
          :key="item.id"
          :to="`/detail/${item.id}`"
          class="group flex items-center gap-3 border-b border-line/60 py-3 transition-colors duration-200 ease-out-soft hover:bg-surface-2/50 sm:gap-4 sm:px-2"
        >
          <div class="w-16 shrink-0 sm:w-12">
            <MediaPoster
              :media="item"
              ratio="poster"
              compact
            />
          </div>

          <div class="min-w-0 flex-1">
            <h3
              class="line-clamp-2 text-sm leading-snug font-medium break-words text-ink transition-colors duration-200 ease-out-soft group-hover:text-brand sm:block sm:truncate sm:text-[0.8125rem]"
            >
              {{ item.title }}
            </h3>
            <p class="mt-1.5 truncate text-xs text-ink-2 sm:hidden">
              {{ mobileMeta(item) }}
            </p>
            <UiMetaRow
              class="mt-1 hidden sm:flex"
              :items="[item.year, item.region, ...item.genres]"
            />
            <div class="mt-2 flex items-center justify-between gap-3 sm:mt-1.5">
              <UiRating :value="item.rating" />
              <UiBadge
                tone="live"
                icon="lucide:check"
                class="shrink-0 sm:hidden"
                >已收藏</UiBadge
              >
            </div>
          </div>

          <UiBadge
            tone="live"
            icon="lucide:check"
            class="shrink-0 max-sm:hidden"
            >已收藏</UiBadge
          >
        </NuxtLink>
      </div>

      <UiEmpty
        v-if="!visibleItems.length && !error && status !== 'pending'"
        icon="lucide:bookmark-x"
        title="这个分类还没有收藏"
        description="去首页逛逛，把心动的作品加进来。"
      >
        <UiButton
          to="/"
          size="sm"
          >去首页</UiButton
        >
      </UiEmpty>
    </section>

    <div class="container-page mt-6 text-center">
      <p
        v-if="actionError"
        role="alert"
        class="mb-3 text-danger"
      >
        {{ actionError }}
      </p>
      <UiInfiniteLoader
        :has-more="hasMore"
        :pending="loadingMore || status === 'pending'"
        :error="actionError"
        :disabled="!!error"
        :load-more="loadMore"
      />
    </div>
    <!-- 追番提醒 -->
    <section class="container-page mt-5">
      <UiSectionHeader
        title="全部周番"
        kicker="Schedule"
        description="查看本周播出安排。"
      >
        <template #actions>
          <UiTextLink to="/schedule">周番排期</UiTextLink>
        </template>
      </UiSectionHeader>

      <UiRequestState
        :error="scheduleError"
        @retry="refreshSchedule"
      />
      <div class="mt-5">
        <UiTabs
          v-model="weekday"
          :items="weekdayTabs"
        />
      </div>

      <div
        class="mt-6 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 lg:grid-cols-6"
      >
        <MediaAnimeCard
          v-for="item in visibleSchedule"
          :key="item.id"
          :item="item"
          :show-details="false"
        />
      </div>
    </section>
  </div>
</template>
