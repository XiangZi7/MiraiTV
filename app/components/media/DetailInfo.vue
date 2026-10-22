<script setup lang="ts">
import type { MediaDetail, PlaybackSources } from '~/types/web-api'
import { DETAIL_TABS } from '~/constants/filters'

const props = defineProps<{
  detail: MediaDetail
  sources?: PlaybackSources | null
  sourcePending: boolean
  sourceError?: unknown
}>()
defineEmits<{ retrySources: []; searchAllSources: [] }>()
const selectedSource = defineModel<string>('source', { required: true })
const media = computed(() => props.detail.media)
// 响应式状态
const state = reactive({
  // 当前作品资料页签，选集始终同时展示
  tab: DETAIL_TABS[0]!,
  // 是否展开完整简介和移动端作品资料
  expanded: false,
})
const { tab, expanded } = toRefs(state)
const synopsis = computed(() => {
  const text = props.detail.media.synopsis ?? '暂无简介'
  return state.expanded ? text : text.split('[简介原文]')[0]!.trim()
})
</script>

<template>
  <section class="container-page pb-8 sm:pb-10">
    <div class="min-w-0">
      <div class="border-b border-line/60">
        <UiTabs
          v-model="tab"
          :items="DETAIL_TABS"
          size="lg"
        />
      </div>
      <MediaDetailEpisodes
        v-model:source="selectedSource"
        :key="media.id"
        :media-id="media.id"
        :sources="sources"
        :pending="sourcePending"
        :error="sourceError"
        class="mt-3"
        @retry="$emit('retrySources')"
        @search-all="$emit('searchAllSources')"
      />
      <div
        v-if="tab === '详情'"
        class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-10"
      >
        <div class="min-w-0">
          <p
            id="detail-synopsis"
            :class="
              cn(
                'text-sm leading-relaxed whitespace-pre-line text-ink-2',
                !expanded && 'line-clamp-2 lg:line-clamp-5'
              )
            "
          >
            {{ synopsis }}
          </p>
          <button
            v-if="media.synopsis && media.synopsis.length > 70"
            type="button"
            :aria-expanded="expanded"
            aria-controls="detail-synopsis"
            class="inline-flex min-h-11 cursor-pointer items-center gap-1 text-xs text-ink-2 transition-colors hover:text-ink"
            @click="expanded = !expanded"
          >
            {{ expanded ? '收起简介' : '展开简介' }}
            <Icon
              :name="expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'"
              class="size-3.5"
            />
          </button>
        </div>
        <dl
          :class="
            cn(
              'grid-cols-2 gap-x-6 gap-y-4 text-xs',
              expanded ? 'grid' : 'hidden lg:grid'
            )
          "
        >
          <div>
            <dt class="text-ink-3">上映年份</dt>
            <dd class="mt-1.5 text-ink-2">{{ media.year ?? '未知' }}</dd>
          </div>
          <div>
            <dt class="text-ink-3">制作地区</dt>
            <dd class="mt-1.5 text-ink-2">{{ media.region ?? '未知' }}</dd>
          </div>
          <div>
            <dt class="text-ink-3">片长</dt>
            <dd class="mt-1.5 text-ink-2">{{ media.duration ?? '未知' }}</dd>
          </div>
          <div>
            <dt class="text-ink-3">题材</dt>
            <dd class="mt-1.5 text-ink-2">
              {{ media.genres.join(' / ') || '未知' }}
            </dd>
          </div>
        </dl>
      </div>
      <div
        v-else-if="tab === '剧照'"
        class="mt-5"
      >
        <div
          v-if="detail.stills.length"
          class="grid grid-cols-2 gap-4"
        >
          <img
            v-for="(still, index) in detail.stills"
            :key="still"
            :src="still"
            :alt="`${media.title} 剧照 ${index + 1}`"
            class="aspect-video w-full rounded-card object-cover"
            loading="lazy"
          />
        </div>
        <UiEmpty
          v-else
          title="暂无剧照"
          description="元数据源尚未提供剧照。"
        />
      </div>
      <div
        v-else-if="tab === '演员'"
        class="mt-5 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4"
      >
        <UiEmpty
          v-if="!detail.cast.length"
          title="暂无演职人员"
        />
        <div
          v-for="person in detail.cast"
          :key="person.id"
          class="text-center"
        >
          <div
            class="mx-auto aspect-square w-full overflow-hidden rounded-full"
            :style="tintToGradient(person.tint)"
          />
          <p class="mt-3 truncate text-sm font-medium">{{ person.name }}</p>
          <p class="mt-1 truncate text-xs text-ink-3">{{ person.role }}</p>
        </div>
      </div>
      <div
        v-else
        class="mt-5 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4"
      >
        <UiEmpty
          v-if="!detail.related.length"
          title="暂无相关推荐"
        />
        <MediaCard
          v-for="item in detail.related"
          :key="item.id"
          :media="item"
          variant="inline"
          playable
        />
      </div>
    </div>
  </section>
</template>
