import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { toValue } from 'vue'

const sources = Object.fromEntries(
  await Promise.all(
    [
      'utils/analytics',
      'plugins/analytics.client',
      'composables/useAnalytics',
      'composables/usePlaybackAnalytics',
    ].map(async path => [
      path,
      await readFile(
        new URL('../app/' + path + '.ts', import.meta.url),
        'utf8'
      ),
    ])
  )
)

function module(path, globals = {}, flags = {}) {
  const exports = {}
  const source = sources[path]
    .replaceAll('import.meta.dev', String(flags.dev ?? false))
    .replaceAll('import.meta.server', String(flags.server ?? false))
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  runInNewContext(js, { exports, ...globals })
  return exports
}
const { createAnalyticsTracker, analyticsText } = module('utils/analytics')
const plain = value => JSON.parse(JSON.stringify(value))

function setup({
  dev = false,
  id = 'G-EXAMPLE123',
  idleSupported = true,
} = {}) {
  const hooks = new Map(),
    scripts = [],
    scheduled = []
  const window = {
    location: {
      origin: 'https://miraitv.example',
      pathname: '/search',
      search: '?q=fixture',
    },
    ...(idleSupported
      ? {
          requestIdleCallback(callback, options) {
            scheduled.push({ callback, delay: options.timeout, type: 'idle' })
          },
        }
      : {}),
  }
  let pluginResult
  module(
    'plugins/analytics.client',
    {
      createAnalyticsTracker,
      analyticsText,
      defineNuxtPlugin(plugin) {
        pluginResult = plugin({
          hook: (name, callback) => hooks.set(name, callback),
        })
      },
      useRuntimeConfig: () => ({ public: { gaId: id } }),
      window,
      document: {
        title: '测试 · 搜索 · MiraiTV',
        getElementById: id => scripts.find(script => script.id === id),
        createElement: () => ({}),
        head: { appendChild: script => scripts.push(script) },
      },
      setTimeout: (callback, delay) =>
        scheduled.push({ callback, delay, type: 'timeout' }),
    },
    { dev }
  )
  return {
    hooks,
    scripts,
    scheduled,
    window,
    track: pluginResult.provide.trackEvent,
  }
}

test('GA queues early events after config while deferring the script until mount and idle', () => {
  const app = setup()
  assert.equal(app.scripts.length, 0)
  assert.equal(app.scheduled.length, 0)
  assert.deepEqual(Array.from(app.window.dataLayer[1]), [
    'config',
    'G-EXAMPLE123',
  ])
  assert.equal(app.track('search', { search_term: '葬送的芙莉莲' }), true)
  app.window.location.pathname = '/play/another'
  app.hooks.get('app:mounted')()
  assert.equal(app.scripts.length, 0)
  assert.equal(app.scheduled[0].type, 'idle')
  assert.equal(app.scheduled[0].delay, 3000)
  app.scheduled[0].callback()
  assert.equal(app.scripts.length, 1)
  assert.equal(
    app.scripts[0].src,
    'https://www.googletagmanager.com/gtag/js?id=G-EXAMPLE123'
  )
  assert.equal(app.scripts[0].async, true)
  assert.equal(
    app.window.dataLayer[2][2].page_location,
    'https://miraitv.example/search'
  )
  assert.equal(app.window.dataLayer[2][2].search_term, '葬送的芙莉莲')
  app.scheduled[0].callback()
  assert.equal(app.scripts.length, 1)
  assert.equal(
    app.window.dataLayer.length,
    3,
    'script callbacks must not duplicate config or events'
  )
})

test('GA uses the timer fallback and disables both loading and reporting in dev or with no valid ID', () => {
  const app = setup({ idleSupported: false })
  app.hooks.get('app:mounted')()
  assert.equal(app.scheduled[0].type, 'timeout')
  assert.equal(app.scheduled[0].delay, 2000)
  for (const options of [{ dev: true }, { id: '' }, { id: 'invalid' }]) {
    const disabled = setup(options)
    assert.equal(disabled.hooks.size, 0)
    assert.equal(disabled.track('search', { search_term: 'test' }), false)
    assert.equal(disabled.window.dataLayer, undefined)
  }
})

test('events normalize data, preserve numeric IDs, redact obvious PII in searches, and omit unapproved fields', () => {
  const target = {}
  const { track } = createAnalyticsTracker(target, 'G-TEST')
  track('search', {
    search_term: '  邮箱 test@example.com 电话 13800138000  ',
    token: 'secret',
  })
  assert.deepEqual(plain(target.dataLayer[2][2]), {
    search_term: '邮箱 [redacted] 电话 [redacted]',
    send_to: 'G-TEST',
  })
  track('video_start', {
    media_id: '12345678901234567890',
    media_title: '影'.repeat(120),
    source_id: 'xifan',
    episode_id: 'ep-1',
    video_duration: Infinity,
    password: 'secret',
    url: 'https://video.invalid/signed?token=secret',
  })
  const params = plain(target.dataLayer[3][2])
  assert.equal(params.media_id, '12345678901234567890')
  assert.equal(params.media_title.length, 100)
  assert.equal(params.video_duration, undefined)
  assert.equal(params.password, undefined)
  assert.equal(params.url, undefined)
  assert.equal(track('search', { search_term: '  ' }), false)
  assert.equal(track('unsupported_event', {}), false)
  target.gtag = () => {
    throw new Error('blocked')
  }
  assert.equal(track('search', { search_term: 'test' }), false)
})

test('blocked scripts cannot accumulate an unbounded queue, and successful loading removes the queue cap', () => {
  const app = setup()
  for (let i = 0; i < 100; i++)
    assert.equal(app.track('search', { search_term: 'test' }), true)
  assert.equal(app.track('search', { search_term: 'excess' }), false)
  app.hooks.get('app:mounted')()
  app.scheduled[0].callback()
  app.scripts[0].onload()
  assert.equal(app.track('search', { search_term: 'loaded' }), true)
})

test('the shared composable skips SSR and missing providers without affecting the caller', () => {
  let calls = 0
  const useNuxtApp = () => ({
    $trackEvent: () => {
      calls++
      return true
    },
  })
  const server = module(
    'composables/useAnalytics',
    { useNuxtApp },
    { server: true }
  ).useAnalytics()
  assert.equal(server.trackSearch('test'), false)
  assert.equal(calls, 0)
  const client = module('composables/useAnalytics', {
    useNuxtApp,
  }).useAnalytics()
  assert.equal(client.trackSearch('test'), true)
  assert.equal(calls, 1)
  const missing = module('composables/useAnalytics', {
    useNuxtApp: () => ({}),
  }).useAnalytics()
  assert.equal(missing.trackSearch('test'), false)
})

test('actual playback starts and completion are deduplicated; loading or failed resources are not views', () => {
  const events = []
  const base = {
    media_id: 'bangumi~MQ',
    media_title: '测试作品',
    source_id: 'xifan',
    source_name: '稀饭动漫',
    episode_id: 'ep-1',
    line_id: 'line-a',
    quality: '高清',
  }
  let context = null
  const tracker = module('composables/usePlaybackAnalytics', {
    toValue,
    useAnalytics: () => ({
      track: (name, params) => {
        events.push({ name, params })
        return true
      },
    }),
  }).usePlaybackAnalytics(() => context)
  tracker.started(0, 120)
  assert.equal(events.length, 0)
  context = { ...base }
  tracker.started(0, 120)
  tracker.started(20, 120)
  context = null
  tracker.started(20, 120)
  context = { ...base }
  tracker.started(20, 120)
  assert.deepEqual(
    events.map(e => e.name),
    ['video_start']
  )
  tracker.completed(120, 120)
  tracker.completed(120, 120)
  assert.deepEqual(
    events.map(e => e.name),
    ['video_start', 'video_complete']
  )
  context = { ...base, line_id: 'line-b' }
  tracker.qualitySelected('1', '流畅')
  tracker.started(30, 120)
  assert.equal(events[2].name, 'playback_select')
  assert.equal(events[2].params.selected_label, '流畅')
  assert.equal(events[3].name, 'video_start')
  assert.equal(events[3].params.line_id, 'line-b')
})
