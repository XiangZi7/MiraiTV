<script setup lang="ts">
import type { HistoryRecord } from '~/types/web-api'
definePageMeta({ keepalive: true })
useSeo({ title: '观看历史', noindex: true })
const activity = useActivityStore()
const { loggedIn } = useAuth()
const library = useLibrary('history')
const {
  data,
  status,
  error,
  refresh,
  hasMore,
  loadingMore,
  loadMore,
  actionError,
} = library
await library.initial
const records = computed(() => library.items.value as HistoryRecord[])
// 响应式状态
const state = reactive({
  // 删除记录请求状态
  busy: false,
  // 删除失败提示
  mutationError: '',
})
const { busy, mutationError } = toRefs(state)
async function mutate(action: () => Promise<unknown>) {
  if (state.busy) return
  state.busy = true
  state.mutationError = ''
  try {
    await action()
    await refresh()
  } catch (error) {
    state.mutationError = apiErrorMessage(error)
  } finally {
    state.busy = false
  }
}
function removeRecord(id: string) {
  const record = records.value.find(item => item.id === id)
  if (record)
    void mutate(async () => {
      activity.removeHistory(record.media.id)
      await activity.sync()
    })
}
function clearAll() {
  if (window.confirm('确认清空全部观看历史？'))
    void mutate(async () => {
      activity.clearHistory()
      await activity.sync()
    })
}
</script>

<template>
  <div class="pb-4">
    <MediaPageHero
      title="观看历史"
      subtitle="记录你走过的每一段光影。"
      ambient
    >
      <template #actions>
        <UiButton
          variant="glass"
          size="sm"
          icon="lucide:trash-2"
          :loading="busy"
          :disabled="!records.length"
          @click="clearAll"
        >
          清空历史
        </UiButton>
      </template>
    </MediaPageHero>

    <section class="container-page mt-4">
      <UiRequestState
        :pending="status === 'pending'"
        :error="error"
        :partial="data?.partial"
        @retry="refresh"
      />
      <p
        v-if="!loggedIn"
        class="mb-4 text-sm text-ink-3"
      >
        观看记录保存在当前设备，登录后会自动同步到账号。
      </p>
      <p
        v-if="mutationError || actionError || activity.error"
        role="alert"
        class="text-sm text-danger"
      >
        {{
          mutationError ||
          actionError ||
          '同步暂未完成，记录已保存在本地，稍后会自动重试。'
        }}
      </p>
      <UiSectionHeader
        title="最近观看"
        kicker="Recently Watched"
      />

      <div class="mt-5">
        <MediaHistoryRow
          v-for="record in records"
          :key="record.id"
          :record="record"
          @remove="removeRecord"
        />
      </div>

      <UiEmpty
        v-if="!records.length && !error && status !== 'pending'"
        icon="lucide:history"
        title="还没有观看记录"
        description="看过的作品会出现在这里，方便你随时续播。"
      >
        <UiButton
          to="/"
          size="sm"
          >去首页</UiButton
        >
      </UiEmpty>
      <UiInfiniteLoader
        :has-more="hasMore"
        :pending="loadingMore || status === 'pending' || busy"
        :error="actionError"
        :disabled="!!error"
        :load-more="loadMore"
      />
    </section>
  </div>
</template>
