import test from 'node:test'
import assert from 'node:assert/strict'
import { startFixture, media } from './fixture.mjs'

test('independent SSR requests start together and personal home content is deferred', async t => {
  const seen = new Set()
  const waiters = new Map()
  const dependencies = new Map([
    ['web/home', 'web/site-content'],
    ['web/providers', 'web/catalog'],
    ['web/search', 'web/search/suggestions'],
  ])
  const fixture = await startFixture({
    async beforeRespond(path) {
      seen.add(path)
      waiters.get(path)?.()
      const required = dependencies.get(path)
      if (required && !seen.has(required))
        await new Promise(resolve => waiters.set(required, resolve))
    },
  })
  t.after(fixture.stop)
  for (const path of ['/', '/anime', '/search?q=test']) {
    const response = await fetch(fixture.base + path, {
      signal: AbortSignal.timeout(5000),
      headers: { cookie: `miraitv_session=${fixture.tokens.alice}` },
    })
    assert.equal(response.status, 200, path)
    assert.ok((await response.text()).includes(media.title), path)
  }
  assert.ok(
    !fixture.requests.some(request =>
      ['web/me/history', 'web/me/watchlist'].includes(request.path)
    ),
    '首页 SSR 不等待个人栏目的元数据补全'
  )
})

test('hashed assets and public images cache independently of private HTML', async t => {
  const fixture = await startFixture()
  t.after(fixture.stop)
  const response = await fetch(fixture.base)
  const html = await response.text()
  assert.match(response.headers.get('cache-control'), /no-store/)
  const script = html.match(/<script[^>]*src="([^\"]+\.js)"/)?.[1]
  assert.ok(script)
  for (const path of [
    script,
    '/images/backgrounds/anime-hero.webp',
    '/brand/mirai-mark.webp',
  ]) {
    const asset = await fetch(fixture.base + path)
    assert.equal(asset.status, 200, path)
    const policy = asset.headers.get('cache-control')
    assert.match(policy, /public.*max-age=/, path)
    assert.doesNotMatch(policy, /no-store/, path)
    await asset.arrayBuffer()
  }
  const session = await fetch(fixture.base + '/api/session')
  assert.match(session.headers.get('cache-control'), /no-store/)
})
