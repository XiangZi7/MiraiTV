import test from 'node:test'
import assert from 'node:assert/strict'
import { startFixture, media } from './fixture.mjs'

test('Nuxt production SSR and FastAPI forwarding contract', async t => {
  const fixture = await startFixture()
  t.after(fixture.stop)
  const request = (path, options) => fetch(`${fixture.base}${path}`, options)
  let cookie
  await t.test(
    'browser metadata reaches FastAPI through both SSR and direct requests',
    async () => {
      const headers = {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0.0.0 Safari/537.36',
        'sec-ch-ua-platform': '"Windows"',
        'x-mirai-client-ip': '198.51.100.66',
        'cf-connecting-ip': '198.51.100.66',
      }
      for (const path of ['/', '/api/backend/web/home']) {
        const start = fixture.requests.length
        const response = await request(path, { headers })
        await response.text()
        assert.equal(response.status, 200)
        const forwarded = fixture.requests.slice(start)
        assert.ok(forwarded.length)
        for (const item of forwarded) {
          assert.equal(item.headers['user-agent'], headers['user-agent'])
          assert.equal(item.headers['sec-ch-ua-platform'], '"Windows"')
          assert.equal(item.headers['x-client-platform'], 'web')
          assert.equal(item.headers['x-app-version'], 'web-test-release')
          assert.equal(item.headers['x-mirai-client-ip'], undefined)
        }
      }
    }
  )
  await t.test('SSR renders public content before JavaScript', async () => {
    for (const path of [
      '/',
      '/anime',
      '/movies',
      '/series',
      '/search?q=test',
      '/schedule',
      `/detail/${media.id}`,
      `/play/${media.id}`,
    ]) {
      const start = fixture.requests.length
      const response = await request(path)
      const html = await response.text()
      assert.equal(response.status, 200, `${path}: ${html.slice(0, 400)}`)
      assert.ok(html.includes(media.title), path)
      assert.ok(
        !html.includes('test-private-key'),
        'private runtime config must not appear in payload'
      )
      assert.match(response.headers.get('cache-control'), /no-store/)
      const provider = {
        '/anime': 'xifan',
        '/movies': 'huarw',
        '/series': 'huarw',
      }[path]
      if (provider) {
        const catalog = fixture.requests
          .slice(start)
          .find(item => item.path === 'web/catalog')
        assert.equal(
          catalog?.query.provider,
          provider,
          `${path} must use its video catalog`
        )
      }
    }
    assert.equal(
      fixture.requests.filter(item => item.path.endsWith('/sources')).length,
      0,
      'SSR must not block on video matching'
    )
  })
  await t.test('home only renders selected nonempty sections', async () => {
    const html = await (await request('/')).text()
    for (const title of ['剧场版', '最近更新'])
      assert.match(
        html,
        new RegExp(`<h2[^>]*>\\s*${title}`),
        `missing section: ${title}`
      )
    // latest 已经由头图消费，只留在 payload 里，不再重复成一行横向栏目
    assert.doesNotMatch(html, /<h2[^>]*>\s*最新条目/)
    assert.doesNotMatch(html, /<h2[^>]*>\s*热血战斗/)
    assert.doesNotMatch(html, /暂无热血战斗/)
  })
  await t.test('mobile bottom navigation ships with every page', async () => {
    for (const path of ['/', '/anime', `/detail/${media.id}`]) {
      const html = await (await request(path)).text()
      assert.match(html, /<nav[^>]*aria-label="主导航"/, path)
      assert.ok(html.includes('lg:hidden'), path)
    }
  })
  await t.test(
    'detail SSR shows the synopsis without presenting metadata episodes as playable',
    async () => {
      const html = await (await request(`/detail/${media.id}`)).text()
      assert.match(html, /id="detail-episodes"/)
      assert.ok(
        html.indexOf('role="tablist"') < html.indexOf('id="detail-episodes"')
      )
      assert.match(
        html,
        /role="tab"[^>]*aria-selected="true"[^>]*>[\s\S]*?详情/
      )
      assert.match(html, /id="detail-synopsis"/)
      assert.ok(
        html.indexOf('id="detail-episodes"') <
          html.indexOf('id="detail-synopsis"'),
        'episodes appear first in the shared details area'
      )
      assert.equal(
        html.slice(html.indexOf('<body')).split(media.synopsis).length - 1,
        2,
        'synopsis appears once in visible HTML and once in the SSR payload'
      )
      const rendered = html.slice(html.indexOf('<body')).split('<script')[0]
      assert.doesNotMatch(
        rendered,
        /aria-label="分集列表"|aria-label="第 \d+ 集|可播放 \d+ 集|共 \d+ 集/
      )
      assert.match(rendered, /查找资源中/)
      assert.doesNotMatch(html, /href="[^"]*episodeId=metadata-/)
      assert.equal(
        fixture.requests.filter(item => item.path.endsWith('/sources')).length,
        0,
        'detail SSR must render its episode panel without waiting for source matching'
      )
    }
  )
  await t.test(
    'playback loading stays inside the player on first render',
    async () => {
      const html = await (
        await request(
          `/play/${media.id}?source=fixture&seriesId=series-1&episodeId=real-episode-2`
        )
      ).text()
      const player = html.indexOf('data-player')
      const status = html.indexOf('data-player-status')
      assert.ok(player >= 0 && status > player)
      assert.match(html.slice(player, status + 1500), /正在加载播放资源/)
      assert.doesNotMatch(html.slice(0, player), /正在加载…|部分数据暂时不可用/)
      assert.equal(
        fixture.requests.filter(item => item.path.endsWith('/sources')).length,
        0
      )
    }
  )
  await t.test(
    'playback keeps its recommendation region when related data is empty without blocking SSR',
    async () => {
      const start = fixture.requests.length
      const html = await (await request(`/play/${media.id}`)).text()
      assert.match(html, /<aside[^>]*aria-label="相关推荐"/)
      assert.match(html, /data-playback-recommendations/)
      assert.match(html, /相关推荐[\s\S]*?正在加载/)
      assert.ok(
        !fixture.requests
          .slice(start)
          .some(item => item.path === 'web/catalog'),
        'fallback recommendations load on the client, independently of playback SSR'
      )
    }
  )
  await t.test(
    'private pages redirect guests and login returns only user',
    async () => {
      // 登录改为全站弹窗：访客被送回发现页，query 带着来源让弹窗落地后自动打开
      const guest = await request('/profile', { redirect: 'manual' })
      assert.equal(guest.status, 302)
      assert.match(guest.headers.get('location'), /^\/\?login=/)
      // 旧的 /login 链接与书签仍然可用，同样收敛到弹窗
      const legacy = await request('/login?redirect=%2Fwatchlist', {
        redirect: 'manual',
      })
      assert.equal(legacy.status, 302)
      assert.match(legacy.headers.get('location'), /^\/\?login=/)
      const login = await request('/api/backend/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account: 'alice', password: 'test-password' }),
      })
      assert.equal(login.status, 200)
      const data = await login.json()
      assert.equal(data.data.user.username, 'ssr-user')
      assert.ok(!('access_token' in data.data))
      const setCookie = login.headers.get('set-cookie')
      assert.match(setCookie, /HttpOnly/i)
      assert.match(setCookie, /SameSite=Lax/i)
      cookie = setCookie.split(';')[0]
    }
  )
  await t.test(
    'SSR cookie becomes Bearer and users remain isolated',
    async () => {
      for (const path of ['/profile', '/watchlist', '/history', '/settings']) {
        const response = await request(path, { headers: { cookie } })
        assert.equal(response.status, 200, path)
        assert.ok(
          !(await response.text()).includes(fixture.tokens.alice),
          'token cannot enter SSR payload'
        )
      }
      const a = await (
        await request('/profile', { headers: { cookie } })
      ).text()
      const b = await (
        await request('/profile', {
          headers: { cookie: `miraitv_session=${fixture.tokens.bob}` },
        })
      ).text()
      assert.ok(a.includes('ssr-user'))
      assert.ok(b.includes('other-user'))
      for (const item of fixture.requests) {
        assert.equal(
          item.headers.cookie,
          undefined,
          'browser cookies must not reach FastAPI'
        )
        assert.equal(item.headers['x-app-key'], 'test-private-key')
        assert.match(item.headers['x-forwarded-for'], /(?:127\.0\.0\.1|::1)$/)
      }
    }
  )
  await t.test(
    'queries, JSON mutations and multipart avatar are preserved',
    async () => {
      await request(
        '/api/backend/web/catalog?kind=anime&sort=rating&minRating=8&year=2026&cursor=page-two'
      )
      assert.deepEqual(fixture.requests.at(-1).query, {
        kind: 'anime',
        sort: 'rating',
        minRating: '8',
        year: '2026',
        cursor: 'page-two',
      })
      const favorite = await request('/api/backend/web/me/favorites', {
        method: 'PUT',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ mediaId: media.id }),
      })
      assert.equal(favorite.status, 200)
      assert.equal(
        fixture.requests.at(-1).headers.authorization,
        `Bearer ${fixture.tokens.alice}`
      )
      const form = new FormData()
      form.append(
        'file',
        new Blob(['avatar-bytes'], { type: 'image/png' }),
        'avatar.png'
      )
      assert.equal(
        (
          await request('/api/backend/users/me/avatar', {
            method: 'POST',
            headers: { cookie },
            body: form,
          })
        ).status,
        200
      )
      assert.match(
        fixture.requests.at(-1).headers['content-type'],
        /multipart\/form-data; boundary=/
      )
      assert.ok(
        fixture.requests.at(-1).raw.includes(Buffer.from('avatar-bytes'))
      )
      const image = await request('/api/backend/users/1/avatar?v=fixture')
      assert.equal(image.headers.get('content-type'), 'image/png')
      assert.deepEqual(
        [...new Uint8Array(await image.arrayBuffer()).slice(0, 4)],
        [137, 80, 78, 71]
      )
    }
  )
  await t.test(
    'validation and authentication failures keep their HTTP status',
    async () => {
      const invalid = await request('/api/backend/web/search?keyword=invalid')
      assert.equal(invalid.status, 422)
      assert.equal((await invalid.json()).detail[0].msg, '测试参数错误')
      const expired = await request('/api/backend/web/me/profile', {
        headers: { cookie: 'miraitv_session=expired' },
      })
      assert.equal(expired.status, 401)
      assert.match(expired.headers.get('set-cookie'), /Max-Age=0/)
    }
  )
  await t.test(
    'cross-origin writes and unlisted proxy paths are rejected',
    async () => {
      const before = fixture.requests.length
      assert.equal(
        (
          await request('/api/backend/web/me/favorites', {
            method: 'PUT',
            headers: { cookie, origin: 'https://untrusted.example' },
          })
        ).status,
        403
      )
      assert.equal((await request('/api/backend/not-allowed')).status, 404)
      assert.equal(fixture.requests.length, before)
    }
  )
  await t.test(
    'logout revokes backend session and removes cookie',
    async () => {
      const logout = await request('/api/backend/auth/logout', {
        method: 'POST',
        headers: { cookie },
      })
      assert.equal(logout.status, 200)
      assert.match(logout.headers.get('set-cookie'), /Max-Age=0/)
      assert.equal(
        (await request('/api/backend/web/me/profile', { headers: { cookie } }))
          .status,
        401
      )
    }
  )
})

test('profile backgrounds, first collection covers and current weekday ship in SSR', async t => {
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const day =
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Shanghai',
        weekday: 'short',
      }).format(new Date())
    ) + 1
  const fixture = await startFixture({
    scheduleWeekday: day,
    collectionPoster: '/icons/icon-512.png',
  })
  t.after(fixture.stop)
  fixture.favorites.add(media.id)
  const headers = { cookie: 'miraitv_session=' + fixture.tokens.alice }
  const request = (path, options = {}) =>
    fetch(fixture.base + path, {
      ...options,
      headers: { ...headers, ...options.headers },
    })
  const watchlist = await (await request('/watchlist')).text()
  const collection = watchlist.match(
    /<a[^>]*href="\/watchlist\?collection=all"[^>]*>([\s\S]*?)<\/a>/
  )?.[1]
  assert.ok(collection)
  assert.match(collection, /<img[^>]*src="\/icons\/icon-512.png"/)
  const selected = [
    ...watchlist.matchAll(
      /<button(?=[^>]*role="tab")(?=[^>]*aria-selected="true")[^>]*>([\s\S]*?)<\/button>/g
    ),
  ].map(match => match[1])
  assert.ok(selected.some(text => text.includes(labels[day - 1])))
  assert.doesNotMatch(watchlist, />\s*更新中\s*</)
  const form = new FormData()
  form.append(
    'file',
    new Blob(['background-bytes'], { type: 'image/png' }),
    'background.png'
  )
  const uploaded = await request('/api/backend/users/me/background', {
    method: 'POST',
    body: form,
  })
  assert.equal(uploaded.status, 200)
  assert.equal(
    (await uploaded.json()).data.background_url,
    '/api/v1/users/1/background?v=fixture'
  )
  assert.ok(
    fixture.requests.at(-1).raw.includes(Buffer.from('background-bytes'))
  )
  const profile = await (await request('/profile')).text()
  assert.match(
    profile,
    /src="\/api\/backend\/users\/1\/background\?v=fixture" alt="个人主页背景"/
  )
  assert.equal(
    (await request('/api/backend/users/1/background?v=fixture')).headers.get(
      'content-type'
    ),
    'image/png'
  )
  assert.equal(
    (await request('/api/backend/users/me/background', { method: 'DELETE' }))
      .status,
    200
  )
  assert.equal(
    (await (await request('/api/session')).json()).data.background_url,
    null
  )
})
