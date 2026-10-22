<script setup lang="ts">
withDefaults(
  defineProps<{
    placeholder?: string
    label?: string
    size?: 'sm' | 'md' | 'lg'
    /** 右侧提交按钮，用于探索页大搜索框 */
    withSubmit?: boolean
  }>(),
  {
    placeholder: '搜索电影、剧集、动漫…',
    label: '站内搜索',
    size: 'md',
  }
)

const keyword = defineModel<string>({ default: '' })
const inputId = useId()
const historyId = `${inputId}-history`
const activity = useActivityStore()
const form = useTemplateRef<HTMLFormElement>('form')
const focused = shallowRef(false)
const activeIndex = shallowRef(-1)
const recentSearches = computed(() =>
  activity.searches
    .filter(item =>
      item.keyword
        .toLocaleLowerCase()
        .includes(keyword.value.trim().toLocaleLowerCase())
    )
    .slice(0, 8)
)
const showHistory = computed(
  () => focused.value && recentSearches.value.length > 0
)
onClickOutside(form, () => {
  focused.value = false
})
watch(keyword, () => {
  activeIndex.value = -1
})

function submit(value = keyword.value) {
  keyword.value = value
  focused.value = false
  activity.recordSearch(value)
  emit('submit', value)
}

function handleKeys(event: KeyboardEvent) {
  if (event.key === 'Escape') focused.value = false
  if (
    ['ArrowDown', 'ArrowUp'].includes(event.key) &&
    recentSearches.value.length
  ) {
    event.preventDefault()
    focused.value = true
    const length = recentSearches.value.length
    activeIndex.value =
      (activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + length) %
      length
  }
  if (event.key === 'Enter' && showHistory.value && activeIndex.value >= 0) {
    event.preventDefault()
    const selected = recentSearches.value[activeIndex.value]
    if (selected) submit(selected.keyword)
  }
}

function onFocusOut(event: FocusEvent) {
  if (!form.value?.contains(event.relatedTarget as Node | null))
    focused.value = false
}

const emit = defineEmits<{
  submit: [keyword: string]
}>()

const SIZE_CLASS = {
  sm: 'h-8 pl-8 pr-3 text-xs',
  md: 'h-9 pl-9 pr-9 text-[0.8125rem]',
  lg: 'h-13 pl-12 pr-13 text-sm',
} as const

const ICON_POSITION = {
  sm: 'left-2.5 size-3.5',
  md: 'left-3 size-4',
  lg: 'left-4 size-[1.125rem]',
} as const
</script>

<template>
  <form
    ref="form"
    class="relative w-full"
    :class="{ 'z-40': showHistory }"
    role="search"
    :aria-label="label"
    action="/search"
    method="get"
    @submit.prevent="submit()"
    @focusout="onFocusOut"
  >
    <label
      :for="inputId"
      class="sr-only"
      >{{ label }}</label
    >
    <Icon
      name="lucide:search"
      aria-hidden="true"
      :class="
        cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-3',
          ICON_POSITION[size]
        )
      "
    />

    <input
      :id="inputId"
      v-model="keyword"
      type="search"
      name="q"
      enterkeyhint="search"
      autocomplete="off"
      maxlength="100"
      :aria-expanded="showHistory"
      :aria-controls="showHistory ? historyId : undefined"
      :aria-activedescendant="
        showHistory && activeIndex >= 0
          ? `${historyId}-${activeIndex}`
          : undefined
      "
      @focus="focused = true"
      @input="focused = true"
      @keydown="handleKeys"
      :placeholder="placeholder"
      :class="
        cn(
          'glass-surface glass-control w-full rounded-full text-ink placeholder:text-ink-3',
          'transition-colors duration-200 ease-out-soft',
          'hover:border-line-strong focus:border-brand/60',
          '[&::-webkit-search-cancel-button]:appearance-none',
          SIZE_CLASS[size]
        )
      "
    />

    <div
      v-if="showHistory"
      :id="historyId"
      class="glass-surface glass-popover absolute inset-x-0 top-full z-30 mt-2 max-h-[min(24rem,50dvh)] overflow-y-auto overscroll-contain rounded-2xl p-2"
      aria-label="搜索历史"
    >
      <div
        class="flex items-center justify-between px-2 py-2 text-xs text-ink-3"
      >
        <span>搜索历史</span>
        <button
          type="button"
          class="cursor-pointer hover:text-ink"
          @click="activity.clearSearches()"
        >
          清空
        </button>
      </div>
      <div
        v-for="(item, index) in recentSearches"
        :key="item.keyword"
        class="flex items-center rounded-lg"
        :class="activeIndex === index && 'bg-brand-soft'"
      >
        <button
          :id="`${historyId}-${index}`"
          type="button"
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
          @click="submit(item.keyword)"
        >
          <Icon
            name="lucide:history"
            class="size-3.5 shrink-0 text-ink-3"
            aria-hidden="true"
          />
          <span class="truncate">{{ item.keyword }}</span>
        </button>
        <UiIconButton
          icon="lucide:x"
          :label="`删除搜索记录：${item.keyword}`"
          size="sm"
          @click="activity.removeSearch(item.keyword)"
        />
      </div>
    </div>

    <UiIconButton
      v-if="withSubmit"
      icon="lucide:arrow-right"
      label="搜索"
      type="submit"
      variant="brand"
      :size="size === 'lg' ? 'lg' : 'sm'"
      :class="
        cn(
          'absolute top-1/2 -translate-y-1/2',
          size === 'lg' ? 'right-2' : 'right-1'
        )
      "
    />
  </form>
</template>
