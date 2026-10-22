<script setup lang="ts">
import type { MediaItem } from '~/types/media'
import type { FilterOption } from '~/constants/filters'
import type {
  HistorySave,
  PlaybackResult,
  SourceEpisode,
} from '~/types/web-api'
type SettingPanel = 'quality' | 'speed' | 'subtitle'
const props = defineProps<{
  media: MediaItem
  episodeLabel: string
  playback?: PlaybackResult | null
  sourceEpisode?: SourceEpisode
  sourceName?: string
  seriesId?: string
  lines?: FilterOption[]
  line?: string
  resumeSeconds?: number
  hasPrev?: boolean
  hasNext?: boolean
  requestPending?: boolean
  requestError?: string
  recoveryMessage?: string
  unavailableMessage?: string
}>()
const emit = defineEmits<{
  next: []
  prev: []
  retry: []
  failure: []
  started: []
  'update:line': [value: string]
  progress: [
    position: number,
    duration: number,
    force: boolean,
    played: Pick<
      HistorySave,
      'mediaId' | 'episodeId' | 'episodeLabel' | 'episodeNumber'
    >,
  ]
}>()
const SETTING_PANELS = computed<{ key: SettingPanel; label: string }[]>(() => [
  { key: 'quality', label: props.lines?.length ? '线路 / 画质' : '画质' },
  { key: 'speed', label: '倍速' },
  { key: 'subtitle', label: '字幕' },
])
const currentLineLabel = computed(
  () => props.lines?.find(item => item.value === props.line)?.label
)
// 有些源把线路名直接作为唯一的画质名；菜单只显示一次，避免重复。
const showQualityChoices = computed(() => {
  const urls = props.playback?.urls ?? []
  return (
    !props.lines?.length ||
    urls.length > 1 ||
    (urls.length === 1 && urls[0]?.quality !== currentLineLabel.value)
  )
})
// 响应式状态
const state = reactive({
  // 浏览器挂载状态
  mounted: false,
  // 当前设置浮层
  openPanel: null as SettingPanel | null,
})
const { openPanel } = toRefs(state)
const playerRef = useTemplateRef<HTMLElement>('playerRef')
const video = useTemplateRef<HTMLVideoElement>('video')
const controls = useVideoPlayback(
  video,
  () => props.playback,
  () => props.resumeSeconds ?? 0
)
const { playing, buffering, progress, volume, playbackError } = controls
watch(playbackError, error => {
  if (error && !props.requestPending) emit('failure')
})
defineExpose({ play: controls.play })
const playbackAnalytics = usePlaybackAnalytics(() => {
  const result = props.playback
  if (!result || props.requestPending) return null
  return {
    media_id: props.media.id,
    media_title: props.media.title,
    media_type: props.media.kind,
    source_id: result.source,
    source_name: props.sourceName,
    series_id: props.seriesId,
    episode_id: result.episode.id,
    episode_title: result.episode.title,
    episode_number: result.episode.index,
    line_id: props.line ?? result.line,
    line_name: currentLineLabel.value,
    quality: result.urls[Number(controls.quality.value)]?.quality,
  }
})
function onPlaying() {
  emit('started')
  controls.ready()
  controls.sync()
  playbackAnalytics.started(controls.position.value, controls.duration.value)
}
function onEnded() {
  stopPlaying()
  playbackAnalytics.completed(controls.position.value, controls.duration.value)
}
const errorMessage = computed(() => props.requestError || playbackError.value)
const showStatus = computed(
  () => props.requestPending || errorMessage.value || props.unavailableMessage
)
watch(
  () => props.requestPending,
  pending => {
    if (pending) video.value?.pause()
  }
)
const {
  isFullscreen,
  isSupported: supportsFullscreen,
  toggle: toggleFullscreen,
} = useFullscreen(playerRef, { autoExit: true })
const canFullscreen = computed(() => state.mounted && supportsFullscreen.value)

// 播放中鼠标静止一段时间后收起控制条，让画面独占视野
const idle = shallowRef(false)
const { start: countIdle, stop: cancelIdle } = useTimeoutFn(
  () => {
    idle.value = true
  },
  2600,
  { immediate: false }
)
const chromeHidden = computed(() => idle.value && playing.value)
/** 任何交互都唤醒控制条；只有正在播放且没有浮层时才重新计时 */
function wake() {
  idle.value = false
  cancelIdle()
  if (playing.value && !state.openPanel && !showStatus.value) countIdle()
}
watch([playing, openPanel], wake)
onMounted(() => {
  state.mounted = true
})
onClickOutside(playerRef, () => {
  state.openPanel = null
})
function togglePlaying() {
  void controls.togglePlaying()
}
function toggleMute() {
  controls.setVolume(controls.volume.value > 0 ? 0 : 70)
}
async function togglePlayerFullscreen() {
  try {
    await toggleFullscreen()
  } catch {
    /* 保留内嵌布局 */
  }
}
function togglePanel(panel: SettingPanel) {
  state.openPanel = state.openPanel === panel ? null : panel
}
/** 播放器获得焦点后的快捷键；滑杆自身的方向键行为保持原生 */
function handleKeys(event: KeyboardEvent) {
  if ((event.target as HTMLElement).tagName === 'INPUT') return
  const actions: Record<string, () => void> = {
    ArrowLeft: () => controls.seekBy(-5),
    ArrowRight: () => controls.seekBy(5),
    ArrowUp: () => controls.setVolume(volume.value + 10),
    ArrowDown: () => controls.setVolume(volume.value - 10),
    KeyF: () => void togglePlayerFullscreen(),
    KeyM: toggleMute,
  }
  const run = actions[event.code]
  if (!run) return
  event.preventDefault()
  wake()
  run()
}
function pickLine(value: string) {
  if (props.requestPending) return
  if (value !== props.line) emit('update:line', value)
  else void controls.play()
  state.openPanel = null
}
function settingLabel(panel: SettingPanel) {
  const label = optionLabel(panel, PANEL_CONFIG.value[panel].current())
  if (panel !== 'quality' || !currentLineLabel.value) return label
  return showQualityChoices.value
    ? `${currentLineLabel.value} · ${label}`
    : currentLineLabel.value
}
function pick(panel: SettingPanel, value: string) {
  if (panel === 'quality' && value !== controls.quality.value)
    playbackAnalytics.qualitySelected(value, optionLabel(panel, value))
  controls.pick(panel, value)
  state.openPanel = null
}
function publishProgress(force: boolean) {
  emit('progress', controls.position.value, controls.duration.value, force, {
    mediaId: props.media.id,
    episodeId: props.sourceEpisode?.id,
    episodeLabel: props.sourceEpisode?.title,
    episodeNumber: props.sourceEpisode?.index,
  })
}
function sync(force = false) {
  controls.sync()
  publishProgress(force)
}
function stopPlaying() {
  controls.ready()
  sync(true)
}
function flushProgress() {
  publishProgress(true)
}
onBeforeUnmount(flushProgress)
useEventListener('pagehide', flushProgress)
function format(seconds: number) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = Math.floor(seconds % 60)
  return `${h ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
const timeLabel = computed(
  () =>
    `${format(controls.position.value)} / ${format(controls.duration.value)}`
)
const PANEL_CONFIG = computed(() => ({
  quality: {
    options: showQualityChoices.value
      ? (props.playback?.urls ?? []).map((_, i) => String(i))
      : [],
    current: () => controls.quality.value,
  },
  speed: {
    options: ['0.5x', '1.0x', '1.25x', '1.5x', '2.0x'],
    current: () => controls.speed.value,
  },
  subtitle: {
    options: [
      '关闭',
      ...(props.playback?.subtitles ?? []).map((_, i) => String(i)),
    ],
    current: () => controls.subtitle.value,
  },
}))
function optionLabel(panel: SettingPanel, value: string) {
  if (panel === 'quality')
    return props.playback?.urls[Number(value)]?.quality ?? '画质'
  if (panel === 'subtitle' && value !== '关闭')
    return (
      props.playback?.subtitles[Number(value)]?.label ??
      props.playback?.subtitles[Number(value)]?.language ??
      `字幕 ${Number(value) + 1}`
    )
  return value
}
</script>

<template>
  <div
    ref="playerRef"
    role="region"
    tabindex="0"
    aria-label="视频播放器"
    :aria-busy="requestPending || buffering"
    data-player
    :class="
      cn(
        'cinema-surface group/player relative isolate aspect-video overflow-hidden rounded-card bg-black',
        isFullscreen && 'h-full w-full rounded-none',
        chromeHidden && 'cursor-none'
      )
    "
    @keydown="handleKeys"
    @mousemove="wake"
    @mouseleave="wake"
    @touchstart.passive="wake"
  >
    <video
      ref="video"
      :aria-label="`${media.title} ${episodeLabel}`"
      class="absolute inset-0 size-full object-contain"
      playsinline
      preload="metadata"
      :poster="media.backdrop ?? media.poster ?? undefined"
      @loadstart="controls.waiting"
      @loadedmetadata="controls.metadata"
      @loadeddata="controls.dataReady"
      @waiting="controls.waiting"
      @stalled="controls.stalled"
      @seeking="controls.waiting"
      @seeked="controls.seeked"
      @canplay="controls.canPlay"
      @playing="onPlaying"
      @timeupdate="sync(false)"
      @play="sync(false)"
      @pause="stopPlaying"
      @ended="onEnded"
      @error="controls.mediaError"
    >
      <track
        v-for="(track, index) in playback?.subtitles ?? []"
        :key="track.url"
        kind="subtitles"
        :src="track.url"
        :srclang="track.language ?? 'und'"
        :label="track.label ?? `字幕 ${index + 1}`"
      />
    </video>
    <div
      v-if="showStatus"
      :role="errorMessage ? 'alert' : 'status'"
      data-player-status
      class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 p-5 text-center text-sm"
    >
      <Icon
        :name="requestPending ? 'lucide:loader-circle' : 'lucide:video-off'"
        :class="
          cn(
            'size-7 text-ink-2',
            requestPending && 'animate-spin motion-reduce:animate-none'
          )
        "
      />
      <p>
        {{
          requestPending
            ? recoveryMessage || '正在加载播放资源…'
            : errorMessage
              ? '播放失败'
              : '暂未找到播放资源'
        }}
      </p>
      <p
        v-if="!requestPending"
        class="max-w-md text-xs leading-relaxed text-ink-2"
      >
        {{ errorMessage || unavailableMessage }}
      </p>
      <UiButton
        v-if="!requestPending"
        size="sm"
        @click="emit('retry')"
        >刷新播放地址</UiButton
      >
    </div>

    <!-- 视频等待数据时居中提示，保留画面和控制条。 -->
    <div
      v-if="!showStatus && buffering"
      role="status"
      data-player-buffering
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <span
        class="glass-surface glass-on-image flex size-14 items-center justify-center rounded-full"
      >
        <Icon
          name="lucide:loader-circle"
          class="size-8 animate-spin text-white motion-reduce:animate-none"
        />
      </span>
      <span class="sr-only">视频加载中，请稍候…</span>
    </div>

    <!-- 暂停时的中央播放按钮 -->
    <button
      v-if="!showStatus"
      type="button"
      :aria-label="playing ? '暂停' : '播放'"
      :disabled="!playback?.urls.length"
      class="absolute inset-0 flex cursor-pointer items-center justify-center"
      @click="togglePlaying"
    >
      <span
        v-if="!playing && !buffering"
        class="glass-surface glass-on-image flex size-16 items-center justify-center rounded-full"
      >
        <Icon
          name="lucide:play"
          class="size-6 translate-x-0.5 fill-white text-white"
        />
      </span>
    </button>

    <!-- 顶部标题，悬停时浮出 -->
    <div
      :class="
        cn(
          'pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/70 to-transparent p-3 pb-8 transition-opacity duration-300 ease-out-soft sm:p-4 sm:pb-10 sm:opacity-0 sm:group-focus-within/player:opacity-100 sm:group-hover/player:opacity-100',
          chromeHidden && 'sm:group-hover/player:opacity-0'
        )
      "
    >
      <p class="truncate text-[0.8125rem] font-medium text-ink">
        {{ media.originalTitle ?? media.title }}
        <span class="ml-1.5 font-normal text-ink-3">{{ episodeLabel }}</span>
      </p>
    </div>

    <!-- 底部控制条 -->
    <div
      :class="
        cn(
          'absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/55 to-transparent px-3 pt-10 pb-2 transition-opacity duration-300 ease-out-soft sm:px-4',
          chromeHidden && 'pointer-events-none opacity-0'
        )
      "
    >
      <!-- 进度条 -->
      <div
        class="group/track relative rounded-full py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
      >
        <div class="relative h-1 w-full rounded-full bg-white/25">
          <div
            class="absolute inset-y-0 left-0 rounded-full bg-brand"
            :style="{ width: `${progress}%` }"
          />
          <span
            class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow-md transition-transform duration-200 ease-out-soft group-focus-within/track:scale-100 group-hover/track:scale-100"
            :style="{ left: `${progress}%` }"
          />
        </div>
        <input
          :value="progress"
          @input="
            controls.seek(Number(($event.target as HTMLInputElement).value))
          "
          type="range"
          min="0"
          max="100"
          step="0.1"
          aria-label="播放进度"
          :aria-valuetext="timeLabel"
          class="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </div>

      <div class="flex items-center justify-between gap-2">
        <!-- 左侧：播放控制 -->
        <div class="flex items-center gap-0.5 sm:gap-1">
          <UiIconButton
            icon="lucide:skip-back"
            label="上一集"
            size="sm"
            :disabled="!hasPrev"
            @click="emit('prev')"
          />
          <UiIconButton
            :icon="playing ? 'lucide:pause' : 'lucide:play'"
            :label="playing ? '暂停' : '播放'"
            @click="togglePlaying"
          />
          <UiIconButton
            icon="lucide:skip-forward"
            label="下一集"
            size="sm"
            :disabled="!hasNext"
            @click="emit('next')"
          />
          <span
            class="ml-1.5 text-[0.6875rem] whitespace-nowrap text-ink-2 tabular-nums sm:text-xs"
          >
            {{ timeLabel }}
          </span>
        </div>

        <!-- 右侧：画质 / 倍速 / 字幕 / 音量 / 窗口 -->
        <div class="flex items-center gap-0.5 sm:gap-1">
          <!-- 音量：悬停展开滑杆 -->
          <div class="group/volume hidden items-center sm:flex">
            <UiIconButton
              :icon="volume > 0 ? 'lucide:volume-2' : 'lucide:volume-x'"
              label="音量"
              @click="toggleMute"
            />
            <input
              :value="volume"
              @input="
                controls.setVolume(
                  Number(($event.target as HTMLInputElement).value)
                )
              "
              type="range"
              min="0"
              max="100"
              aria-label="音量"
              class="w-0 cursor-pointer accent-brand opacity-0 transition-all duration-300 ease-out-soft group-hover/volume:w-16 group-hover/volume:opacity-100"
            />
          </div>

          <button
            v-for="panel in SETTING_PANELS"
            :key="panel.key"
            type="button"
            :aria-label="panel.label"
            :aria-expanded="openPanel === panel.key"
            :class="
              cn(
                'hidden h-9 max-w-40 cursor-pointer items-center rounded-full px-2.5 text-xs font-medium transition-colors duration-200 ease-out-soft sm:inline-flex',
                openPanel === panel.key
                  ? 'bg-white/14 text-ink'
                  : 'text-ink-2 hover:bg-white/8 hover:text-ink'
              )
            "
            :title="settingLabel(panel.key)"
            @click="togglePanel(panel.key)"
          >
            <span class="truncate">{{ settingLabel(panel.key) }}</span>
          </button>

          <UiIconButton
            icon="lucide:settings-2"
            label="播放设置"
            class="sm:hidden"
            :aria-expanded="!!openPanel"
            @click="togglePanel('quality')"
          />
          <UiIconButton
            :icon="isFullscreen ? 'lucide:minimize' : 'lucide:maximize'"
            :label="isFullscreen ? '退出全屏' : '全屏'"
            :disabled="!canFullscreen"
            @click="togglePlayerFullscreen"
          />
        </div>
      </div>
    </div>

    <!-- 设置浮层以播放器为定位参照，窄屏下保留可滚动的选项区。 -->
    <Transition
      enter-active-class="transition duration-150 ease-out-soft"
      enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition duration-100 ease-out-soft"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="openPanel"
        class="glass-surface glass-on-image absolute right-3 bottom-14 max-h-[calc(100%-4rem)] w-56 max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-xl p-1.5 sm:right-4 sm:bottom-16"
      >
        <div class="mb-1 flex border-b border-white/12 pb-1">
          <button
            v-for="panel in SETTING_PANELS"
            :key="panel.key"
            type="button"
            :aria-pressed="openPanel === panel.key"
            :class="
              cn(
                'flex-1 cursor-pointer rounded-md py-1.5 text-xs',
                openPanel === panel.key
                  ? 'bg-brand-soft text-brand'
                  : 'text-ink-2 hover:bg-white/10'
              )
            "
            @click="togglePanel(panel.key)"
          >
            {{ panel.label }}
          </button>
        </div>
        <template v-if="openPanel === 'quality' && lines?.length">
          <p class="px-2.5 pt-1.5 pb-1 text-[0.6875rem] text-ink-3">播放线路</p>
          <button
            v-for="item in lines"
            :key="item.value"
            type="button"
            :disabled="requestPending"
            :aria-pressed="line === item.value"
            :class="
              cn(
                'flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition-colors disabled:cursor-wait disabled:opacity-50',
                line === item.value
                  ? 'bg-brand-soft text-brand'
                  : 'text-ink-2 hover:bg-white/10 hover:text-ink'
              )
            "
            @click="pickLine(item.value)"
          >
            <span class="min-w-0 break-words">{{ item.label }}</span>
            <Icon
              v-if="line === item.value"
              name="lucide:check"
              class="size-3 shrink-0"
            />
          </button>
          <p
            v-if="showQualityChoices && playback?.urls.length"
            class="mt-1 border-t border-white/12 px-2.5 pt-2 pb-1 text-[0.6875rem] text-ink-3"
          >
            清晰度
          </p>
        </template>
        <button
          v-for="option in PANEL_CONFIG[openPanel].options"
          :key="option"
          type="button"
          :class="
            cn(
              'flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
              PANEL_CONFIG[openPanel].current() === option
                ? 'bg-brand-soft text-brand'
                : 'text-ink-2 hover:bg-white/10 hover:text-ink'
            )
          "
          @click="pick(openPanel, option)"
        >
          <span class="min-w-0 break-words">{{
            optionLabel(openPanel, option)
          }}</span>
          <Icon
            v-if="PANEL_CONFIG[openPanel].current() === option"
            name="lucide:check"
            class="size-3 shrink-0"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>
