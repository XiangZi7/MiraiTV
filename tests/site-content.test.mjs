import test from 'node:test'
import assert from 'node:assert/strict'
import { startFixture } from './fixture.mjs'

test('home renders published notices and promoted apps and respects both switches', async t => {
  const siteContent = {
    announcementsEnabled: true,
    promotionsEnabled: true,
    announcements: [
      {
        id: 1,
        title: '测试站点公告',
        content: '<script>notice-alert</script>\n公告正文',
        linkUrl: 'https://example.com/notice',
        linkLabel: '阅读说明',
        updatedAt: '2026-10-16T12:00:00+08:00',
      },
    ],
    apps: [
      {
        id: 1,
        name: '测试推广 App',
        tagline: '随时收藏喜欢的故事',
        description: '你的观影伴侣',
        iconUrl: null,
        targetUrl: 'https://example.com/app',
        buttonLabel: '了解并下载',
        platforms: ['Android', 'iOS'],
        badge: '自家作品',
      },
    ],
  }
  const fixture = await startFixture({ siteContent })
  t.after(fixture.stop)
  const first = await (await fetch(fixture.base)).text()
  assert.match(first, /<summary[^>]*>[\s\S]*?测试站点公告/)
  assert.match(first, /<h3[^>]*>[\s\S]*?测试推广 App/)
  assert.match(first, /rel="noopener noreferrer sponsored"/)
  assert.ok(first.includes('&lt;script&gt;notice-alert&lt;/script&gt;'))
  assert.ok(!first.includes('<script>notice-alert</script>'))
  const read = await fetch(`${fixture.base}/api/backend/web/site-content`)
  assert.equal(read.status, 200)
  assert.equal(read.headers.get('cache-control'), 'no-store')
  siteContent.announcementsEnabled = false
  siteContent.promotionsEnabled = false
  const second = await (await fetch(fixture.base)).text()
  assert.doesNotMatch(second, /data-site-content/)
})
