<script setup lang="ts">
import type { MediaItem } from '~/types/media'

/** 播放页作品信息，封面与简介在各尺寸下保持可见。 */
const props = defineProps<{
  media: MediaItem
  episodeLabel: string
  binding?: { source: string; seriesId: string }
}>()
defineSlots<{ episodes?(): unknown }>()

const favorite = useFavorite(() => props.media.id)
const { collected, saving, actionError, toggle: toggleCollection } = favorite
await favorite.initial

const facts = computed(() =>
  [
    props.media.year,
    props.media.region,
    props.media.episodes && `共 ${props.media.episodes} 集`,
  ]
    .filter(Boolean)
    .join(' · ')
)
const genres = computed(() => {
  const { media } = props
  const seen = new Set(
    [media.title, media.originalTitle, media.region, media.year, media.duration]
      .filter(value => value != null)
      .map(value => String(value).trim().toLocaleLowerCase())
  )
  return media.genres
    .filter(value => {
      const key = value.trim().toLocaleLowerCase()
      if (!key || seen.has(key) || /^\d{4}(?:年(?:\d{1,2}月)?)?$/.test(key))
        return false
      seen.add(key)
      return true
    })
    .slice(0, 3)
})
// 响应式状态
const state = reactive({
  // 是否展开完整简介
  expanded: false,
})
const { expanded } = toRefs(state)
function toggleSynopsis() {
  state.expanded = !state.expanded
}
watch(
  () => props.media.id,
  () => {
    state.expanded = false
  }
)
</script>

<template>
  <section aria-label="作品信息">
    <div
      class="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5"
    >
      <NuxtLink
        :to="{
          path: `/detail/${media.id}`,
          query: binding
            ? { source: binding.source, seriesId: binding.seriesId }
            : undefined,
        }"
        :aria-label="`${media.title}详情`"
        class="group block w-full"
      >
        <MediaPoster
          :media="media"
          natural
          compact
          sizes="(min-width: 640px) 112px, 96px"
        />
      </NuxtLink>

      <div class="min-w-0">
        <h1
          class="text-lg leading-snug font-semibold tracking-tight break-words text-ink sm:text-xl"
        >
          {{ media.title }}
        </h1>
        <p
          v-if="media.originalTitle && media.originalTitle !== media.title"
          :title="media.originalTitle"
          class="mt-1 truncate text-xs leading-relaxed text-ink-3 sm:text-sm"
        >
          {{ media.originalTitle }}
        </p>
        <p
          v-if="facts"
          class="mt-2 text-xs leading-relaxed text-ink-2"
        >
          {{ facts }}
        </p>
        <ul
          v-if="genres.length"
          aria-label="作品标签"
          class="mt-2 flex flex-wrap gap-1.5"
        >
          <li
            v-for="genre in genres"
            :key="genre"
            class="max-w-full truncate rounded-md bg-brand-soft px-2 py-1 text-[0.6875rem] leading-none text-ink-2 sm:text-xs"
          >
            {{ genre }}
          </li>
        </ul>
        <UiRating
          :value="media.rating"
          size="md"
          class="mt-2.5"
        />
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between gap-4">
      <div
        v-if="episodeLabel"
        class="flex min-w-0 items-center gap-2.5"
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
          aria-hidden="true"
        >
          <Icon
            name="lucide:play"
            class="size-4"
          />
        </span>
        <div class="min-w-0">
          <p class="text-[0.6875rem] text-ink-3">正在播放</p>
          <p
            class="mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug font-medium break-words text-ink-2"
          >
            {{ episodeLabel }}
          </p>
        </div>
      </div>
      <UiButton
        :variant="collected ? 'primary' : 'glass'"
        size="sm"
        :icon="collected ? 'lucide:check' : 'lucide:plus'"
        :aria-pressed="collected"
        :loading="saving"
        class="ml-auto h-11"
        @click="toggleCollection"
      >
        {{ collected ? '已收藏' : '加入片单' }}
      </UiButton>
    </div>
    <p
      v-if="actionError"
      role="alert"
      class="mt-2 text-xs text-danger"
    >
      {{ actionError }}
    </p>

    <slot name="episodes" />

    <div
      v-if="media.synopsis"
      class="mt-5 border-t border-line/60 pt-5"
    >
      <h2 class="mb-2 text-sm font-medium text-ink">剧情简介</h2>
      <p
        :class="
          cn(
            'text-[0.8125rem] leading-relaxed text-ink-2',
            !expanded && 'line-clamp-fade [-webkit-line-clamp:2]'
          )
        "
      >
        {{ media.synopsis }}
      </p>
      <button
        type="button"
        :aria-expanded="expanded"
        class="mt-2 cursor-pointer text-xs text-ink-3 transition-colors duration-200 ease-out-soft hover:text-ink"
        @click="toggleSynopsis"
      >
        {{ expanded ? '收起' : '展开全部' }}
      </button>
    </div>
  </section>
</template>
