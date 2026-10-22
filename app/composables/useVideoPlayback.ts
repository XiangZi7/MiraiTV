import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import type Hls from 'hls.js'
import type { PlaybackResult } from '~/types/web-api'

/** 浏览器播放内核；HLS 仅在挂载后加载，SSR 不接触 window。 */
export function useVideoPlayback(
  video: Readonly<ShallowRef<HTMLVideoElement | null>>,
  playback: MaybeRefOrGetter<PlaybackResult | null | undefined>,
  resume: MaybeRefOrGetter<number>
) {
  // 响应式状态
  const state = reactive({
    // 实际播放状态
    playing: false,
    // 视频数据首次加载、播放等待或跳转缓冲状态
    buffering: false,
    // 进度条百分比，跳转时立即反映用户选择的位置
    progress: 0,
    // 正在等待媒体完成跳转的目标位置，防止旧 timeupdate 把进度拉回
    seekTarget: null as number | null,
    // 实际播放位置（秒）
    position: 0,
    // 媒体时长（秒）
    duration: 0,
    // 音量百分比
    volume: 70,
    // 用户选择的 URL 索引
    quality: '0',
    // 播放倍速
    speed: '1.0x',
    // 字幕轨道索引
    subtitle: '关闭',
    // 播放错误提示
    playbackError: '',
  })
  let hls: Hls | undefined
  let generation = 0
  let resumeAt = 0
  let previousIdentity = ''
  let refreshResume = 0
  // 每份新资源只尝试一次自动播放，用户暂停后不被后续 canplay 重新唤起。
  let autoplayPending = false
  let playAttempt = 0
  const url = computed(
    () => toValue(playback)?.urls[Number(state.quality)]?.url
  )
  async function load() {
    const current = ++generation
    playAttempt += 1
    autoplayPending = false
    hls?.destroy()
    hls = undefined
    const element = video.value
    if (!element) return
    element.pause()
    element.removeAttribute('src')
    element.load()
    state.playbackError = ''
    state.buffering = false
    state.seekTarget = null
    const source = url.value
    if (!source) return
    autoplayPending = true
    state.buffering = true
    element.volume = state.volume / 100
    element.playbackRate = Number.parseFloat(state.speed)
    const hlsSource =
      /\.m3u8(?:$|[?#])/i.test(source) ||
      /\/m3u8\/getM3u8(?:$|[?#])/i.test(source)
    if (hlsSource) {
      const { default: Hls } = await import('hls.js')
      if (generation !== current) return
      if (!Hls.isSupported()) {
        if (element.canPlayType('application/vnd.apple.mpegurl')) {
          element.src = source
          element.load()
          return
        }
        state.buffering = false
        state.playbackError = '当前浏览器不支持此视频格式。'
        return
      }
      const headers = toValue(playback)?.headers ?? {}
      hls = new Hls({
        xhrSetup(xhr) {
          for (const [key, value] of Object.entries(headers)) {
            if (
              !['referer', 'origin', 'host', 'cookie', 'user-agent'].includes(
                key.toLowerCase()
              )
            )
              xhr.setRequestHeader(key, value)
          }
        },
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (generation !== current) return
        if (data.fatal) {
          console.warn('Video playback failed', {
            type: data.type,
            details: data.details,
          })
          state.buffering = false
          state.playbackError = '视频加载失败，请刷新播放地址或切换线路。'
        }
      })
      hls.loadSource(source)
      hls.attachMedia(element)
    } else {
      element.src = source
      element.load()
    }
  }
  onMounted(() => {
    watch(
      () => toValue(playback),
      result => {
        if (!result) {
          refreshResume = state.position
          return
        }
        const identity = `${result.mediaId}:${result.source}:${result.episode.id}`
        resumeAt =
          identity === previousIdentity
            ? refreshResume || state.position
            : toValue(resume)
        previousIdentity = identity
        refreshResume = 0
        state.quality = '0'
        state.position = 0
        state.duration = 0
        state.progress = 0
        state.subtitle = '关闭'
      },
      { immediate: true, flush: 'sync' }
    )
    watch(
      () => [url.value, toValue(playback)],
      () => {
        void load()
      },
      { immediate: true, flush: 'post' }
    )
  })
  onBeforeUnmount(() => {
    generation += 1
    playAttempt += 1
    autoplayPending = false
    hls?.destroy()
  })
  function sync() {
    const element = video.value
    if (!element) return
    state.playing = !element.paused && !element.ended
    const actualPosition = Number.isFinite(element.currentTime)
      ? element.currentTime
      : 0
    // 某些视频内核会在 seek 完成前上报旧时间；保留最新目标，直到落点确认。
    if (
      state.seekTarget != null &&
      !element.seeking &&
      element.readyState >= 2 &&
      Math.abs(actualPosition - state.seekTarget) < 0.5
    )
      state.seekTarget = null
    state.position = state.seekTarget ?? actualPosition
    state.duration = Number.isFinite(element.duration) ? element.duration : 0
    state.progress = state.duration
      ? Math.min(100, (state.position / state.duration) * 100)
      : 0
  }
  function metadata() {
    if (video.value && resumeAt > 0 && Number.isFinite(video.value.duration)) {
      video.value.currentTime = Math.min(
        resumeAt,
        Math.max(0, video.value.duration - 1)
      )
      resumeAt = 0
    }
    sync()
  }
  function waiting() {
    if (url.value && video.value && !video.value.ended) state.buffering = true
  }
  function ready() {
    state.buffering = false
  }
  function canPlay() {
    ready()
    if (autoplayPending && video.value && video.value.readyState >= 3) {
      autoplayPending = false
      return startPlaying(true)
    }
  }
  function dataReady() {
    const element = video.value
    // 暂停预加载有首帧即可；播放中的等待由 canplay / playing 结束。
    if (element?.paused && !element.seeking && element.readyState >= 2) ready()
  }
  function seeked() {
    sync()
    const element = video.value
    if (
      element &&
      !element.seeking &&
      state.seekTarget == null &&
      element.readyState >= (element.paused ? 2 : 3)
    )
      ready()
  }
  function stalled() {
    const element = video.value
    // 后台下载停顿但已有可播放数据时，不显示缓冲提示。
    if (element && !element.paused && element.readyState < 3) waiting()
  }
  async function startPlaying(automatic = false) {
    const element = video.value
    if (!element || !url.value) return
    const current = generation
    const attempt = ++playAttempt
    state.buffering = element.readyState < 3
    try {
      await element.play()
    } catch (error) {
      // 旧资源的 play() 可能在切换后才拒绝，不能覆盖新资源的状态。
      if (current !== generation || attempt !== playAttempt) return
      ready()
      const name = error instanceof DOMException ? error.name : ''
      // 浏览器限制有声自动播放时保留播放按钮，用户可直接点播。
      if (name !== 'AbortError' && !(automatic && name === 'NotAllowedError'))
        state.playbackError = '无法开始播放，请重试或切换线路。'
    }
  }
  function play() {
    autoplayPending = false
    return startPlaying()
  }
  async function togglePlaying() {
    const element = video.value
    if (!element || !url.value) return
    autoplayPending = false
    if (!element.paused) {
      playAttempt += 1
      element.pause()
      ready()
    } else {
      await startPlaying()
    }
  }
  function seekTo(seconds: number) {
    const element = video.value
    if (!element || !state.duration || !Number.isFinite(seconds)) return
    const target = Math.min(state.duration, Math.max(0, seconds))
    state.seekTarget = target
    state.position = target
    state.progress = (target / state.duration) * 100
    try {
      element.currentTime = target
    } catch {
      // 媒体已被释放等情况下，恢复实际位置。
      state.seekTarget = null
      sync()
    }
  }
  function seek(percent: number) {
    seekTo((percent / 100) * state.duration)
  }
  /** 连续快进以最新目标累加，不等待上一段缓冲完成。 */
  function seekBy(seconds: number) {
    seekTo(state.position + seconds)
  }
  function setVolume(value: number) {
    state.volume = Math.min(100, Math.max(0, Math.round(value)))
    if (video.value) video.value.volume = state.volume / 100
  }
  function pick(panel: 'quality' | 'speed' | 'subtitle', value: string) {
    if (panel === 'quality') {
      const source = toValue(playback)?.urls[Number(value)]?.url
      if (!source) return
      resumeAt = state.position
      const unchanged = source === url.value
      state.quality = value
      // 同一地址的画质别名不会触发 URL 侦听，也应响应这次播放选择。
      if (unchanged) {
        autoplayPending = false
        void startPlaying()
      }
    }
    if (panel === 'speed') {
      state.speed = value
      if (video.value) video.value.playbackRate = Number.parseFloat(value)
    }
    if (panel === 'subtitle') {
      state.subtitle = value
      if (video.value)
        Array.from(video.value.textTracks).forEach((track, index) => {
          track.mode = String(index) === value ? 'showing' : 'disabled'
        })
    }
  }
  function mediaError() {
    if (url.value) {
      ready()
      state.playbackError = '视频无法播放，请刷新播放地址或切换线路。'
    }
  }
  return {
    ...toRefs(state),
    togglePlaying,
    play,
    seek,
    seekBy,
    setVolume,
    sync,
    metadata,
    canPlay,
    waiting,
    ready,
    dataReady,
    seeked,
    stalled,
    pick,
    mediaError,
  }
}
