import type { MaybeRefOrGetter } from 'vue'
import type { PlaybackAnalyticsContext } from '~/types/analytics'

/** 同一资源暂停、缓冲、恢复时不重复计数；刷新签名地址也不产生新观看。 */
export function usePlaybackAnalytics(
  context: MaybeRefOrGetter<PlaybackAnalyticsContext | null>
) {
  const { track } = useAnalytics()
  let startedKey = ''
  let completedKey = ''
  function identity(data: PlaybackAnalyticsContext) {
    return JSON.stringify([
      data.media_id,
      data.source_id,
      data.series_id,
      data.episode_id,
      data.line_id,
      data.quality,
    ])
  }
  function started(position: number, duration: number) {
    const data = toValue(context)
    if (!data) return
    const key = identity(data)
    if (key === startedKey) return
    startedKey = key
    completedKey = ''
    track('video_start', {
      ...data,
      video_current_time: Math.max(0, Math.floor(position)),
      video_duration: Math.max(0, Math.floor(duration)),
    })
  }
  function completed(position: number, duration: number) {
    const data = toValue(context)
    if (!data) return
    const key = identity(data)
    if (startedKey !== key || completedKey === key) return
    completedKey = key
    track('video_complete', {
      ...data,
      video_current_time: Math.max(0, Math.floor(position)),
      video_duration: Math.max(0, Math.floor(duration)),
    })
  }
  function qualitySelected(value: string, label: string) {
    const data = toValue(context)
    if (!data) return
    track('playback_select', {
      ...data,
      selection_type: 'quality',
      selected_value: value,
      selected_label: label,
    })
  }
  return { started, completed, qualitySelected }
}
