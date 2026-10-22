import type { MaybeRefOrGetter } from 'vue'

export function useFavorite(mediaId: MaybeRefOrGetter<string>) {
  const api = useApi()
  const auth = useAuth()
  const key = computed(
    () =>
      `private:favorite:${auth.user.value?.id ?? 'guest'}:${toValue(mediaId)}`
  )
  const result = useAsyncData(key, () =>
    auth.loggedIn.value
      ? api.favoriteStatus(toValue(mediaId))
      : Promise.resolve({ collected: false, notifyEnabled: false })
  )
  // 响应式状态
  const state = reactive({
    // 收藏操作提交状态
    saving: false,
    // 收藏操作错误
    actionError: '',
  })
  const collected = computed(() => result.data.value?.collected ?? false)
  async function toggle() {
    if (!auth.requireLogin() || state.saving) return
    state.saving = true
    state.actionError = ''
    try {
      if (collected.value) await api.unfavorite(toValue(mediaId))
      else await api.favorite({ mediaId: toValue(mediaId) })
      await result.refresh()
      clearNuxtData(key =>
        [
          'private:watchlist:',
          'private:profile:',
          'private:profile-preview:',
          'private:home:',
        ].some(prefix => key.startsWith(prefix))
      )
    } catch (error) {
      state.actionError = apiErrorMessage(error)
    } finally {
      state.saving = false
    }
  }
  return { ...result, initial: result, collected, ...toRefs(state), toggle }
}
