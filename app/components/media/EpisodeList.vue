<script setup lang="ts">
import type { Episode } from '~/types/media'

/**
 * 选集面板：集数胶囊网格 + 正序 / 倒序切换
 * 单集保留紧凑宽度，多集自动换行
 */
const props = defineProps<{
  episodes: Episode[]
  /** 当前播放的集序号 */
  current: number
}>()

const emit = defineEmits<{
  select: [index: number]
}>()

// 响应式状态
const state = reactive({
  // 是否倒序展示
  desc: false,
})

const { desc } = toRefs(state)

/** 按当前排序方向输出的集列表 */
const ordered = computed(() =>
  state.desc ? [...props.episodes].reverse() : props.episodes
)

/** 单条目保留片名 / 正片标签 */
const isSingle = computed(() => props.episodes.length === 1)

function toggleOrder() {
  state.desc = !state.desc
}
</script>

<template>
  <section
    aria-label="选集"
    class="border-t border-line/60 pt-4"
  >
    <div class="flex items-center justify-between gap-3 px-1.5 pt-1 pb-3">
      <h2 class="text-[0.8125rem] font-medium text-ink">
        选集
        <span class="ml-1.5 font-normal text-ink-3"
          >共 {{ episodes.length }} 集</span
        >
      </h2>

      <button
        v-if="!isSingle"
        type="button"
        class="inline-flex cursor-pointer items-center gap-1 text-xs text-ink-3 transition-colors duration-200 ease-out-soft hover:text-ink"
        :aria-label="desc ? '切换为正序' : '切换为倒序'"
        @click="toggleOrder"
      >
        <Icon
          :name="
            desc
              ? 'lucide:arrow-down-narrow-wide'
              : 'lucide:arrow-up-narrow-wide'
          "
          class="size-3.5"
        />
        {{ desc ? '倒序' : '正序' }}
      </button>
    </div>

    <!-- 集数网格，超过一屏时内部滚动 -->
    <div
      class="scrollbar-none flex max-h-64 flex-wrap gap-2 overflow-y-auto px-1.5 pb-1"
    >
      <button
        v-for="episode in ordered"
        :key="episode.id"
        type="button"
        :aria-current="episode.index === current ? 'true' : undefined"
        :aria-label="episode.title"
        :title="
          episode.duration
            ? `${episode.title} · ${episode.duration}`
            : episode.title
        "
        :class="
          cn(
            'flex h-11 cursor-pointer items-center justify-center rounded-lg text-xs font-medium tabular-nums transition-all duration-200 ease-out-soft',
            isSingle ? 'max-w-48 min-w-24 px-4' : 'w-14 sm:w-16',
            episode.index === current
              ? 'glass-surface glass-control glass-accent'
              : 'glass-surface glass-control text-ink-2 hover:text-ink'
          )
        "
        @click="emit('select', episode.index)"
      >
        <span class="truncate">{{
          isSingle ? episode.title : episode.index
        }}</span>
      </button>
    </div>
  </section>
</template>
