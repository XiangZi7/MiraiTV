<script setup lang="ts">
import { SwiperSlide } from 'swiper/vue'
import { WEEKDAY_LABELS } from '~/constants/navigation'
import type { ScheduleItem } from '~/types/media'
const props = defineProps<{ items: ScheduleItem[] }>()
const today = useShanghaiWeekday()
// 响应式状态
const state = reactive({
  // 本周新番默认只展示北京时间当天的排期
  weekday: String(today.value),
})
const { weekday } = toRefs(state)
watch(today, (value, previous) => {
  if (state.weekday === String(previous)) state.weekday = String(value)
})
const weekdayTabs = computed(() => [
  { label: '全部', value: 'all' },
  ...WEEKDAY_LABELS.slice(1).map((label, index) => ({
    label,
    value: String(index + 1),
  })),
])
const visibleSchedule = computed(() =>
  props.items.filter(
    item => state.weekday === 'all' || String(item.weekday) === state.weekday
  )
)
</script>
<template>
  <!-- ============================ 本周新番 ============================ -->
  <section class="home-section container-page">
    <div
      class="flex flex-col gap-1 sm:gap-5 lg:flex-row lg:items-center lg:justify-between"
    >
      <UiSectionHeader
        title="本周新番"
        kicker="Weekly Anime"
        description="追踪每一部正在播出的故事。"
        size="lg"
        class="flex-1"
        compact
      >
        <template #actions>
          <UiTextLink
            to="/schedule"
            class="lg:hidden"
            >全部周番</UiTextLink
          >
        </template>
      </UiSectionHeader>

      <div
        class="flex min-w-0 items-center justify-between gap-4 sm:gap-6 lg:justify-end"
      >
        <UiTabs
          v-model="weekday"
          :items="weekdayTabs"
          class="min-w-0"
          label="本周新番日期"
          compact
        />
        <div class="hidden shrink-0 items-center gap-5 lg:flex">
          <span
            class="hidden text-[0.6875rem] tracking-[0.18em] text-ink-3 uppercase sm:block"
          >
            每周更新
          </span>
          <UiTextLink to="/schedule">全部周番</UiTextLink>
        </div>
      </div>
    </div>

    <UiScroller
      v-if="visibleSchedule.length"
      class="mt-2 sm:mt-5"
      label="本周新番"
      :key="weekday"
      compact
    >
      <SwiperSlide
        v-for="item in visibleSchedule"
        :key="item.id"
      >
        <div class="w-full sm:w-44 lg:w-[11.5rem]">
          <MediaAnimeCard
            :item="item"
            :featured="item.id === 's1'"
            :show-details="false"
            compact
          />
        </div>
      </SwiperSlide>
    </UiScroller>

    <UiEmpty
      v-if="!visibleSchedule.length"
      icon="lucide:calendar-off"
      title="这一天没有新番"
      description="换一个星期看看，或查看完整的周番排期。"
      class="!py-6 sm:!py-20"
    />
  </section>
</template>
