import test from 'node:test'
import assert from 'node:assert/strict'
import { startFixture, media } from './fixture.mjs'

test('guest history is public and activity sync uses the authenticated BFF', async t => {
  const fixture = await startFixture()
  t.after(fixture.stop)
  const history = await fetch(`${fixture.base}/history`, { redirect: 'manual' })
  assert.equal(history.status, 200)
  const html = await history.text()
  assert.match(html, /观看记录保存在当前设备/)
  assert.match(html, /aria-label="观看记录"/)
  assert.ok(!fixture.requests.some(item => item.path === 'web/me/history'))
  const url = `${fixture.base}/api/backend/web/me/activity/sync`
  assert.equal(
    (
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ changes: [] }),
      })
    ).status,
    401
  )
  const login = await fetch(`${fixture.base}/api/backend/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ account: 'alice', password: 'test-password' }),
  })
  const cookie = login.headers.get('set-cookie').split(';')[0]
  const request = changes =>
    fetch(url, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ changes }),
    })
  const changes = [
    {
      type: 'search',
      search: { keyword: '搜索历史', updatedAt: new Date().toISOString() },
    },
    {
      type: 'history',
      history: {
        mediaId: media.id,
        title: media.title,
        poster: null,
        episodeId: 'real-episode-2',
        episodeNumber: 2,
        progress: 45,
        positionSeconds: 54,
        durationSeconds: 120,
        updatedAt: new Date().toISOString(),
      },
    },
  ]
  const saved = await request(changes)
  assert.equal(saved.status, 200)
  assert.equal(saved.headers.get('cache-control'), 'no-store')
  const result = (await saved.json()).data
  assert.equal(result.searches[0].keyword, '搜索历史')
  assert.equal(result.history[0].positionSeconds, 54)
  const forwarded = fixture.requests.find(
    item => item.path === 'web/me/activity/sync' && item.headers.authorization
  )
  assert.deepEqual(JSON.parse(forwarded.raw.toString()).changes, changes)
  const restored = (await (await request([])).json()).data
  assert.equal(restored.history[0].episodeId, 'real-episode-2')
  await request([
    { type: 'remove-history', mediaId: media.id },
    { type: 'clear-searches' },
  ])
  const removed = (await (await request([])).json()).data
  assert.equal(removed.history.length, 0)
  assert.equal(removed.searches.length, 0)
})
