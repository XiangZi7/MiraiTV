import test from 'node:test'
import assert from 'node:assert/strict'
import { get as httpGet } from 'node:http'
import { startFixture, media } from './fixture.mjs'

const origin = 'https://miraitv.example'
const structuredData = html => {
  const text = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
  )?.[1]
  assert.ok(text, 'JSON-LD must be present in the server response')
  const data = JSON.parse(text)
  return data['@graph'] ?? [data]
}

test('SEO metadata, crawl endpoints and install assets ship in production', async t => {
  const fixture = await startFixture()
  t.after(fixture.stop)
  const request = (path, options) => fetch(fixture.base + path, options)

  await t.test(
    'the legacy Pages domain redirects to the custom domain',
    async () => {
      const requestWithHost = (path, host) =>
        new Promise((resolve, reject) => {
          httpGet(fixture.base + path, { headers: { host } }, response => {
            response.resume()
            response.on('end', () => resolve(response))
            response.on('error', reject)
          }).on('error', reject)
        })
      const upstreamRequests = fixture.requests.length
      for (const path of [
        '/',
        '/detail/' + media.id + '?utm_source=share',
        '/search?q=%E5%8A%A8%E6%BC%AB&page=2',
        '/api/session',
      ]) {
        const response = await requestWithHost(path, 'miraitv.pages.dev')
        assert.equal(response.statusCode, 301, path)
        assert.equal(response.headers.location, 'https://tv.yxcr.top' + path)
      }
      assert.equal(fixture.requests.length, upstreamRequests)

      for (const host of [
        'tv.yxcr.top',
        'preview.miraitv.pages.dev',
        'miraitv.pages.dev.other.example',
      ]) {
        const response = await requestWithHost('/api/session', host)
        assert.equal(response.statusCode, 200, host)
        assert.equal(response.headers.location, undefined, host)
      }
    }
  )

  await t.test(
    'public pages have unique titles, descriptions and canonical URLs before hydration',
    async () => {
      for (const [path, title, canonical] of [
        ['/', '首页', '/'],
        ['/anime', '动漫', '/anime'],
        ['/movies', '电影', '/movies'],
        [
          '/movies?kind=documentary&utm_source=test',
          '纪录片',
          '/movies?kind=documentary',
        ],
        ['/series', '剧集', '/series'],
        ['/schedule', '周番排期', '/schedule'],
        ['/search', '搜索', '/search'],
        ['/detail/' + media.id, media.title, '/detail/' + media.id],
      ]) {
        const response = await request(path)
        const html = await response.text()
        assert.equal(response.status, 200, path)
        assert.equal((html.match(/<title>/g) ?? []).length, 1, path)
        assert.ok(html.includes('<title>' + title + ' · MiraiTV</title>'), path)
        assert.match(html, /<meta name="description" content="[^"]+"/, path)
        assert.ok(
          html.includes('rel="canonical" href="' + origin + canonical + '"'),
          path
        )
        assert.ok(
          html.includes(
            'property="og:url" content="' + origin + canonical + '"'
          ),
          path
        )
        assert.ok(
          html.includes(
            'property="og:image" content="' + origin + '/og-image.jpg"'
          ),
          path
        )
        assert.ok(
          html.includes(
            'property="og:image:secure_url" content="' +
              origin +
              '/og-image.jpg"'
          ),
          path
        )
        assert.match(
          html,
          /property="og:image:type" content="image\/jpeg"/,
          path
        )
        assert.match(html, /property="og:image:width" content="1200"/, path)
        assert.match(html, /property="og:image:height" content="630"/, path)
        assert.match(
          html,
          /name="robots" content="index, follow, max-image-preview:large"/,
          path
        )
        assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, path)
        assert.doesNotMatch(
          html,
          /<script[^>]*src="https:\/\/www\.googletagmanager\.com/,
          'analytics must not block the SSR head'
        )
        assert.ok(structuredData(html).length > 0, path)
      }
      const detail = structuredData(
        await (await request('/detail/' + media.id)).text()
      )
      const series = detail.find(item => item['@type'] === 'TVSeries')
      assert.equal(series.name, media.title)
      assert.equal(series.numberOfEpisodes, media.episodes)
      assert.equal(
        series.aggregateRating,
        undefined,
        'missing rating count must never be fabricated'
      )
    }
  )

  await t.test(
    'search, login variants, playback and personal pages are excluded from indexing',
    async () => {
      for (const path of [
        '/search?q=test',
        '/?login=/profile',
        '/play/' + media.id + '?episodeId=real-episode-2',
      ]) {
        const html = await (await request(path)).text()
        assert.match(html, /name="robots" content="noindex, follow"/, path)
        if (path.startsWith('/play/'))
          assert.ok(
            html.includes(
              'rel="canonical" href="' + origin + '/detail/' + media.id + '"'
            )
          )
      }
      for (const path of ['/profile', '/history', '/watchlist', '/settings']) {
        const response = await request(path, {
          headers: { cookie: 'miraitv_session=' + fixture.tokens.alice },
        })
        assert.equal(response.status, 200)
        assert.match(response.headers.get('x-robots-tag'), /noindex/, path)
        assert.match(
          await response.text(),
          /name="robots" content="noindex, follow"/,
          path
        )
      }
      const login = await request('/login', { redirect: 'manual' })
      assert.equal(login.status, 302)
      assert.match(login.headers.get('x-robots-tag'), /noindex/)
      assert.equal((await request('/detail/missing')).status, 404)
    }
  )

  await t.test(
    'robots and sitemap use runtime origin, deduplicate media and reuse cached public data',
    async () => {
      const robots = await request('/robots.txt')
      assert.match(robots.headers.get('content-type'), /text\/plain/)
      const rules = await robots.text()
      assert.ok(rules.includes('Sitemap: ' + origin + '/sitemap.xml'))
      assert.ok(rules.includes('Disallow: /api/'))
      assert.ok(
        !rules.includes('Disallow: /play/'),
        'crawlers must be able to read the noindex directive'
      )
      const start = fixture.requests.length
      const response = await request('/sitemap.xml', {
        headers: { cookie: 'miraitv_session=' + fixture.tokens.alice },
      })
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-type'), /application\/xml/)
      assert.match(response.headers.get('cache-control'), /max-age=600/)
      const xml = await response.text()
      const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
        match => match[1]
      )
      assert.ok(urls.includes(origin + '/movies?kind=documentary'))
      assert.ok(urls.includes(origin + '/detail/' + media.id))
      assert.equal(new Set(urls).size, urls.length)
      assert.ok(urls.every(url => url.startsWith(origin + '/')))
      assert.doesNotMatch(
        xml,
        /\/play\/|\/profile|\/watchlist|\/history|\/settings|\/login|\/api\//
      )
      const calls = fixture.requests.length
      assert.equal(await (await request('/sitemap.xml')).text(), xml)
      assert.equal(
        fixture.requests.length,
        calls,
        'cache hits must not refetch upstream content'
      )
      for (const call of fixture.requests.slice(start)) {
        assert.equal(call.headers.cookie, undefined)
        assert.equal(call.headers.authorization, undefined)
      }
    }
  )

  await t.test(
    'manifest icons and default social card exist at their declared dimensions',
    async () => {
      const home = await (await request('/')).text()
      assert.match(home, /rel="manifest" href="\/manifest.json"/)
      const manifest = await (await request('/manifest.json')).json()
      assert.equal(manifest.start_url, '/')
      assert.equal(manifest.display, 'standalone')
      const shareCard = await request('/og-image.jpg')
      assert.equal(shareCard.status, 200)
      assert.match(shareCard.headers.get('content-type'), /image\/jpeg/)
      const shareBytes = Buffer.from(await shareCard.arrayBuffer())
      assert.deepEqual([...shareBytes.subarray(0, 3)], [0xff, 0xd8, 0xff])
      assert.equal(shareBytes.readUInt16BE(shareBytes.length - 2), 0xffd9)
      assert.ok(
        shareBytes.length < 50_000,
        'the default JPEG share card stays small'
      )
      for (const icon of [
        ...manifest.icons,
        { src: '/icons/apple-touch-icon.png', sizes: '180x180' },
        { src: '/icons/favicon-64.png', sizes: '64x64' },
        { src: '/og-image.webp', sizes: '1200x630' },
      ]) {
        const image = await request(icon.src)
        assert.equal(image.status, 200)
        const bytes = Buffer.from(await image.arrayBuffer())
        if (icon.src.endsWith('.webp')) {
          assert.match(image.headers.get('content-type'), /image\/webp/)
          assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
          assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
          assert.equal(bytes.toString('ascii', 12, 16), 'VP8 ')
          assert.equal(
            (bytes.readUInt16LE(26) & 0x3fff) +
              'x' +
              (bytes.readUInt16LE(28) & 0x3fff),
            icon.sizes
          )
          assert.ok(
            bytes.length < 50_000,
            'the default share card must remain compressed'
          )
        } else {
          assert.deepEqual(
            [...bytes.subarray(0, 8)],
            [137, 80, 78, 71, 13, 10, 26, 10]
          )
          assert.equal(
            bytes.readUInt32BE(16) + 'x' + bytes.readUInt32BE(20),
            icon.sizes
          )
        }
      }
    }
  )
})

test('JSON-LD escapes upstream markup and a cold sitemap failure returns a retryable error', async t => {
  const publicContent = { unavailable: false }
  const detailMedia = {
    ...media,
    title: '</script><script>alert("upstream")</script>',
    synopsis: '简介保留 <片名> & 正文',
    ratingCount: 240,
    poster: '/posters/fixture.jpg',
  }
  const fixture = await startFixture({ detailMedia, publicContent })
  t.after(fixture.stop)
  const response = await fetch(fixture.base + '/detail/' + media.id)
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.ok(
    !html.includes(detailMedia.title),
    'upstream text cannot break out of a script tag'
  )
  const series = structuredData(html).find(item => item['@type'] === 'TVSeries')
  assert.equal(
    series.name,
    detailMedia.title,
    'escaping must preserve the original JSON value'
  )
  assert.equal(series.description, detailMedia.synopsis)
  assert.equal(series.aggregateRating.ratingCount, 240)
  assert.equal(series.image, origin + '/posters/fixture.jpg')
  assert.ok(
    html.includes(
      'property="og:image" content="' + origin + '/posters/fixture.jpg"'
    )
  )
  assert.doesNotMatch(
    html,
    /property="og:image:(?:type|width|height)"/,
    'custom posters must not inherit the default card format or dimensions'
  )
  publicContent.unavailable = true
  const sitemap = await fetch(fixture.base + '/sitemap.xml')
  assert.equal(
    sitemap.status,
    503,
    'a failed aggregation must not publish a cached empty sitemap'
  )
})
