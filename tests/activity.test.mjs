import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import { computed, reactive, shallowRef, toRefs } from 'vue'

const source = await readFile(
  new URL('../app/stores/activity.ts', import.meta.url),
  'utf8'
)
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace(/^import .*$/gm, '')
  .replace('export const useActivityStore', 'const useActivityStore')
const media = {
  id: 'bangumi~MQ',
  title: '测试作品',
  poster: null,
  tint: { from: '#123', to: '#456' },
  year: 2026,
  kind: 'anime',
  rating: 8,
  genres: [],
}
const key = owner => `miraitv:activity:v1:${owner ?? 'guest'}`
const empty = () => ({ searches: [], history: [], pending: [] })

function setup({
  storage = new Map(),
  request = async () => ({ searches: [], history: [] }),
} = {}) {
  const user = shallowRef(null)
  const calls = []
  const localStorage = {
    getItem: name => storage.get(name) ?? null,
    setItem: (name, value) => storage.set(name, value),
    removeItem: name => storage.delete(name),
  }
  const createStore = vm.runInNewContext(compiled + '\nuseActivityStore', {
    defineStore: (_id, setup) => setup,
    reactive,
    computed,
    toRefs,
    useState: () => user,
    useApi: () => ({
      syncActivity: async changes => {
        calls.push(changes)
        return request(changes)
      },
    }),
    localStorage,
    crypto: { randomUUID },
    apiErrorMessage: error => error.message,
  })
  const store = createStore()
  const login = id => {
    user.value = { id }
    store.changeAccount(id)
  }
  return { store, user, storage, calls, login }
}

test('guest search and playback persist across reload and never upload', async () => {
  const first = setup()
  first.store.changeAccount(null)
  first.store.recordSearch('  葬送的芙莉莲  ')
  first.store.recordSearch('葬送的芙莉莲')
  first.store.recordHistory(
    {
      mediaId: media.id,
      episodeId: 'episode-2',
      episodeNumber: 2,
      progress: 45,
      positionSeconds: 450,
      durationSeconds: 1000,
    },
    media
  )
  const reload = setup({ storage: first.storage })
  reload.store.changeAccount(null)
  assert.equal(reload.store.searches.value.length, 1)
  assert.equal(reload.store.searches.value[0].keyword, '葬送的芙莉莲')
  assert.equal(reload.store.history.value[0].positionSeconds, 450)
  assert.equal(reload.store.history.value[0].episodeId, 'episode-2')
  assert.equal(first.calls.length, 0)
})

test('login imports guest records, failed sync is durable and switches accounts safely', async () => {
  let offline = true
  const current = setup({
    request: async changes => {
      if (offline) throw new Error('offline')
      return {
        searches: changes
          .filter(item => item.type === 'search')
          .map(item => item.search),
        history: [],
      }
    },
  })
  current.store.changeAccount(null)
  current.store.recordSearch('游客搜索')
  current.login(1)
  await current.store.sync()
  assert.equal(current.store.searches.value[0].keyword, '游客搜索')
  assert.equal(current.store.cache.value.pending.length, 1)
  assert.equal(JSON.parse(current.storage.get(key(1))).pending.length, 1)
  assert.equal(current.storage.has(key(null)), false)
  current.login(2)
  assert.equal(current.store.searches.value.length, 0)
  current.user.value = null
  current.store.changeAccount(null)
  assert.equal(current.store.searches.value.length, 0)
  current.login(1)
  offline = false
  await current.store.sync()
  assert.equal(current.store.cache.value.pending.length, 0)
  assert.equal(current.store.searches.value[0].keyword, '游客搜索')
})

test('newer account outbox survives importing an older guest record', () => {
  const storage = new Map()
  const old = { keyword: 'same', updatedAt: '2026-01-01T00:00:00Z' }
  const newer = { keyword: 'same', updatedAt: '2026-02-01T00:00:00Z' }
  storage.set(key(null), JSON.stringify({ ...empty(), searches: [old] }))
  storage.set(
    key(1),
    JSON.stringify({
      ...empty(),
      searches: [newer],
      pending: [{ id: 'newer', change: { type: 'search', search: newer } }],
    })
  )
  const current = setup({ storage })
  current.login(1)
  assert.equal(current.store.cache.value.pending[0].id, 'newer')
  assert.equal(current.store.searches.value[0].updatedAt, newer.updatedAt)
})

test('changes during upload are not lost and stale account responses are ignored', async () => {
  const waiting = []
  const current = setup({
    request: changes =>
      new Promise(resolve => waiting.push({ changes, resolve })),
  })
  current.login(1)
  current.store.recordSearch('first')
  const syncing = current.store.sync()
  current.store.recordSearch('second')
  waiting[0].resolve({
    searches: [{ keyword: 'first', updatedAt: new Date().toISOString() }],
    history: [],
  })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(waiting[1].changes[0].search.keyword, 'second')
  current.login(2)
  waiting[1].resolve({
    searches: [{ keyword: 'alice', updatedAt: new Date().toISOString() }],
    history: [],
  })
  await syncing
  assert.equal(current.store.searches.value.length, 0)
  assert.equal(current.store.syncing.value, false)
})

test('offline delete and clear stay queued and are not resurrected on reload', async () => {
  const current = setup({
    request: async () => {
      throw new Error('offline')
    },
  })
  current.login(1)
  current.store.recordSearch('remove')
  await current.store.sync()
  current.store.removeSearch('remove')
  await current.store.sync()
  assert.equal(current.store.searches.value.length, 0)
  assert.equal(
    current.store.cache.value.pending[0].change.type,
    'remove-search'
  )
  current.store.recordHistory({ mediaId: media.id, progress: 40 }, media)
  await current.store.sync()
  current.store.clearHistory()
  await current.store.sync()
  const reload = setup({ storage: current.storage })
  reload.login(1)
  assert.equal(reload.store.history.value.length, 0)
  assert.ok(
    reload.store.cache.value.pending.some(
      item => item.change.type === 'clear-history'
    )
  )
})

test('unavailable local storage leaves search and playback usable', () => {
  const current = setup({
    storage: {
      get() {
        throw new Error('blocked')
      },
      set() {
        throw new Error('blocked')
      },
    },
  })
  current.store.changeAccount(null)
  current.store.recordSearch('usable')
  current.store.recordHistory({ mediaId: media.id, progress: 30 }, media)
  assert.equal(current.store.history.value.length, 1)
  assert.equal(current.store.searches.value.length, 1)
})
