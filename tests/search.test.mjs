import test from 'node:test'
import assert from 'node:assert/strict'
import { startFixture } from './fixture.mjs'

test('search places the source label on the poster and hides upstream warnings', async t => {
  const searchState = { partial: true, unavailable: false }
  const fixture = await startFixture({ searchState })
  t.after(fixture.stop)
  const read = async () => (await fetch(`${fixture.base}/search?q=test`)).text()
  const first = await read()
  const rendered = first.slice(first.indexOf('<body')).split('<script')[0]
  assert.match(rendered, /data-source-badge[^>]*>\s*测试视频源/)
  assert.match(rendered, /重新搜索/)
  assert.doesNotMatch(rendered, /部分数据暂时不可用|上游暂不可用，请稍后重试/)
  searchState.unavailable = true
  const failedHtml = await read()
  const failed = failedHtml
    .slice(failedHtml.indexOf('<body'))
    .split('<script')[0]
  assert.match(failed, /重新搜索/)
  assert.doesNotMatch(failed, /为你推荐|重新加载推荐/)
  const landingHtml = await (await fetch(`${fixture.base}/search`)).text()
  const landing = landingHtml
    .slice(landingHtml.indexOf('<body'))
    .split('<script')[0]
  assert.match(landing, /重新加载推荐/)
  assert.doesNotMatch(failed, /上游暂不可用，请稍后重试|加载失败/)
  searchState.unavailable = false
  searchState.empty = true
  const emptyHtml = await read()
  const empty = emptyHtml.slice(emptyHtml.indexOf('<body')).split('<script')[0]
  assert.match(empty, /没有数据/)
  assert.doesNotMatch(empty, /data-infinite-loader|重试加载/)
  searchState.empty = false
  searchState.exhausted = true
  const finishedHtml = await read()
  const finished = finishedHtml
    .slice(finishedHtml.indexOf('<body'))
    .split('<script')[0]
  assert.match(finished, /data-search-end[^>]*>\s*没有更多数据了/)
  assert.doesNotMatch(finished, /data-infinite-loader|重试加载/)
})
