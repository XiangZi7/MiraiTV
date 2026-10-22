import test from 'node:test'
import assert from 'node:assert/strict'
import { get as httpGet } from 'node:http'
import { startFixture } from './fixture.mjs'

test('one production build supports independent runtime branding, SEO, analytics and manifest', async t => {
  const origin = 'https://cinema.example'
  const fixture = await startFixture({
    runtimeEnv: {
      NUXT_PUBLIC_SITE_URL: origin,
      NUXT_PUBLIC_SITE_NAME: 'Example Cinema',
      NUXT_PUBLIC_SITE_DESCRIPTION: '独立部署的测试说明',
      NUXT_PUBLIC_SITE_LOGO: '/icons/favicon-64.png',
      NUXT_PUBLIC_SITE_IMAGE: '/og-image.webp',
      NUXT_PUBLIC_SITE_TAGLINE: '专属页脚文本',
      NUXT_PUBLIC_GA_ID: 'G-EXAMPLE123',
    },
  })
  t.after(fixture.stop)
  const home = await fetch(fixture.base + '/')
  assert.equal(home.status, 200)
  const html = await home.text()
  assert.match(html, /<title>首页 · Example Cinema<\/title>/)
  assert.ok(html.includes('content="独立部署的测试说明"'))
  assert.ok(html.includes('src="/icons/favicon-64.png"'))
  assert.ok(
    html.includes('property="og:image" content="' + origin + '/og-image.webp"')
  )
  assert.ok(html.includes('Example Cinema 首页'))
  assert.ok(html.includes('专属页脚文本'))
  assert.ok(html.includes('G-EXAMPLE123'))
  assert.ok(html.includes('rel="canonical" href="' + origin + '/"'))
  assert.ok(
    !html.includes('MiraiTV'),
    'default branding must not leak into a customized site'
  )
  for (const secret of ['test-private-key', 'test-proxy-secret']) {
    assert.ok(
      !html.includes(secret),
      'server-only settings must not enter the public payload'
    )
  }
  const data = JSON.parse(
    html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
    )[1]
  )
  const website = (data['@graph'] ?? [data]).find(
    item => item['@type'] === 'WebSite'
  )
  assert.equal(website.name, 'Example Cinema')
  assert.equal(website.description, '独立部署的测试说明')
  assert.equal(website.publisher.name, 'Example Cinema')
  assert.equal(website.publisher.logo.url, origin + '/icons/favicon-64.png')
  const manifestResponse = await fetch(fixture.base + '/manifest.json')
  assert.match(
    manifestResponse.headers.get('content-type'),
    /application\/manifest\+json/
  )
  assert.equal(manifestResponse.headers.get('cache-control'), 'no-cache')
  const manifest = await manifestResponse.json()
  assert.equal(manifest.name, 'Example Cinema')
  assert.equal(manifest.short_name, 'Example Cinema')
  assert.equal(manifest.description, '独立部署的测试说明')
  const robots = await (await fetch(fixture.base + '/robots.txt')).text()
  assert.ok(robots.includes('Sitemap: ' + origin + '/sitemap.xml'))
  const sitemap = await (await fetch(fixture.base + '/sitemap.xml')).text()
  assert.ok(sitemap.includes('<loc>' + origin + '/</loc>'))
  assert.ok(!sitemap.includes('miraitv.example'))
})

test('public defaults disable analytics and legacy redirects without personal configuration', async t => {
  const fixture = await startFixture({
    runtimeEnv: { NUXT_PUBLIC_GA_ID: undefined },
  })
  t.after(fixture.stop)
  const html = await (await fetch(fixture.base + '/')).text()
  assert.match(html, /<title>首页 · MiraiTV<\/title>/)
  assert.doesNotMatch(
    html,
    /G-[A-Z0-9]+/,
    'the built defaults must not contain a personal GA ID'
  )
  const response = await new Promise((resolve, reject) => {
    httpGet(
      fixture.base + '/api/session',
      { headers: { host: 'legacy.miraitv.example' } },
      response => {
        response.resume()
        response.on('end', () => resolve(response))
        response.on('error', reject)
      }
    ).on('error', reject)
  })
  assert.equal(response.statusCode, 200)
  assert.equal(response.headers.location, undefined)
  const manifest = await (await fetch(fixture.base + '/manifest.json')).json()
  assert.equal(manifest.name, 'MiraiTV')
})
