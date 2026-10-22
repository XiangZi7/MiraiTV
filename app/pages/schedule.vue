<script setup lang="ts">
import { WEEKDAY_FULL } from '~/constants/navigation'
// 保留组件实例：返回这个页面时筛选、页签和滚动位置都还在
definePageMeta({ keepalive: true })
const api = useApi()
const { siteUrl } = useSeo({
  title: '周番排期',
  description:
    '查看每周动漫新番更新排期，按星期浏览播出时间与最新集数，在 MiraiTV 追踪正在连载的番剧。',
})
const { data, error, status, refresh } = await usePageData('schedule', () =>
  api.schedule()
)
const WEEK_DATES = computed(() => [
  '',
  ...(data.value?.weekDates ?? []).map(date => date.slice(5)),
])
const today = useShanghaiWeekday()
// 响应式状态
const state = reactive({
  // 默认使用北京时间的当天星期
  weekday: today.value,
})
const { weekday } = toRefs(state)
const daySchedule = computed(() =>
  (data.value?.items ?? [])
    .filter(item => item.weekday === state.weekday)
    .sort((a, b) => (a.airTime ?? '99:99').localeCompare(b.airTime ?? '99:99'))
)
useStructuredData(() => [
  breadcrumbSchema(
    [
      { name: '首页', path: '/' },
      { name: '周番排期', path: '/schedule' },
    ],
    siteUrl
  ),
  itemListSchema(
    daySchedule.value.map(item => item.media),
    siteUrl
  ),
])
</script>

<template>
  <div class="pb-4">
    <MediaPageHero
      title="周番排期"
      subtitle="每周更新，不错过任何一部好番。"
      :tint="{ from: '#9a6fdc', to: '#161026' }"
    >
      <template #actions>
        <UiTextLink to="/watchlist">追番提醒</UiTextLink>
      </template>
    </MediaPageHero>

    <section class="container-page mt-4">
      <UiRequestState
        :pending="status === 'pending'"
        :error="error"
        :partial="data?.partial"
        @retry="refresh"
      />
      <!-- 星期选择 -->
      <div class="scrollbar-none flex gap-2 overflow-x-auto">
        <button
          v-for="day in 7"
          :key="day"
          type="button"
          :aria-pressed="weekday === day"
          :class="
            cn(
              'flex shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-xl px-5 py-2.5 transition-all duration-200 ease-out-soft',
              weekday === day
                ? 'glass-surface glass-control glass-accent'
                : 'glass-surface glass-control text-ink-2 hover:text-ink'
            )
          "
          @click="state.weekday = day"
        >
          <span class="text-[0.8125rem] font-medium">{{
            WEEKDAY_FULL[day]
          }}</span>
          <span
            :class="
              cn(
                'text-xs tabular-nums',
                weekday === day ? 'text-white/70' : 'text-ink-3'
              )
            "
          >
            {{ WEEK_DATES[day] }}
          </span>
        </button>
      </div>

      <!-- 当天排期 -->
      <div class="mt-8">
        <UiSectionHeader
          :title="`${WEEKDAY_FULL[weekday]}更新`"
          kicker="On Air"
          :description="`共 ${daySchedule.length} 部作品`"
        />

        <div class="mt-5">
          <MediaScheduleRow
            v-for="item in daySchedule"
            :key="item.id"
            :item="item"
          />
        </div>

        <UiEmpty
          v-if="!error && status !== 'pending' && !daySchedule.length"
          icon="lucide:calendar-off"
          title="这一天暂无更新"
          description="换一个星期看看，或许有惊喜。"
        />
      </div>
    </section>
  </div>
</template>
