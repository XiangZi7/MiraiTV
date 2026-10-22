<script setup lang="ts">
import type { MediaItem } from '~/types/media'

const props = withDefaults(
  defineProps<{
    items: MediaItem[]
    title?: string
  }>(),
  { title: '相关推荐' }
)

const recommendations = computed(() =>
  props.items.map(media => ({
    media,
    meta: [media.year, media.genres[0]].filter(Boolean).join(' · '),
  }))
)
</script>

<template>
  <section
    v-if="items.length"
    class="min-w-0"
    aria-labelledby="playback-recommendations-title"
  >
    <header class="mb-4 flex items-center justify-between gap-3">
      <h2
        id="playback-recommendations-title"
        class="flex items-center gap-2.5 font-semibold text-base text-ink"
      >
        <span
          class="h-4 w-0.5 rounded-full bg-brand"
          aria-hidden="true"
        />
        {{ title }}
      </h2>
      <span class="text-[0.625rem] tracking-[0.18em] text-ink-3 uppercase">
        Up Next
      </span>
    </header>

    <ul
      class="-mx-1 scrollbar-none flex snap-x snap-proximity gap-3 overflow-x-auto px-1 pt-1 pb-3 sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-x-3 lg:gap-y-5 lg:overflow-visible lg:px-0"
    >
      <li
        v-for="{ media, meta } in recommendations"
        :key="media.id"
        class="w-36 min-w-0 shrink-0 snap-start sm:w-40 lg:w-auto"
      >
        <NuxtLink
          :to="`/detail/${media.id}`"
          class="group/recommendation block rounded-card focus-visible:outline-offset-4"
          :aria-label="`查看《${media.title}》详情`"
        >
          <MediaPoster
            :media="media"
            compact
            class="ring-1 ring-white/5 transition-shadow duration-200 group-hover/recommendation:ring-brand/50 group-focus-visible/recommendation:ring-brand/50"
          >
            <div
              class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-200 group-hover/recommendation:opacity-100 group-focus-visible/recommendation:opacity-100 motion-reduce:transition-none"
              aria-hidden="true"
            >
              <span
                class="glass-surface glass-on-image flex size-11 items-center justify-center rounded-full"
              >
                <Icon
                  name="lucide:arrow-up-right"
                  class="size-5"
                />
              </span>
            </div>
            <span
              v-if="media.rating != null && Number.isFinite(media.rating)"
              class="glass-surface glass-on-image absolute right-2 bottom-2 rounded-md px-1.5 py-1"
            >
              <UiRating :value="media.rating" />
            </span>
          </MediaPoster>

          <div class="mt-2.5 space-y-1">
            <h3
              class="line-clamp-2 min-h-10 text-sm leading-5 font-medium text-ink transition-colors duration-200 group-hover/recommendation:text-brand group-focus-visible/recommendation:text-brand"
              :title="media.title"
            >
              {{ media.title }}
            </h3>
            <p
              v-if="meta"
              class="truncate text-xs leading-5 text-ink-3"
            >
              {{ meta }}
            </p>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
