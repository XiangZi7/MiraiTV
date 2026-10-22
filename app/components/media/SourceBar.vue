<script setup lang="ts">
import type { FilterOption } from '~/constants/filters'

/** 播放源、线路和资源操作共用一行轻量工具栏。 */
defineProps<{
  sources: FilterOption[]
  lines: FilterOption[]
  source: string
  line: string
  pending?: boolean
  sourcesPending?: boolean
  error?: unknown
}>()

const emit = defineEmits<{
  'update:source': [string]
  'update:line': [string]
  refresh: []
  searchAll: []
}>()
</script>

<template>
  <div aria-label="播放源与线路">
    <div class="flex min-h-11 min-w-0 items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1.5 sm:gap-3">
        <UiSelect
          :model-value="source"
          :options="sources"
          placeholder="播放源"
          variant="plain"
          label="选择播放源"
          class="max-w-32 min-w-0 sm:max-w-44"
          @update:model-value="emit('update:source', $event)"
        />
        <span
          v-if="lines.length"
          aria-hidden="true"
          class="h-3.5 w-px shrink-0 bg-line-strong"
        />
        <UiSelect
          v-if="lines.length"
          :model-value="line"
          :options="lines"
          placeholder="线路"
          variant="plain"
          label="选择播放线路"
          class="max-w-36 min-w-0 sm:max-w-52"
          @update:model-value="emit('update:line', $event)"
        />
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          :disabled="pending"
          :aria-busy="pending || undefined"
          aria-label="刷新播放地址"
          title="刷新播放地址"
          class="inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors duration-200 hover:bg-brand-soft hover:text-brand disabled:cursor-wait disabled:opacity-60"
          @click="emit('refresh')"
        >
          <Icon
            name="lucide:refresh-cw"
            :class="
              cn('size-4', pending && 'animate-spin motion-reduce:animate-none')
            "
          />
        </button>
        <button
          type="button"
          :disabled="sourcesPending"
          :aria-busy="sourcesPending || undefined"
          title="搜索所有播放源，获取更多可用资源"
          class="inline-flex min-h-11 min-w-20 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-brand transition-colors duration-200 hover:bg-brand-soft disabled:cursor-wait disabled:opacity-60"
          @click="emit('searchAll')"
        >
          <Icon
            v-if="sourcesPending"
            name="lucide:loader-circle"
            class="size-3.5 animate-spin motion-reduce:animate-none"
          />
          {{ sourcesPending ? '查找中' : '获取全量' }}
        </button>
      </div>
    </div>
    <p
      v-if="error"
      role="status"
      class="mt-1 text-xs text-ink-3"
    >
      获取资源失败，可继续使用当前播放源或重试。
    </p>
  </div>
</template>
