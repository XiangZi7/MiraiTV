<script setup lang="ts">
import { SwiperSlide } from 'swiper/vue'
// 保留组件实例：返回这个页面时筛选、页签和滚动位置都还在
definePageMeta({ keepalive: true })
const api = useApi()
const { loggedIn, user } = useAuth()
const activity = useActivityStore()

const { siteUrl } = useSeo({
  title: '首页',
  description: SITE_DESCRIPTION,
  type: 'website',
})
// 公告与首页主数据并行，个人栏目在客户端加载，不阻塞公共首屏。
const homeState = usePageData('home', () => api.home())
const siteContentState = useSiteContent()
const personalState = usePageData(
  () => `private:home:${user.value?.id ?? 'guest'}`,
  async () => {
    if (!loggedIn.value) return { history: [], watchlist: [] }
    const [history, watchlist] = await Promise.all([
      api.history(1, 3),
      api.watchlist(1, 5),
    ])
    return { history: history.items, watchlist: watchlist.items }
  },
  { server: false, lazy: true }
)
await Promise.all([homeState, siteContentState])
const { data: home, error, status, refresh } = homeState
const {
  data: personal,
  error: personalError,
  refresh: refreshPersonal,
} = personalState
const HERO_SLIDES = computed(() => home.value?.hero ?? [])
const EDITORS_PICK = computed(() => home.value?.editorsPick)
const NOW_SHOWING = computed(() => home.value?.popularMovies ?? [])
// 加上周番、高分推荐与电影推荐，共六栏；兼容旧接口但不渲染冗余内容。
const ROWS = computed(() =>
  (home.value?.sections ?? [])
    .filter(
      section =>
        ['theatrical', 'xifanLatest', 'xifanPopular'].includes(section.key) &&
        section.items.length
    )
    .slice(0, 3)
    .map(section => ({
      ...section,
      title:
        section.key === 'xifanLatest'
          ? '最近更新'
          : section.title.replace(/^.*?\s*·\s*/, ''),
      items: section.items.slice(0, 8),
    }))
)
const CONTINUE_WATCHING = computed(() =>
  activity.history.length ? activity.history : (personal.value?.history ?? [])
)
const watchlistPreview = computed(() => personal.value?.watchlist ?? [])
// 站点与站内搜索声明，外加首屏推荐列表
useStructuredData(() => [
  websiteSchema(siteUrl),
  itemListSchema(HERO_SLIDES.value, siteUrl),
])
</script>

<template>
  <div class="home-page">
    <!-- 页面主题交给 h1，轮播里的作品名是 h2；视觉上由头图承担这一行 -->
    <h1 class="sr-only">MiraiTV — 在线观看电影、剧集与动漫</h1>
    <UiRequestState
      class="container-page"
      :pending="status === 'pending'"
      :error="error"
      :partial="home?.partial"
      @retry="refresh"
    />
    <div class="container-page">
      <div class="mb-2 flex items-center justify-between gap-4 px-1 sm:mb-5">
        <div>
          <p
            class="hidden text-[0.625rem] tracking-[0.24em] text-brand/80 sm:block"
          >
            A LITTLE ESCAPE, EVERY DAY
          </p>
          <p class="text-xs text-ink-2 sm:mt-1.5 sm:text-sm">
            今天，也有值得相遇的故事。
          </p>
        </div>
        <NuxtLink
          to="/schedule"
          class="hidden items-center gap-2 text-xs text-ink-3 hover:text-ink sm:flex"
          ><span class="size-1.5 rounded-full bg-live" />新番放送中<Icon
            name="lucide:arrow-up-right"
            class="size-3.5"
        /></NuxtLink>
      </div>
      <div
        class="grid items-stretch gap-2 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]"
      >
        <MediaHeroBanner
          v-if="HERO_SLIDES.length"
          :slides="HERO_SLIDES"
        />
        <UiEmpty
          v-else
          title="推荐正在准备中"
          description="稍后再来看看，或从下方首页更多作品。"
        />
        <HomeSidebar
          :history="CONTINUE_WATCHING"
          :schedule="home?.weeklySchedule ?? []"
        />
      </div>
      <UiRequestState
        v-if="personalError"
        :error="personalError"
        @retry="refreshPersonal"
      />
    </div>
    <SiteContent />

    <HomeWeeklySchedule
      v-if="home?.weeklySchedule.length"
      :items="home.weeklySchedule"
    />
    <HomeRecommendations
      :editors-pick="EDITORS_PICK"
      :movies="NOW_SHOWING"
    />
    <!-- 精选三个横向栏目，其余分类按需进入片库。 -->
    <section
      v-for="row in ROWS"
      :key="row.key"
      class="home-section container-page"
    >
      <UiSectionHeader
        :title="row.title"
        :kicker="row.kicker ?? undefined"
        compact
      />
      <UiScroller
        v-if="row.items.length"
        class="mt-2 sm:mt-5"
        :label="row.title"
        compact
      >
        <SwiperSlide
          v-for="item in row.items"
          :key="item.id"
        >
          <div class="w-full sm:w-44 lg:w-[11.5rem]">
            <MediaCard
              :media="item"
              playable
              compact
            />
          </div>
        </SwiperSlide>
      </UiScroller>
    </section>

    <HomeLibrary :watchlist-preview="watchlistPreview" />
  </div>
</template>

<style scoped>
@media (max-width: 639px) {
  .home-page :deep(.container-page) {
    padding-inline: 0.75rem;
  }
  .home-page :deep(.home-section) {
    margin-top: 1.25rem;
  }
}
</style>
