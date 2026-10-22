import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import {
  computed,
  effectScope,
  nextTick,
  reactive,
  shallowRef,
  toRefs,
  toValue,
  watch,
} from 'vue'

const source = await readFile(
  new URL('../app/composables/useVideoPlayback.ts', import.meta.url),
  'utf8'
)
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace(
    'export function useVideoPlayback',
    'function useVideoPlayback'
  )
  .replace("await import('hls.js')", 'await loadHls()')

async function setup(t, { nativeHls = '', mseSupported = true } = {}) {
  const mounted = []
  const unmounted = []
  const hlsInstances = []
  class MockHls {
    static Events = { ERROR: 'error' }
    static isSupported() {
      return mseSupported
    }
    constructor() {
      hlsInstances.push(this)
    }
    on() {}
    loadSource(url) {
      this.source = url
    }
    attachMedia(element) {
      this.element = element
      element.src = 'blob:hls-media'
    }
    destroy() {
      this.destroyed = true
    }
  }
  const useVideoPlayback = vm.runInNewContext(compiled + '\nuseVideoPlayback', {
    reactive,
    computed,
    toValue,
    toRefs,
    watch,
    DOMException,
    loadHls: async () => ({ default: MockHls }),
    onMounted: callback => mounted.push(callback),
    onBeforeUnmount: callback => unmounted.push(callback),
  })
  let actualTime = 30
  let requestedTime = 30
  let rejectSeek = false
  let playCalls = 0
  let playResult = () => Promise.resolve()
  const element = {
    paused: true,
    ended: false,
    seeking: false,
    readyState: 4,
    duration: 120,
    volume: 0.7,
    playbackRate: 1,
    textTracks: [],
    get currentTime() {
      return actualTime
    },
    set currentTime(value) {
      if (rejectSeek) throw new Error('detached media')
      requestedTime = value
      this.seeking = true
    },
    pause() {
      this.paused = true
    },
    async play() {
      playCalls += 1
      this.paused = false
      try {
        await playResult()
      } catch (error) {
        this.paused = true
        throw error
      }
    },
    removeAttribute() {},
    load() {},
    canPlayType() {
      return nativeHls
    },
  }
  const scope = effectScope()
  const playback = shallowRef({
    mediaId: 'test',
    source: 'fixture',
    episode: { id: 'episode-1' },
    urls: [
      { quality: '原画', url: 'https://video.invalid/test.mp4' },
      { quality: '流畅', url: 'https://video.invalid/low.mp4' },
    ],
  })
  const controls = scope.run(() =>
    useVideoPlayback(shallowRef(element), playback, () => 0)
  )
  scope.run(() => mounted.forEach(callback => callback()))
  await nextTick()
  controls.metadata()
  t.after(() => {
    unmounted.forEach(callback => callback())
    scope.stop()
  })
  return {
    controls,
    element,
    playback,
    hlsInstances,
    playCalls: () => playCalls,
    setPlayResult(callback) {
      playResult = callback
    },
    requested: () => requestedTime,
    finishSeek(time = requestedTime) {
      actualTime = time
      element.seeking = false
      element.readyState = 4
      controls.seeked()
    },
    rejectSeek() {
      rejectSeek = true
    },
  }
}

test('HLS uses MSE even when native playback advertises support, including NB extensionless playlists', async t => {
  const { playback, element, hlsInstances } = await setup(t, {
    nativeHls: 'maybe',
  })
  for (const url of [
    'https://video.invalid/index.m3u8',
    'https://play3.nbyjson.top:889/nby/m3u8/getM3u8?id=sample',
  ]) {
    playback.value = { ...playback.value, urls: [{ quality: '原画', url }] }
    await nextTick()
    await nextTick()
    await new Promise(setImmediate)
    assert.equal(hlsInstances.at(-1).source, url)
    assert.equal(element.src, 'blob:hls-media')
  }
  assert.equal(hlsInstances[0].destroyed, true)
})

test('refreshing the same HLS URL replaces the failed media instance', async t => {
  const { playback, hlsInstances } = await setup(t)
  playback.value = { ...playback.value, urls: [{ quality: '默认', url: 'https://video.invalid/index.m3u8' }] }
  await nextTick()
  await nextTick()
  await new Promise(setImmediate)
  const first = hlsInstances.at(-1)
  playback.value = { ...playback.value, urls: [...playback.value.urls] }
  await nextTick()
  await nextTick()
  await new Promise(setImmediate)
  assert.equal(first.destroyed, true)
  assert.notEqual(hlsInstances.at(-1), first)
})

test('HLS keeps native playback as fallback when MSE is unavailable', async t => {
  const { playback, element, hlsInstances, controls } = await setup(t, {
    nativeHls: 'probably',
    mseSupported: false,
  })
  playback.value = {
    ...playback.value,
    urls: [{ quality: '原画', url: 'https://video.invalid/index.m3u8' }],
  }
  await nextTick()
  await nextTick()
  await new Promise(setImmediate)
  assert.equal(hlsInstances.length, 0)
  assert.equal(element.src, 'https://video.invalid/index.m3u8')
  assert.equal(controls.playbackError.value, '')
})

test('seek updates the visible position immediately and ignores stale time updates during buffering', async t => {
  const { controls, element, requested, finishSeek } = await setup(t)
  element.readyState = 1
  controls.seek(75)
  controls.waiting()
  assert.equal(requested(), 90)
  assert.equal(controls.position.value, 90)
  assert.equal(controls.progress.value, 75)
  assert.equal(controls.buffering.value, true)
  controls.sync()
  assert.equal(
    controls.position.value,
    90,
    'an old media time must not pull the slider back'
  )
  finishSeek()
  assert.equal(controls.position.value, 90)
  assert.equal(controls.seekTarget.value, null)
  assert.equal(controls.buffering.value, false)
})

test('rapid seeks and keyboard steps keep the latest requested destination', async t => {
  const { controls, requested, finishSeek } = await setup(t)
  controls.seek(30)
  controls.seek(70)
  finishSeek(36)
  assert.equal(
    controls.position.value,
    84,
    'completion of the earlier seek must not replace the latest target'
  )
  controls.seekBy(5)
  controls.seekBy(5)
  assert.equal(requested(), 94)
  assert.equal(controls.position.value, 94)
  finishSeek()
  assert.equal(controls.position.value, 94)
  assert.equal(controls.seekTarget.value, null)
})

test('seek clamps to the duration, rejects invalid input, and recovers if the media rejects a seek', async t => {
  const { controls, requested, rejectSeek } = await setup(t)
  controls.seek(-10)
  assert.equal(requested(), 0)
  controls.seek(200)
  assert.equal(requested(), 120)
  controls.seek(Number.NaN)
  assert.equal(requested(), 120)
  rejectSeek()
  controls.seek(50)
  assert.equal(controls.position.value, 30)
  assert.equal(controls.progress.value, 25)
  assert.equal(controls.seekTarget.value, null)
})

test('new resources autoplay once, and later buffering does not undo a user pause', async t => {
  const { controls, element, playCalls, playback } = await setup(t)
  await controls.canPlay()
  assert.equal(playCalls(), 1)
  assert.equal(element.paused, false)
  await controls.togglePlaying()
  await controls.canPlay()
  assert.equal(element.paused, true)
  assert.equal(
    playCalls(),
    1,
    'canplay after a pause must not restart playback'
  )

  for (const result of [
    { ...playback.value, episode: { id: 'episode-2' } },
    { ...playback.value, source: 'another-source' },
    { ...playback.value, line: 'line-b' },
  ]) {
    playback.value = null
    await nextTick()
    playback.value = result
    await nextTick()
    await controls.canPlay()
    assert.equal(
      element.paused,
      false,
      'each selected resource should begin playing'
    )
    await controls.togglePlaying()
  }
  assert.equal(playCalls(), 4)
})

test('quality selection resumes automatically, including an alias using the same URL', async t => {
  const { controls, element, playback, playCalls } = await setup(t)
  controls.pick('quality', '1')
  await nextTick()
  await controls.canPlay()
  assert.equal(element.paused, false)
  assert.equal(playCalls(), 1)
  await controls.togglePlaying()

  controls.pick('quality', '1')
  await nextTick()
  assert.equal(
    element.paused,
    false,
    'reselecting the current quality should resume playback'
  )
  assert.equal(playCalls(), 2)
  assert.equal(playback.value.urls[1].quality, '流畅')
})

test('autoplay restrictions keep manual playback available without reporting a broken source', async t => {
  const { controls, element, setPlayResult, playCalls } = await setup(t)
  setPlayResult(() =>
    Promise.reject(new DOMException('gesture required', 'NotAllowedError'))
  )
  await controls.canPlay()
  assert.equal(element.paused, true)
  assert.equal(controls.playbackError.value, '')
  assert.equal(controls.buffering.value, false)
  setPlayResult(() => Promise.resolve())
  await controls.togglePlaying()
  assert.equal(element.paused, false)
  assert.equal(playCalls(), 2)
})

test('a rejected play attempt for an old source cannot overwrite the new source state', async t => {
  const { controls, playback, setPlayResult } = await setup(t)
  let rejectOld
  setPlayResult(
    () =>
      new Promise((_resolve, reject) => {
        rejectOld = reject
      })
  )
  const oldPlay = controls.canPlay()
  playback.value = null
  await nextTick()
  playback.value = {
    mediaId: 'test',
    source: 'another-source',
    episode: { id: 'episode-2' },
    urls: [{ quality: '原画', url: 'https://video.invalid/new.mp4' }],
  }
  await nextTick()
  assert.equal(controls.buffering.value, true)
  rejectOld(new DOMException('old resource failed', 'NotSupportedError'))
  await oldPlay
  assert.equal(controls.buffering.value, true)
  assert.equal(controls.playbackError.value, '')
})
