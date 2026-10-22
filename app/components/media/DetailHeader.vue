<script setup lang="ts">
import type { MediaItem } from '~/types/media'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  media: MediaItem
  collected: boolean
  saving: boolean
  actionError: string
  playTo?: RouteLocationRaw
  sourcePending: boolean
  episodeCount?: number
}>()
defineEmits<{ collect: [] }>()
</script>

<template>
  <div
    class="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-[10rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)]"
  >
    <MediaPoster
      :media="media"
      natural
      priority
      sizes="(min-width: 1280px) 192px, (min-width: 1024px) 160px, (min-width: 640px) 144px, 96px"
      compact
      class="row-span-2 w-full self-start"
    />
    <div class="min-w-0">
      <h1
        class="font-display text-2xl leading-snug font-semibold tracking-tight text-balance text-shadow-hero sm:text-3xl xl:text-4xl"
      >
        {{ media.title }}
      </h1>
      <p
        v-if="media.originalTitle && media.originalTitle !== media.title"
        class="mt-2 hidden truncate text-sm text-ink-2 sm:block"
        :title="media.originalTitle"
      >
        {{ media.originalTitle }}
      </p>
      <UiMetaRow
        class="mt-3"
        :items="[media.year, media.region, ...media.genres.slice(0, 3)]"
      >
        <UiRating
          :value="media.rating"
          size="md"
          class="ml-1"
        />
        <span v-if="episodeCount">可播放 {{ episodeCount }} 集</span>
      </UiMetaRow>
    </div>
    <div
      class="col-span-2 mt-4 flex flex-wrap items-center gap-3 self-end sm:col-span-1 sm:col-start-2 sm:mt-5"
    >
      <UiButton
        :to="playTo"
        :loading="sourcePending"
        :disabled="!playTo"
        icon="lucide:play"
        class="h-11 cursor-pointer"
        >{{
          sourcePending ? '查找资源中' : playTo ? '立即播放' : '暂无播放资源'
        }}</UiButton
      >
      <UiButton
        variant="glass"
        :icon="collected ? 'lucide:check' : 'lucide:plus'"
        :loading="saving"
        class="h-11 cursor-pointer"
        @click="$emit('collect')"
        >{{ collected ? '已加入片单' : '加入片单' }}</UiButton
      >
    </div>
    <p
      v-if="actionError"
      role="alert"
      class="col-span-2 mt-2 text-xs text-danger"
    >
      {{ actionError }}
    </p>
  </div>
</template>
