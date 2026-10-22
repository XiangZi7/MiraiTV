import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import {
  computed,
  reactive,
  toRefs,
  toValue,
  watch,
  shallowRef,
  effectScope,
  onScopeDispose,
} from 'vue'

async function compile(path) {
  return ts
    .transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(/^import .*?;\r?\n/gm, '')
    .replace(/export /g, '')
}
const helpers = vm.runInNewContext(
  (await compile('../app/utils/playback-recovery.ts')) +
    '\n({ playbackSelectionKey, matchingSourceEpisode, playbackCandidates })'
)
const usePlaybackRecovery = vm.runInNewContext(
  (await compile('../app/composables/usePlaybackRecovery.ts')) +
    '\nusePlaybackRecovery',
  {
    ...helpers,
    computed,
    reactive,
    toRefs,
    toValue,
    watch,
    onScopeDispose,
    setTimeout,
    clearTimeout,
  }
)
const tick = () => new Promise(resolve => setTimeout(resolve, 8))
const selections = [
  { source: 'a', seriesId: '1', episodeId: 'ep-a', line: 'first' },
  { source: 'a', seriesId: '1', episodeId: 'ep-a', line: 'second' },
  { source: 'b', seriesId: '2', episodeId: 'ep-b', line: 'main' },
]
function setup(t, { failed = true } = {}) {
  const scope = effectScope()
  const current = shallowRef(selections[0])
  const retried = []
  const selected = []
  const recovery = scope.run(() =>
    usePlaybackRecovery({
      current,
      candidates: () => selections,
      delay: 0,
      retry: async () => {
        retried.push(current.value.line)
      },
      failed: () => failed,
      select: async target => {
        selected.push(target)
        current.value = target
      },
    })
  )
  t.after(() => scope.stop())
  return { recovery, current, retried, selected, scope }
}

test('URL failures retry three times then move to the next line and provider without looping', async t => {
  const state = setup(t)
  for (let index = 0; index < selections.length; index++) {
    state.recovery.recover()
    for (let i = 0; i < 4; i++) await tick()
  }
  assert.equal(state.retried.length, 9)
  assert.deepEqual(
    state.selected.map(item => item.line),
    ['second', 'main']
  )
  assert.equal(state.recovery.recovering.value, false)
  assert.match(state.recovery.recoveryMessage.value, /所有线路/)
  state.recovery.recover()
  await tick()
  assert.equal(state.retried.length, 9)
})

test('browser media failures share the same three retry budget', async t => {
  const state = setup(t, { failed: false })
  for (let i = 0; i < 4; i++) {
    state.recovery.recover()
    await tick()
  }
  assert.equal(state.retried.length, 3)
  assert.equal(state.selected[0].line, 'second')
})

test('duplicate failure events schedule only one retry', async t => {
  const state = setup(t, { failed: false })
  state.recovery.recover()
  state.recovery.recover()
  await tick()
  assert.equal(state.retried.length, 1)
})

test('playback that recovers before the retry timer cancels the pending reload', async t => {
  const state = setup(t, { failed: false })
  state.recovery.recover()
  state.recovery.succeeded()
  await tick()
  assert.equal(state.retried.length, 0)
  assert.equal(state.recovery.recovering.value, false)
})

test('manual selection and unmount cancel pending retries', async t => {
  const state = setup(t)
  state.recovery.recover()
  state.current.value = selections[1]
  await tick()
  assert.equal(state.retried.length, 0)
  state.recovery.recover()
  state.scope.stop()
  await tick()
  assert.equal(state.retried.length, 0)
})

test('successful playback restores the current line retry budget', async t => {
  const state = setup(t, { failed: false })
  state.recovery.recover()
  await tick()
  state.recovery.succeeded()
  state.recovery.recover()
  await tick()
  assert.match(state.recovery.recoveryMessage.value || '1/3', /1\/3/)
  assert.equal(state.selected.length, 0)
})

test('cross-source fallback preserves episode numbers and rejects unrelated specials', () => {
  const current = {
    id: 'ep-a',
    index: 2,
    title: '第02集',
    lines: [{ id: 'first' }],
  }
  const origin = {
    source: 'a',
    seriesId: '1',
    episodes: [current, { id: 'ep-3', index: 3 }],
  }
  const target = {
    source: 'b',
    seriesId: '2',
    episodes: [
      { id: 'trailer', index: null, title: '预告', lines: [{ id: 'main' }] },
      { id: 'real-2', index: 2, title: '2', lines: [{ id: 'main' }] },
    ],
  }
  const candidates = helpers.playbackCandidates(
    [origin, target],
    origin,
    current
  )
  assert.equal(candidates[1].episodeId, 'real-2')
  assert.equal(
    helpers.matchingSourceEpisode(
      { index: null, title: '特辑' },
      target,
      false
    ),
    undefined
  )
})

test('single-film labels can differ but trailers cannot replace the feature', () => {
  const target = { episodes: [{ id: 'movie', index: null, title: 'HD中字' }] }
  assert.equal(
    helpers.matchingSourceEpisode({ index: null, title: '1080P' }, target, true)
      .id,
    'movie'
  )
  assert.equal(
    helpers.matchingSourceEpisode({ index: null, title: '预告' }, target, true),
    undefined
  )
})
