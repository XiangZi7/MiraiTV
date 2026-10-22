import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import * as Vue from 'vue'
import * as serverRenderer from 'vue/server-renderer'
import { parse, compileScript } from 'vue/compiler-sfc'

const { descriptor } = parse(
  await readFile(
    new URL('../app/components/media/DetailEpisodes.vue', import.meta.url),
    'utf8'
  )
)
const compiled = compileScript(descriptor, {
  id: 'detail-episodes-test',
  inlineTemplate: true,
  templateOptions: { ssr: true },
})
const code = ts
  .transpileModule(compiled.content, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace(
    /import \{([^}]+)\} from ["'](vue(?:\/server-renderer)?)["'];?/g,
    (_, bindings, module) =>
      `const {${bindings.replace(/\bas\b/g, ':')}} = ${module === 'vue' ? 'Vue' : 'serverRenderer'};`
  )
  .replace('export default', 'const component =')
const component = vm.runInNewContext(code + '\ncomponent', {
  Vue,
  serverRenderer,
  reactive: Vue.reactive,
  computed: Vue.computed,
  toRefs: Vue.toRefs,
  cn: (...values) => values.filter(Boolean).join(' '),
})

async function render(props) {
  const app = Vue.createSSRApp(component, {
    mediaId: 'bangumi~MQ',
    source: '',
    pending: false,
    ...props,
  })
  app.config.globalProperties.cn = (...values) =>
    values.filter(Boolean).join(' ')
  app.component('Icon', { render: () => null })
  app.component('UiSelect', { render: () => null })
  app.component('NuxtLink', {
    props: ['to'],
    setup:
      (props, { slots }) =>
      () =>
        Vue.h(
          'a',
          {
            href: props.to.path + '?' + new URLSearchParams(props.to.query),
          },
          slots.default?.()
        ),
  })
  return serverRenderer.renderToString(app)
}

test('loading, no results, failed requests and empty source matches never render episode buttons', async () => {
  for (const props of [
    { pending: true },
    {
      sources: { available: false, matches: [], message: '暂无匹配的播放资源' },
    },
    { error: new Error('unavailable') },
    { sources: { matches: [{ source: 'empty', episodes: [] }] } },
  ]) {
    const html = await render(props)
    assert.doesNotMatch(
      html,
      /aria-label="分集列表"|可播放 \d+ 集|第 \d+ 集|episodeId=/
    )
    assert.match(html, /role="status"/)
  }
})

test('only the selected video source supplies episode links and counts', async () => {
  const html = await render({
    source: 'real',
    sources: {
      matches: [
        { source: 'empty', sourceName: '空源', episodes: [] },
        {
          source: 'other',
          sourceName: '其他源',
          seriesId: 'wrong',
          episodes: [{ id: 'wrong', index: 1, title: '错误分集' }],
        },
        {
          source: 'real',
          sourceName: '实际播放源',
          seriesId: 'native-123',
          episodes: [
            { id: 'real-1', index: 1, title: '第 1 集' },
            { id: 'real-2', index: 2, title: '第 2 集' },
          ],
        },
      ],
    },
  })
  assert.match(html, /可播放 2 集/)
  assert.match(html, /刷新当前源/)
  assert.match(html, /获取全量/)
  assert.match(html, /source=real&amp;seriesId=native-123&amp;episodeId=real-1/)
  assert.doesNotMatch(html, /episodeId=wrong|metadata-/)
  assert.ok(html.indexOf('episodeId=real-2') < html.indexOf('episodeId=real-1'))
})

test('full search errors keep existing episode links available', async () => {
  const html = await render({
    error: new Error('源站超时'),
    sources: {
      matches: [
        {
          source: 'real',
          sourceName: '可用源',
          seriesId: 'native',
          episodes: [{ id: 'real-1', index: 1, title: '第一集' }],
        },
      ],
    },
  })
  assert.match(html, /episodeId=real-1/)
  assert.match(html, /可继续使用当前播放源/)
})
