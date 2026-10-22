<script setup lang="ts">
import type { MediaItem } from '~/types/media'

/**
 * 标准作品卡：海报 + 标题 + 元信息
 * 列表、网格、横向滚动列共用，差异通过 variant 与 footer 插槽控制
 */
const props = withDefaults(
  defineProps<{
    media: MediaItem
    /** stacked：年份题材与评分分两行；inline：评分与年份同一行 */
    variant?: 'stacked' | 'inline'
    ratio?: 'poster' | 'backdrop'
    /** 悬停时海报上出现播放按钮 */
    playable?: boolean
    /** 首页同行推荐卡片与精选区块等高。 */
    stretch?: boolean
    /** 首页手机布局：压缩海报边框及底部信息区。 */
    compact?: boolean
  }>(),
  { variant: 'stacked', ratio: 'poster' }
)

/** 详情页路由 */
const detailLink = computed(() => `/detail/${props.media.id}`)
// 缺少年份或题材时，不留下分隔点或空的元信息行。
const metadata = computed(() =>
  [props.media.year, props.media.genres[0]?.trim()].filter(Boolean).join(' · ')
)
const hasRating = computed(
  () => props.media.rating != null && Number.isFinite(props.media.rating)
)
</script>

<template>
  <NuxtLink
    :to="detailLink"
    :class="
      cn(
        'media-card glass-surface glass-control group block w-full rounded-[1.375rem] p-1.5',
        compact && 'media-card-compact',
        stretch && 'lg:flex lg:h-full lg:min-h-0 lg:flex-col'
      )
    "
  >
    <MediaPoster
      :media="media"
      :ratio="ratio"
      :playable="playable"
      :class="
        cn(
          stretch && 'lg:aspect-auto lg:min-h-0 lg:flex-1',
          compact && 'max-sm:rounded-xl'
        )
      "
    >
      <slot name="overlay" />
      <span
        v-if="compact && hasRating"
        class="absolute right-1 bottom-1 rounded-md bg-base/85 px-1 py-0.5 sm:hidden"
        :aria-label="`评分 ${media.rating}`"
      >
        <UiRating :value="media.rating" />
      </span>
    </MediaPoster>

    <div class="media-card-footer shrink-0 space-y-1.5 px-2 pt-3 pb-2">
      <slot name="footer">
        <h3
          class="truncate text-[0.8125rem] font-medium text-ink transition-colors duration-200 ease-out-soft group-hover:text-brand"
        >
          {{ media.title }}
        </h3>

        <template v-if="variant === 'stacked'">
          <p
            v-if="metadata"
            class="truncate text-xs text-ink-3"
          >
            {{ metadata }}
          </p>
          <UiRating
            :value="media.rating"
            :class="compact && 'media-card-footer-rating'"
          />
        </template>

        <div
          v-else-if="media.year || hasRating"
          class="flex items-center gap-2"
        >
          <UiRating
            :value="media.rating"
            :class="compact && 'media-card-footer-rating'"
          />
          <span
            v-if="media.year"
            class="text-xs text-ink-3"
            >{{ media.year }}</span
          >
        </div>
      </slot>
    </div>
  </NuxtLink>
</template>

<style scoped>
@media (max-width: 639px) {
  .media-card-compact {
    padding: 0.25rem;
    border-radius: var(--radius-poster);
  }
  .media-card-compact .media-card-footer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    gap: 0.125rem;
    padding: 0.375rem 0.25rem 0.25rem;
  }
  .media-card-compact :deep(.media-card-footer-rating) {
    display: none;
  }
  .media-card-compact .media-card-footer > :deep(*) {
    margin-block: 0;
  }
  .media-card-compact .media-card-footer > p {
    font-size: 0.625rem;
  }
}
</style>
