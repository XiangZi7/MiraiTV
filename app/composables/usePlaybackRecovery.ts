import type { MaybeRefOrGetter } from 'vue'
import type { PlaybackSelection } from '~/utils/playback-recovery'
import { playbackSelectionKey } from '~/utils/playback-recovery'

/** 地址解析和浏览器播放失败共用预算：首次失败后重试三次，再尝试下一线路/源。 */
export function usePlaybackRecovery(options: {
  current: MaybeRefOrGetter<PlaybackSelection | undefined>
  candidates: MaybeRefOrGetter<PlaybackSelection[]>
  retry: () => Promise<unknown>
  failed: () => boolean
  select: (target: PlaybackSelection) => Promise<unknown>
  delay?: number
}) {
  // 响应式状态
  const state = reactive({
    // 正在重试或切换来源
    recovering: false,
    // 自动恢复的进度及最终失败提示
    recoveryMessage: '',
  })
  const attempts = new Map<string, number>()
  const exhausted = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let disposed = false
  const identity = computed(() => {
    const current = toValue(options.current)
    return current ? playbackSelectionKey(current) : ''
  })
  function cancel() {
    generation += 1
    clearTimeout(timer)
    timer = undefined
    state.recovering = false
    state.recoveryMessage = ''
  }
  function reset() {
    cancel()
    attempts.clear()
    exhausted.clear()
  }
  function succeeded() {
    cancel()
    attempts.delete(identity.value)
  }
  function recover() {
    if (
      disposed ||
      state.recovering ||
      !identity.value ||
      exhausted.has(identity.value)
    )
      return
    const key = identity.value
    const current = generation
    const count = attempts.get(key) ?? 0
    state.recovering = true
    if (count < 3) {
      attempts.set(key, count + 1)
      state.recoveryMessage = `播放失败，正在重试 ${count + 1}/3…`
      timer = setTimeout(async () => {
        try {
          await options.retry()
        } catch {
          /* 失败状态由调用方保存。 */
        }
        if (disposed || generation !== current || identity.value !== key) return
        state.recovering = false
        if (options.failed()) recover()
        else state.recoveryMessage = ''
      }, options.delay ?? 750)
      return
    }
    exhausted.add(key)
    const candidates = toValue(options.candidates)
    const index = candidates.findIndex(
      item => playbackSelectionKey(item) === key
    )
    const remaining = [
      ...candidates.slice(index + 1),
      ...candidates.slice(0, Math.max(0, index)),
    ]
    const next = remaining.find(
      item => !exhausted.has(playbackSelectionKey(item))
    )
    if (!next) {
      state.recovering = false
      state.recoveryMessage =
        '当前集的所有线路均已重试，请稍后重试或手动选择其他来源。'
      return
    }
    state.recoveryMessage = '当前线路重试失败，正在切换下一播放源…'
    void options.select(next).catch(() => {
      if (generation === current) state.recovering = false
    })
  }
  watch(identity, cancel, { flush: 'sync' })
  onScopeDispose(() => {
    disposed = true
    cancel()
  })
  return { ...toRefs(state), recover, reset, succeeded }
}
