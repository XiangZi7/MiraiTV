<script setup lang="ts">
import { SwiperSlide } from 'swiper/vue'
import type { HomeResult } from '~/types/web-api'
const props = defineProps<{
  editorsPick?: HomeResult['editorsPick']
  movies: HomeResult['popularMovies']
}>()
const EDITORS_PICK = computed(() => props.editorsPick)
const NOW_SHOWING = computed(() => props.movies.slice(0, 8))
</script>
<template>
  <!-- =================== 编辑精选 + 热门电影 =================== -->
  <section
    v-if="EDITORS_PICK?.feature || NOW_SHOWING.length"
    class="home-section container-page grid gap-4 sm:gap-6"
    :class="
      EDITORS_PICK?.feature && NOW_SHOWING.length
        ? 'xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'
        : ''
    "
    data-home-recommendations
  >
    <!-- 编辑精选 -->
    <div
      v-if="EDITORS_PICK?.feature"
      class="glass-surface min-w-0 p-3 sm:p-6"
    >
      <UiSectionHeader
        title="高分推荐"
        kicker="Editor's Pick"
        compact
      />

      <!-- 封面与右侧文案等高，由海报组件兼顾铺满与完整构图。 -->
      <div
        v-if="EDITORS_PICK?.feature"
        class="mt-2 flex gap-3 sm:mt-5 sm:gap-4"
        data-editors-content
      >
        <NuxtLink
          :to="`/detail/${EDITORS_PICK.feature.id}`"
          class="group relative min-h-40 w-[32%] shrink-0 self-stretch sm:min-h-72 sm:w-[42%]"
          data-editors-poster
        >
          <MediaPoster
            :media="EDITORS_PICK.feature"
            playable
            ratio="poster"
            class="absolute inset-0 aspect-auto size-full"
          />
        </NuxtLink>

        <div class="flex min-w-0 flex-1 flex-col">
          <h3
            class="line-clamp-2 font-semibold text-base text-ink sm:line-clamp-none"
          >
            {{ EDITORS_PICK.feature.title }}
          </h3>
          <p
            v-if="EDITORS_PICK.feature.originalTitle"
            class="mt-1 hidden truncate text-xs text-ink-3 sm:block"
          >
            {{ EDITORS_PICK.feature.originalTitle }}
          </p>

          <UiMetaRow
            class="mt-1.5 sm:mt-3"
            :items="[
              EDITORS_PICK.feature.year,
              EDITORS_PICK.feature.region,
              ...EDITORS_PICK.feature.genres.slice(0, 2),
            ]"
          />

          <div class="mt-1.5 flex items-center gap-2.5 sm:mt-2.5">
            <UiRating :value="EDITORS_PICK.feature.rating" />
            <span
              v-if="EDITORS_PICK.feature.rank"
              class="text-xs text-ink-3"
              >No.{{ EDITORS_PICK.feature.rank }}</span
            >
          </div>

          <p
            v-if="EDITORS_PICK.feature.synopsis"
            class="mt-2 line-clamp-fade text-xs leading-relaxed text-ink-2 [-webkit-line-clamp:2] sm:mt-3 sm:[-webkit-line-clamp:3]"
          >
            {{ EDITORS_PICK.feature.synopsis }}
          </p>

          <!-- 同系列 / 同题材作品，窄屏下让位给文案 -->
          <div
            v-if="EDITORS_PICK.related.length"
            class="mt-auto hidden items-end gap-2.5 pt-4 sm:flex"
          >
            <NuxtLink
              v-for="item in EDITORS_PICK.related.slice(0, 3)"
              :key="item.id"
              :to="`/detail/${item.id}`"
              :aria-label="item.title"
              class="group max-w-16 min-w-0 flex-1"
            >
              <MediaPoster
                :media="item"
                compact
              />
            </NuxtLink>

            <UiTextLink
              :to="`/detail/${EDITORS_PICK.feature.id}`"
              class="ml-auto pb-1"
            >
              查看详情
            </UiTextLink>
          </div>

          <UiTextLink
            :to="`/detail/${EDITORS_PICK.feature.id}`"
            class="mt-auto min-h-11 pt-1 sm:hidden"
          >
            查看详情
          </UiTextLink>
        </div>
      </div>
    </div>

    <!-- 热门电影 -->
    <div
      v-if="NOW_SHOWING.length"
      class="glass-surface min-w-0 p-3 sm:p-6"
    >
      <UiSectionHeader
        title="电影推荐"
        kicker="Now Showing"
        compact
      >
        <template #actions>
          <UiTextLink to="/movies">查看全部</UiTextLink>
        </template>
      </UiSectionHeader>

      <UiScroller
        v-if="NOW_SHOWING.length"
        class="mt-2 min-w-0 sm:mt-5"
        data-movies-content
        label="电影推荐"
        compact
      >
        <SwiperSlide
          v-for="item in NOW_SHOWING"
          :key="item.id"
        >
          <div class="w-full sm:w-36 lg:w-40">
            <MediaCard
              :media="item"
              variant="inline"
              compact
            />
          </div>
        </SwiperSlide>
      </UiScroller>
    </div>
  </section>
</template>
