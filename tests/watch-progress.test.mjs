import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(
  new URL('../app/utils/watch-progress.ts', import.meta.url),
  'utf8'
)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
})
const { watchProgress } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)

test('saved seconds determine both the displayed time and bar even if the old percentage differs', () => {
  assert.deepEqual(
    watchProgress({
      progress: 99,
      positionSeconds: 754.9,
      durationSeconds: 1440,
    }),
    {
      progress: (754.9 / 1440) * 100,
      label: '观看至 12:34 / 24:00',
    }
  )
  assert.equal(
    watchProgress({
      progress: 12.3456789,
      positionSeconds: 3723.8,
      durationSeconds: 7200,
    }).label,
    '观看至 1:02:03 / 2:00:00'
  )
})

test('old percentage-only records stay readable without claiming completion early', () => {
  assert.equal(watchProgress({ progress: 33.3333333 }).label, '已观看 33%')
  assert.equal(watchProgress({ progress: 99.9 }).label, '已观看 99%')
  assert.equal(watchProgress({ progress: 100 }).label, '已看完')
  assert.equal(watchProgress({ progress: 0.3 }).label, '刚刚开始')
})

test('unknown durations and invalid values never produce NaN, infinity, or overflowing progress', () => {
  assert.deepEqual(
    watchProgress({ progress: 25, positionSeconds: 65, durationSeconds: null }),
    { progress: 25, label: '观看至 1:05' }
  )
  assert.deepEqual(
    watchProgress({
      progress: NaN,
      positionSeconds: -3,
      durationSeconds: Infinity,
    }),
    { progress: 0, label: '尚未开始' }
  )
  assert.deepEqual(
    watchProgress({
      progress: 200,
      positionSeconds: 130,
      durationSeconds: 120,
    }),
    { progress: 100, label: '观看至 2:00 / 2:00' }
  )
  assert.deepEqual(
    watchProgress({ progress: 70, positionSeconds: 0, durationSeconds: 120 }),
    { progress: 0, label: '观看至 0:00 / 2:00' }
  )
})
