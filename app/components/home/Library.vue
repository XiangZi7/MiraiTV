<script setup lang="ts">
import type { MediaItem } from '~/types/media'
defineProps<{ watchlistPreview: MediaItem[] }>()
</script>
<template>
  <!-- =============== 继续观看 + 我的片单 + 金句 =============== -->
  <section
    class="home-section container-page grid grid-cols-1 gap-4 sm:gap-6"
    :class="watchlistPreview.length ? 'lg:grid-cols-2' : ''"
  >
    <!-- 我的片单 -->
    <div
      v-if="watchlistPreview.length"
      data-watchlist-preview
    >
      <UiSectionHeader
        title="我的片单"
        kicker="Your Watchlist"
        compact
      >
        <template #actions>
          <UiTextLink to="/watchlist">查看全部</UiTextLink>
        </template>
      </UiSectionHeader>

      <div class="mt-2 grid grid-cols-4 gap-2 sm:mt-5 sm:grid-cols-6">
        <NuxtLink
          v-for="(item, index) in watchlistPreview"
          :key="item.id"
          :to="`/detail/${item.id}`"
          :aria-label="item.title"
          :class="cn('group', index >= 3 && 'hidden sm:block')"
        >
          <MediaPoster
            :media="item"
            ratio="poster"
            compact
          />
        </NuxtLink>

        <NuxtLink
          to="/watchlist"
          aria-label="查看全部片单"
          class="flex aspect-2/3 items-center justify-center rounded-poster border border-dashed border-line text-ink-3 transition-colors duration-200 ease-out-soft hover:border-line-strong hover:text-ink"
        >
          <Icon
            name="lucide:arrow-right"
            class="size-4"
          />
        </NuxtLink>
      </div>
    </div>

    <!-- 金句卡片：保持自身高度，不跟随同行栏目拉伸 -->
    <div
      class="relative isolate flex min-h-32 flex-col justify-end self-start overflow-hidden rounded-card p-4 sm:min-h-64 sm:p-8"
      data-cinema-quote
    >
      <img
        src="/images/backgrounds/cinema-quote.webp"
        alt=""
        loading="lazy"
        decoding="async"
        class="absolute inset-0 size-full object-cover object-[65%_50%]"
      />
      <div
        class="absolute inset-0 bg-linear-to-r from-base/90 via-base/50 to-base/10"
      />
      <div
        class="absolute inset-0 bg-linear-to-t from-base/60 to-transparent"
      />

      <blockquote class="relative">
        <p
          class="font-display leading-relaxed text-base text-ink text-shadow-hero sm:text-2xl"
        >
          好的电影，<br />
          是另一种人生体验。
        </p>
        <footer class="mt-2 text-xs tracking-wider text-ink-2 sm:mt-4">
          — MiraiTV
        </footer>
      </blockquote>
    </div>
  </section>
</template>
