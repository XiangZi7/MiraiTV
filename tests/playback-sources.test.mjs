import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import {
  computed,
  effectScope,
  nextTick,
  shallowRef,
  toValue,
  watch,
} from 'vue'

async function compile(path) {
  return ts
    .transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(/export /g, '')
}
const apiCode = await compile('../app/composables/useApi.ts')
const sourcesCode = await compile('../app/composables/usePlaybackSources.ts')
const native = { source: 'huarw', seriesId: 'native' }
const alternate = { source: 'sorani', seriesId: 'other' }
const match = binding => ({
  ...binding,
  sourceName: binding.source,
  episodes: [{ id: `${binding.source}-ep-1`, index: 1, title: '第一集' }],
})
const result = (mediaId, bindings) => ({
  mediaId,
  available: !!bindings.length,
  matches: bindings.map(match),
  partial: false,
  unavailableSources: [],
  message: bindings.length ? null : '暂无匹配的播放资源',
})

function setup(
  t,
  {
    id = 'huarw~bmF0aXZl',
    selected,
    context = 'detail',
    app = { payload: { data: {} } },
    respond = query => result(id, [query.source ? query : native]),
  } = {}
) {
  const calls = []
  const binding = shallowRef(selected)
  const useApi = vm.runInNewContext(apiCode + '\nuseApi', {
    useRequestFetch: () => async (path, options) => {
      calls.push({ path, ...options, query: { ...options.query } })
      return { code: 200, data: await respond(options.query) }
    },
    useState: () => shallowRef(null),
    createError: value => Object.assign(new Error(value.message), value),
    apiErrorMessage: error => error.message,
  })
  let initial
  let options
  const useAsyncData = (key, handler, config) => {
    options = config
    const data = shallowRef()
    const error = shallowRef()
    const status = shallowRef('idle')
    async function execute(cause) {
      const cached = config.getCachedData(key(), app, { cause })
      if (cached) {
        data.value = cached
        status.value = 'success'
        return
      }
      status.value = 'pending'
      error.value = undefined
      try {
        data.value = await handler(app, {
          signal: new AbortController().signal,
        })
        status.value = 'success'
      } catch (caught) {
        data.value = undefined
        error.value = caught
        status.value = 'error'
      }
      app.payload.data[key()] = data.value
    }
    initial = execute('initial')
    return { data, error, status, refresh: () => execute('refresh:manual') }
  }
  const usePlaybackSources = vm.runInNewContext(
    sourcesCode + '\nusePlaybackSources',
    {
      computed,
      shallowRef,
      toValue,
      watch,
      useApi,
      useAsyncData,
      useNuxtApp: () => app,
    }
  )
  const scope = effectScope()
  const sources = scope.run(() => usePlaybackSources(id, { binding, context }))
  t.after(() => scope.stop())
  return { sources, calls, initial, binding, options, app }
}

test('native entries request their own episodes without full search', async t => {
  const state = setup(t)
  await state.initial
  assert.equal(state.options.server, false)
  assert.equal(state.options.lazy, true)
  assert.equal(state.calls.length, 1)
  assert.deepEqual(state.calls[0].query, { search: false })
  assert.equal(state.sources.data.value.matches[0].source, 'huarw')
})

test('known cross-source bindings reach the API even on a fresh page', async t => {
  const state = setup(t, { id: 'bangumi~MQ', selected: alternate })
  await state.initial
  assert.deepEqual(state.calls[0].query, { ...alternate, search: false })
  assert.ok(state.calls[0].signal instanceof AbortSignal)
})

test('playback reuses detail episodes and its full-search action uses its own request context', async t => {
  const detail = setup(t)
  await detail.initial
  const playback = setup(t, {
    selected: native,
    context: 'playback',
    app: detail.app,
    respond: () => result('huarw~bmF0aXZl', [native, alternate]),
  })
  await playback.initial
  assert.equal(playback.calls.length, 0)
  await playback.sources.searchAll()
  assert.equal(detail.calls.length, 1)
  assert.deepEqual(playback.calls[0].query, { search: true })
  assert.equal(playback.sources.data.value.matches.length, 2)
})

test('detail and playback reuse matching cached episodes, but reject a different binding', async t => {
  const app = {
    payload: { data: { 'sources:bangumi~MQ': result('bangumi~MQ', [native]) } },
  }
  const cached = setup(t, { id: 'bangumi~MQ', selected: native, app })
  await cached.initial
  assert.equal(cached.calls.length, 0)
  const missing = setup(t, { id: 'bangumi~MQ', selected: alternate, app })
  await missing.initial
  assert.equal(missing.calls.length, 1)
  assert.deepEqual(missing.calls[0].query, { ...alternate, search: false })
})

test('only explicit full search drops the binding, keeps episodes while pending, and adds alternatives', async t => {
  let finish
  const state = setup(t, {
    selected: native,
    respond: query =>
      query.search
        ? new Promise(resolve => {
            finish = () =>
              resolve(result('huarw~bmF0aXZl', [alternate, native]))
          })
        : result('huarw~bmF0aXZl', [native]),
  })
  await state.initial
  const all = state.sources.searchAll()
  await state.sources.searchAll()
  assert.equal(state.calls.length, 2)
  assert.deepEqual(state.calls[1].query, { search: true })
  assert.equal(state.sources.status.value, 'pending')
  assert.equal(state.sources.data.value.matches[0].source, 'huarw')
  finish()
  await all
  assert.deepEqual(
    Array.from(state.sources.data.value.matches, item => item.source),
    ['huarw', 'sorani']
  )
  await state.sources.refresh(alternate)
  assert.deepEqual(state.calls[2].query, { ...alternate, search: false })
})

test('partial full search retains a working source absent from the new results', async t => {
  const state = setup(t, {
    respond: query =>
      query.search
        ? {
            ...result('huarw~bmF0aXZl', [alternate]),
            partial: true,
            unavailableSources: ['huarw'],
          }
        : result('huarw~bmF0aXZl', [native]),
  })
  await state.initial
  await state.sources.searchAll()
  assert.deepEqual(
    Array.from(state.sources.data.value.matches, item => item.source),
    ['huarw', 'sorani']
  )
})

test('failed full search preserves playback and a subsequent refresh stays on the requested source', async t => {
  const state = setup(t, {
    selected: native,
    respond: query => {
      if (query.search) throw new Error('源站超时')
      return result('huarw~bmF0aXZl', [native])
    },
  })
  await state.initial
  await state.sources.searchAll()
  assert.equal(state.sources.data.value.matches[0].source, 'huarw')
  assert.match(state.sources.error.value.message, /源站超时/)
  assert.equal(
    state.app.payload.data['sources:huarw~bmF0aXZl'],
    state.sources.data.value
  )
  await state.sources.refresh()
  assert.deepEqual(state.calls[2].query, { ...native, search: false })
  assert.equal(state.sources.error.value, undefined)
})

test('changing to a cached source avoids a request; missing source bindings load directly', async t => {
  const state = setup(t, {
    selected: native,
    respond: () => result('huarw~bmF0aXZl', [native, alternate]),
  })
  await state.initial
  state.binding.value = alternate
  await nextTick()
  assert.equal(state.calls.length, 1)
  state.binding.value = { source: 'third', seriesId: 'third-work' }
  await nextTick()
  assert.equal(state.calls.length, 2)
  assert.deepEqual(state.calls[1].query, {
    source: 'third',
    seriesId: 'third-work',
    search: false,
  })
})
