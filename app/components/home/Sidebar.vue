<script setup lang="ts">
import type { ScheduleItem, WatchRecord } from '~/types/media'
const props = defineProps<{
  history: WatchRecord[]
  schedule: ScheduleItem[]
}>()
const today = useShanghaiWeekday()
const todayItems = computed(() =>
  props.schedule.filter(item => item.weekday === today.value).slice(0, 2)
)
</script>

<template>
  <aside class="home-sidebar flex min-w-0 flex-col gap-3">
    <UiGlassSurface class="p-2.5 sm:p-3.5">
      <div class="mb-1.5 flex items-center justify-between gap-2 sm:mb-2.5">
        <h2 class="flex items-center gap-2 text-sm font-semibold">
          <Icon
            :name="history.length ? 'lucide:history' : 'lucide:calendar-days'"
            class="size-4 text-brand"
          />{{ history.length ? '继续观看' : '今日放送' }}
        </h2>
        <UiTextLink :to="history.length ? '/history' : '/schedule'"
          >全部</UiTextLink
        >
      </div>
      <div
        v-if="history.length"
        class="scrollbar-none flex snap-x gap-2 overflow-x-auto sm:block sm:space-y-2"
      >
        <MediaContinueCard
          v-for="record in history.slice(0, 2)"
          :key="record.id"
          :record="record"
          compact
          class="min-w-0 shrink-0 basis-[calc(100%-1rem)] snap-start sm:basis-auto"
        />
      </div>
      <div
        v-else-if="todayItems.length"
        class="grid grid-cols-2 gap-2 sm:grid-cols-1"
      >
        <NuxtLink
          v-for="item in todayItems"
          :key="item.id"
          :to="`/detail/${item.media.id}`"
          class="group flex min-w-0 items-center gap-2 rounded-2xl p-1 transition-colors hover:bg-white/5 sm:gap-3 sm:p-1.5"
        >
          <div class="w-8 shrink-0 sm:w-10">
            <MediaPoster
              :media="item.media"
              compact
            />
          </div>
          <div class="min-w-0 flex-1">
            <h3
              class="line-clamp-2 text-xs leading-4 text-ink group-hover:text-brand sm:leading-5"
            >
              {{ item.media.title }}
            </h3>
            <p class="mt-1 truncate text-[0.625rem] text-ink-3 sm:mt-1.5">
              {{ item.airTime || '今日播出'
              }}<span v-if="item.latestEpisode != null">
                · 第 {{ item.latestEpisode }} 集</span
              >
            </p>
          </div>
          <Icon
            name="lucide:chevron-right"
            class="hidden size-3.5 text-ink-3 sm:block"
          />
        </NuxtLink>
      </div>
      <div
        v-else
        class="flex items-center gap-3 py-2"
      >
        <Icon
          name="lucide:coffee"
          class="size-7 shrink-0 text-brand"
        />
        <div>
          <p class="text-xs text-ink-2">今天暂时没有排期</p>
          <p class="mt-1.5 text-xs text-ink-3">去发现一部心仪的作品吧。</p>
        </div>
      </div>
    </UiGlassSurface>
    <NuxtLink
      to="/watchlist"
      class="library-invite group relative hidden min-h-34 flex-1 flex-col overflow-hidden p-4 sm:flex"
    >
      <span
        aria-hidden="true"
        class="glass-surface absolute inset-0 rounded-[inherit]"
      />
      <div class="relative flex items-center justify-between">
        <span class="text-[0.625rem] tracking-[0.2em] text-ink-3"
          >YOUR COLLECTION</span
        ><Icon
          name="lucide:bookmark"
          class="size-4 text-brand"
        />
      </div>
      <h2 class="relative mt-auto pt-4 text-lg font-medium">
        好故事，留着慢慢看。
      </h2>
      <div
        class="relative mt-3 flex items-center justify-between text-xs text-ink-3"
      >
        <span>把喜欢的作品，收进你的片单</span
        ><Icon
          name="lucide:arrow-up-right"
          class="size-4 text-ink transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </NuxtLink>
  </aside>
</template>

<style scoped>
.library-invite {
  border-radius: var(--radius-panel);
  background:
    linear-gradient(120deg, #f3f6ffb0, #f3f6ff70),
    url('/images/backgrounds/cinema-quote.webp') center / cover;
}
@media (min-width: 640px) and (max-width: 1023px) {
  .home-sidebar {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
