import type {
  AnalyticsEventName,
  AnalyticsEvents,
  AnalyticsTracker,
  AnalyticsWindow,
} from '~/types/analytics'

const EVENT_NAMES = new Set<AnalyticsEventName>([
  'search',
  'video_start',
  'video_complete',
  'playback_select',
])
const PARAM_NAMES = new Set([
  'search_term',
  'search_location',
  'media_id',
  'media_title',
  'media_type',
  'source_id',
  'source_name',
  'series_id',
  'episode_id',
  'episode_title',
  'episode_number',
  'line_id',
  'line_name',
  'quality',
  'video_current_time',
  'video_duration',
  'selection_type',
  'selected_value',
  'selected_label',
])

/** 用户输入只保留展示文本；明显的邮箱、电话号码不作为搜索词上传。 */
export function analyticsText(value: string, redact = false) {
  const text = value.trim()
  return (
    redact
      ? text
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
          .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[redacted]')
      : text
  ).slice(0, 100)
}

/** 先初始化队列，脚本仍由插件延迟下载；每个事件明确发往本站 GA 属性。 */
export function createAnalyticsTracker(
  target: AnalyticsWindow,
  id: string,
  pageContext?: () => { page_location: string; page_title: string }
) {
  let loaded = false
  let queued = 0
  target.dataLayer ??= []
  target.gtag ??= function (..._args: unknown[]) {
    target.dataLayer!.push(arguments)
  }
  target.gtag('js', new Date())
  target.gtag('config', id)

  const track: AnalyticsTracker = <N extends AnalyticsEventName>(
    event: N,
    params: AnalyticsEvents[N]
  ) => {
    if (!EVENT_NAMES.has(event) || (!loaded && queued >= 100)) return false
    const clean: Record<string, string | number> = {}
    for (const [name, value] of Object.entries(params)) {
      if (!PARAM_NAMES.has(name)) continue
      if (typeof value === 'string') {
        const text = analyticsText(value, name === 'search_term')
        if (text) clean[name] = text
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        clean[name] = value
      }
    }
    if (event === 'search' && !clean.search_term) return false
    try {
      target.gtag?.('event', event, {
        ...clean,
        ...pageContext?.(),
        send_to: id,
      })
      if (!loaded) queued += 1
      return true
    } catch {
      // 统计脚本被拦截或异常时不影响搜索和播放。
      return false
    }
  }
  return {
    track,
    markLoaded: () => {
      loaded = true
    },
  }
}
