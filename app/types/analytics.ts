/** GA4 业务事件契约；新增埋点时在此扩展事件和参数。 */
export interface PlaybackAnalyticsContext {
  media_id: string
  media_title: string
  media_type?: string | null
  source_id: string
  source_name?: string
  series_id?: string
  episode_id: string
  episode_title?: string
  episode_number?: number | null
  line_id?: string | null
  line_name?: string
  quality?: string
}

export interface AnalyticsEvents {
  search: { search_term: string; search_location?: string }
  video_start: PlaybackAnalyticsContext & {
    video_current_time?: number
    video_duration?: number
  }
  video_complete: PlaybackAnalyticsContext & {
    video_current_time?: number
    video_duration?: number
  }
  playback_select: Partial<PlaybackAnalyticsContext> & {
    selection_type: 'episode' | 'source' | 'line' | 'quality'
    selected_value: string
    selected_label?: string
  }
}

export type AnalyticsEventName = keyof AnalyticsEvents
export type AnalyticsTracker = <N extends AnalyticsEventName>(
  event: N,
  params: AnalyticsEvents[N]
) => boolean

export interface AnalyticsWindow {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}
