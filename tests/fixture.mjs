import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
export const media = {
  id: 'bangumi~MQ',
  title: '接口测试作品',
  originalTitle: 'Test Title',
  kind: 'anime',
  year: 2026,
  rating: 8.5,
  region: '日本',
  genres: ['奇幻'],
  tint: { from: '#6f8fbf', to: '#161e2c' },
  synopsis: '真实接口响应中的剧情简介',
  poster: null,
  backdrop: null,
  episodes: 2,
  tagline: [],
  aliases: [],
}
export const user = {
  id: 1,
  username: 'ssr-user',
  email: 'test@example.com',
  phone: null,
  bio: '服务端登录资料',
  avatar_url: null,
  created_at: '2026-10-14T10:00:00+08:00',
  updated_at: '2026-10-14T10:00:00+08:00',
  last_login_at: null,
}
const tokens = { alice: 'A'.repeat(43), bob: 'B'.repeat(43) }

export async function startFixture({
  streamDirectory,
  detailMedia = media,
  publicContent = { unavailable: false },
  pagination = { failures: 0 },
  homeMovies,
  relatedMedia = [],
  episodeLines = [{ id: 'line-a', name: '线路 A' }],
  playbackQualities = ['原画'],
  videoUrl = 'https://video.invalid/test.mp4',
  additionalSources = [],
  scheduleWeekday = 3,
  collectionPoster = null,
  siteContent = {
    announcementsEnabled: true,
    promotionsEnabled: false,
    announcements: [],
    apps: [],
  },
  searchState = { unavailable: false, partial: false },
  beforeRespond = async () => {},
  runtimeEnv = {},
} = {}) {
  const requests = []
  const favorites = new Set()
  const histories = new Map()
  const activities = new Map()
  const revoked = new Set()
  const accountImages = new Map()
  const imageFiles = new Map()
  const episodes = [1, 2].map(index => ({
    id: `real-episode-${index}`,
    index,
    title: `第 ${index} 集`,
    durationSeconds: 120,
    lines: episodeLines.map(line => ({
      ...line,
      episodeId: `real-episode-${index}`,
    })),
  }))
  const backend = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://fixture')
    if (streamDirectory && url.pathname.startsWith('/stream/')) {
      const name = basename(url.pathname)
      try {
        const file = await readFile(join(streamDirectory, name))
        res.writeHead(200, {
          'content-type': name.endsWith('.m3u8')
            ? 'application/vnd.apple.mpegurl'
            : 'video/mp2t',
          'access-control-allow-origin': '*',
        })
        return res.end(file)
      } catch {
        res.writeHead(404)
        return res.end()
      }
    }
    const path = url.pathname.replace('/api/v1/', '')
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks)
    const body =
      req.headers['content-type']?.includes('application/json') && raw.length
        ? JSON.parse(raw.toString())
        : undefined
    requests.push({
      path,
      method: req.method,
      query: Object.fromEntries(url.searchParams),
      headers: req.headers,
      raw,
    })
    await beforeRespond(path)
    const send = (data, status = 200, message = 'success') => {
      res.writeHead(status, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      })
      res.end(JSON.stringify({ code: status, message, data }))
    }
    if (req.headers['x-app-key'] !== 'test-private-key')
      return send(null, 401, 'App Key 缺失')
    if (
      publicContent.unavailable &&
      path.startsWith('web/') &&
      !path.startsWith('web/me/')
    )
      return send(null, 503, '公开内容暂不可用')
    const token = req.headers.authorization?.replace('Bearer ', '')
    const loggedIn =
      Object.values(tokens).includes(token) && !revoked.has(token)
    const name = token === tokens.bob ? 'other-user' : 'ssr-user'
    if (
      (path.startsWith('web/me/') ||
        path.startsWith('users/me') ||
        ['auth/logout', 'auth/password'].includes(path)) &&
      !loggedIn
    )
      return send(null, 401, '请重新登录')
    if (path === 'auth/login') {
      if (body.password !== 'test-password')
        return send(null, 401, '账号或密码错误')
      const token = body.account === 'bob' ? tokens.bob : tokens.alice
      revoked.delete(token)
      return send({
        access_token: token,
        expires_in: 604800,
        token_type: 'bearer',
        user: {
          ...user,
          username: body.account === 'bob' ? 'other-user' : user.username,
        },
      })
    }
    if (path === 'auth/logout' || path === 'auth/password') {
      revoked.add(token)
      return send(null)
    }
    const images = accountImages.get(token) ?? {
      avatar_url: null,
      background_url: null,
    }
    if (path === 'users/me')
      return send({ ...user, username: name, ...images, ...(body ?? {}) })
    if (path === 'users/me/avatar' || path === 'users/me/background') {
      const kind = path.split('/').at(-1)
      images[`${kind}_url`] =
        req.method === 'DELETE' ? null : `/api/v1/users/1/${kind}?v=fixture`
      accountImages.set(token, images)
      const start = raw.indexOf(Buffer.from('\r\n\r\n')) + 4
      const end = raw.lastIndexOf(Buffer.from('\r\n--'))
      if (start >= 4 && end > start)
        imageFiles.set(kind, raw.subarray(start, end))
      return send({ ...user, username: name, ...images })
    }
    if (path === 'users/1/avatar' || path === 'users/1/background') {
      const image = imageFiles.get(path.split('/').at(-1))
      const jpeg = image?.[0] === 0xff && image?.[1] === 0xd8
      res.writeHead(200, { 'content-type': jpeg ? 'image/jpeg' : 'image/png' })
      return res.end(
        jpeg ? image : await readFile(join(root, 'public/icons/icon-512.png'))
      )
    }
    if (path === 'web/providers')
      return send([
        {
          key: 'bangumi',
          name: 'Bangumi',
          kinds: ['anime', 'movie', 'series'],
          sorts: ['latest', 'rating'],
          supportsSchedule: true,
        },
      ])
    const schedule = [
      {
        id: 'schedule-1',
        media,
        weekday: scheduleWeekday,
        airTime: null,
        latestEpisode: null,
        status: 'airing',
      },
    ]
    if (path === 'web/home')
      return send({
        hero: [media],
        weeklySchedule: schedule,
        editorsPick: { feature: media, related: homeMovies?.slice(1, 4) ?? [] },
        popularMovies: homeMovies ?? [media],
        // latest / ranked 由头图与高分推荐消费，其余栏目按返回顺序横向渲染
        sections: [
          {
            key: 'latest',
            title: '最新条目',
            kicker: 'Latest',
            items: [media],
          },
          {
            key: 'theatrical',
            title: '剧场版',
            kicker: 'Anime Movies',
            items: [media],
          },
          {
            key: 'xifanLatest',
            title: '新番上架',
            kicker: 'Just Added',
            items: [media],
          },
          { key: 'battle', title: '热血战斗', kicker: 'Action', items: [] },
        ],
        partial: false,
        unavailableSections: [],
      })
    if (path === 'web/schedule')
      return send({
        items: schedule,
        weekDates: [
          '2026-10-12',
          '2026-10-13',
          '2026-10-14',
          '2026-10-15',
          '2026-10-16',
          '2026-10-17',
          '2026-10-18',
        ],
        timezone: 'Asia/Shanghai',
        partial: false,
        unavailableProviders: [],
      })
    if (path === 'web/site-content') return send(siteContent)
    if (path === 'web/search/suggestions')
      return searchState.unavailable
        ? send(null, 502, '上游暂不可用，请稍后重试')
        : send({ trending: [media.title], recommendations: [media] })
    if (path === 'web/search' || path === 'web/catalog') {
      if (path === 'web/search' && searchState.unavailable)
        return send(null, 502, '上游暂不可用，请稍后重试')
      if (path === 'web/search' && searchState.empty)
        return send({
          items: [],
          total: 0,
          hasMore: false,
          nextCursor: null,
          partial: searchState.partial,
        })
      if (url.searchParams.get('keyword') === 'invalid') {
        res.writeHead(422, { 'content-type': 'application/json' })
        return res.end(
          JSON.stringify({
            detail: [{ msg: '测试参数错误', loc: ['query', 'keyword'] }],
          })
        )
      }
      const next = url.searchParams.has('cursor')
      if (next && pagination.failures > 0) {
        pagination.failures -= 1
        return send(null, 502, '分页暂不可用')
      }
      return send({
        items: [
          {
            ...media,
            ...(path === 'web/search'
              ? { sourceKey: 'fixture', sourceName: '测试视频源' }
              : {}),
            id: next ? 'bangumi~Mg' : media.id,
            title: next ? '分页第二部作品' : media.title,
          },
        ],
        total: 2,
        hasMore: !next && !(path === 'web/search' && searchState.exhausted),
        nextCursor:
          next || (path === 'web/search' && searchState.exhausted)
            ? null
            : 'page-two',
        partial: path === 'web/search' && searchState.partial,
      })
    }
    if (path === `web/media/${media.id}`)
      return send({
        media: detailMedia,
        episodes: episodes.map(episode => ({
          id: `metadata-${episode.index}`,
          index: episode.index,
          title: episode.title,
          duration: '2m',
          tint: media.tint,
        })),
        cast: [],
        stills: [],
        related: relatedMedia,
        partial: false,
        unavailableSections: [],
      })
    if (path === `web/media/${media.id}/sources`)
      return send({
        mediaId: media.id,
        available: true,
        matches: [
          {
            source: 'fixture',
            sourceName: '测试播放源',
            seriesId: 'series-1',
            title: media.title,
            confidence: 1,
            episodes,
          },
          ...additionalSources.map(source => ({
            ...source,
            title: media.title,
            confidence: 1,
            episodes,
          })),
        ].filter(
          match =>
            url.searchParams.get('search') === 'true' ||
            !url.searchParams.has('seriesId') ||
            (match.source === url.searchParams.get('source') &&
              match.seriesId === url.searchParams.get('seriesId'))
        ),
        partial: false,
        unavailableSources: [],
        message: null,
      })
    if (path === `web/media/${media.id}/play`)
      return send({
        mediaId: media.id,
        source: url.searchParams.get('source') ?? 'fixture',
        episode:
          episodes.find(
            item => item.id === url.searchParams.get('episodeId')
          ) ?? episodes[0],
        line: url.searchParams.get('line') ?? episodeLines[0]?.id,
        urls: playbackQualities.map(quality => ({
          quality,
          url: streamDirectory
            ? `http://${req.headers.host}/stream/index.m3u8`
            : videoUrl,
          size: null,
        })),
        subtitles: [],
        headers: {},
        expireAt: null,
      })
    if (path === 'web/me/profile')
      return send({
        id: '1',
        name,
        bio: user.bio,
        avatar: images.avatar_url,
        background: images.background_url,
        badge: null,
        tint: media.tint,
        stats: {
          watched: histories.size,
          collections: favorites.size ? 1 : 0,
          following: null,
          followers: null,
        },
      })
    if (path === 'web/me/watchlist')
      return send({
        items: favorites.has(media.id)
          ? [
              {
                ...media,
                poster: collectionPoster ?? media.poster,
                notifyEnabled: true,
              },
            ]
          : [],
        collections: favorites.size
          ? [
              {
                id: 'all',
                name: '全部收藏',
                count: favorites.size,
                tint: media.tint,
                items: [{ ...media, poster: collectionPoster ?? media.poster }],
              },
            ]
          : [],
        total: favorites.size,
        page: 1,
        pageSize: Number(url.searchParams.get('pageSize')),
        partial: false,
      })
    if (path === 'web/me/favorites' && req.method === 'PUT') {
      favorites.add(body.mediaId)
      return send({ ...media, notifyEnabled: body.notifyEnabled ?? true })
    }
    if (path === `web/me/favorites/${media.id}`) {
      if (req.method === 'DELETE') {
        favorites.delete(media.id)
        return send(null)
      }
      return send({
        collected: favorites.has(media.id),
        notifyEnabled: favorites.has(media.id),
      })
    }
    if (path === 'web/me/activity/sync') {
      const activity = activities.get(token) ?? { searches: [], history: [] }
      for (const change of body.changes) {
        if (change.type === 'search') {
          const current = activity.searches.find(
            item => item.keyword === change.search.keyword
          )
          if (
            !current ||
            Date.parse(change.search.updatedAt) > Date.parse(current.updatedAt)
          ) {
            activity.searches = activity.searches.filter(
              item => item.keyword !== change.search.keyword
            )
            activity.searches.unshift(change.search)
          }
        } else if (change.type === 'history') {
          const current = activity.history.find(
            item => item.media.id === change.history.mediaId
          )
          if (
            !current ||
            Date.parse(change.history.updatedAt) > Date.parse(current.updatedAt)
          ) {
            activity.history = activity.history.filter(
              item => item.media.id !== change.history.mediaId
            )
            activity.history.unshift({
              ...change.history,
              id: '1',
              media: { ...media, id: change.history.mediaId },
              watchedAt: '2026-10-16',
            })
          }
        } else if (change.type === 'remove-search')
          activity.searches = activity.searches.filter(
            item => item.keyword !== change.keyword
          )
        else if (change.type === 'remove-history')
          activity.history = activity.history.filter(
            item => item.media.id !== change.mediaId
          )
        else if (change.type === 'clear-searches') activity.searches = []
        else if (change.type === 'clear-history') activity.history = []
      }
      activities.set(token, activity)
      return send(activity)
    }
    if (path === `web/me/history/media/${media.id}`)
      return send(histories.get(media.id) ?? null)
    if (path === 'web/me/history') {
      if (req.method === 'PUT') {
        const record = {
          ...body,
          id: '1',
          media,
          watchedAt: '2026-10-14',
          updatedAt: '2026-10-14T10:00:00+08:00',
        }
        histories.set(body.mediaId, record)
        return send(record)
      }
      if (req.method === 'DELETE') {
        const deleted = histories.size
        histories.clear()
        return send({ deleted })
      }
      return send({
        items: [...histories.values()],
        total: histories.size,
        page: 1,
        pageSize: Number(url.searchParams.get('pageSize')),
        partial: false,
      })
    }
    return send(null, 404, '接口不存在')
  })
  backend.listen(0, '127.0.0.1')
  await once(backend, 'listening')
  const reservation = createServer()
  reservation.listen(0, '127.0.0.1')
  await once(reservation, 'listening')
  const port = reservation.address().port
  await new Promise(resolve => reservation.close(resolve))
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: String(port),
      NUXT_API_BASE: `http://127.0.0.1:${backend.address().port}/api/v1`,
      NUXT_API_KEY: 'test-private-key',
      NUXT_APP_VERSION: 'web-test-release',
      NUXT_PROXY_SECRET: 'test-proxy-secret',
      NUXT_AUTH_COOKIE_SECURE: 'false',
      NUXT_PUBLIC_SITE_URL: 'https://miraitv.example/',
      NUXT_PUBLIC_GA_ID: '',
      NUXT_REDIRECT_HOSTS: '',
      ...runtimeEnv,
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => {
    output += chunk
  })
  child.stderr.on('data', chunk => {
    output += chunk
  })
  const stop = async () => {
    child.kill()
    backend.closeAllConnections()
    await new Promise(resolve => backend.close(resolve))
  }
  for (let i = 0; i < 100; i += 1) {
    try {
      if ((await fetch(`${base}/api/session`)).ok)
        return {
          base,
          requests,
          favorites,
          histories,
          tokens,
          stop,
          logs: () => output,
        }
    } catch {
      /* 等待产物启动 */
    }
    if (child.exitCode !== null) {
      await stop()
      throw new Error(output)
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  await stop()
  throw new Error(`SSR server did not start: ${output}`)
}
