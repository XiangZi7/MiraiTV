<script setup lang="ts">
const activity = useActivityStore()
const { loggedIn } = useAuth()
const route = useRoute()
const open = shallowRef(false)
const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<{ $el: HTMLButtonElement }>('trigger')
const panelId = useId()
const records = computed(() =>
  activity.history.slice(0, 5).map(record => ({
    ...record,
    playbackProgress: watchProgress(record),
  }))
)
onClickOutside(root, () => {
  open.value = false
})
watch(
  () => route.fullPath,
  () => {
    open.value = false
  }
)
function toggle() {
  open.value = !open.value
  if (open.value) void activity.sync()
}
function close() {
  open.value = false
  trigger.value?.$el.focus()
}
function onFocusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null))
    open.value = false
}
</script>

<template>
  <div
    ref="root"
    class="relative shrink-0"
    @keydown.esc.stop="close"
    @focusout="onFocusOut"
  >
    <UiIconButton
      ref="trigger"
      icon="lucide:history"
      label="观看记录"
      :aria-expanded="open"
      :aria-controls="open ? panelId : undefined"
      @click="toggle"
    />
    <section
      v-if="open"
      :id="panelId"
      aria-label="最近观看记录"
      class="glass-surface glass-popover absolute top-full right-0 z-30 mt-3 w-[min(21rem,calc(100vw-2rem))] rounded-2xl p-4"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-medium text-ink">最近观看</h2>
        <NuxtLink
          to="/history"
          class="text-xs text-ink-3 hover:text-brand"
          >查看全部</NuxtLink
        >
      </div>
      <p class="mt-1 text-xs text-ink-3">
        {{
          loggedIn
            ? '观看记录自动同步到账号'
            : '观看记录保存在此设备，登录后同步'
        }}
      </p>
      <p
        v-if="activity.error"
        role="status"
        class="mt-3 text-xs text-ink-3"
      >
        同步暂未完成，记录已保存在本地。<button
          type="button"
          class="ml-1 cursor-pointer text-brand"
          @click="activity.sync()"
        >
          重试
        </button>
      </p>
      <ul
        v-if="records.length"
        class="mt-3 space-y-1"
      >
        <li
          v-for="record in records"
          :key="record.media.id"
        >
          <NuxtLink
            :to="{
              path: `/play/${record.media.id}`,
              query: record.episodeId
                ? { episodeId: record.episodeId }
                : undefined,
            }"
            class="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/8"
          >
            <div class="w-9 shrink-0">
              <MediaPoster
                :media="record.media"
                compact
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-ink">{{ record.media.title }}</p>
              <p class="mt-1 truncate text-xs text-ink-3">
                {{ record.episodeLabel ? `${record.episodeLabel} · ` : ''
                }}{{ record.playbackProgress.label }}
              </p>
              <UiProgress
                :value="record.playbackProgress.progress"
                size="xs"
                class="mt-2"
              />
            </div>
            <Icon
              name="lucide:play"
              class="size-4 text-ink-3"
              aria-hidden="true"
            />
          </NuxtLink>
        </li>
      </ul>
      <p
        v-else
        class="py-8 text-center text-sm text-ink-3"
      >
        还没有观看记录
      </p>
    </section>
  </div>
</template>
