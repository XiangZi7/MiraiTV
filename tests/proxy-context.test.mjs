import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
async function load(path, globals = {}, imports = {}) {
  const source = await readFile(new URL(`../server/${path}.ts`, import.meta.url), 'utf8')
  const js = ts.transpileModule(source.replaceAll('import.meta.dev', 'false'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  runInNewContext(js, { exports, require: name => imports[name] ?? require(name), URL, TextEncoder, crypto: globalThis.crypto, ...globals })
  return exports
}
const helpers = await load('utils/proxy-context')

test('Cloudflare visitor IPv4 is retained and pseudo IPv4 restores real IPv6', () => {
  assert.equal(helpers.visitorIp(new Headers({ 'cf-connecting-ip': '223.5.5.5' })), '223.5.5.5')
  assert.equal(helpers.visitorIp(new Headers({ 'cf-connecting-ip': '::ffff:223.5.5.5' })), '223.5.5.5')
  assert.equal(helpers.visitorIp(new Headers({ 'cf-connecting-ip': '240e:1234::1' })), '240e:1234::1')
  assert.equal(helpers.visitorIp(new Headers({ 'cf-connecting-ip': '240.1.2.3', 'cf-connecting-ipv6': '240e:1234::1' })), '240e:1234::1')
  assert.equal(helpers.visitorIp(new Headers({ 'cf-connecting-ip': '223.5.5.5, 1.1.1.1' })), undefined)
})

test('Pages platform IP survives SSR and becomes a signed backend header', async () => {
  const edgeRequest = new Request('https://web.example/', { headers: { 'cf-connecting-ip': '223.5.5.5' } })
  const event = {
    context: { _platform: { cloudflare: { request: edgeRequest } } },
    node: { req: { headers: {} } }, method: 'GET',
  }
  const middleware = await load('middleware/client-ip', {
    defineEventHandler: fn => fn,
    getHeader: (event, name) => event.node.req.headers[name],
    getRequestIP: () => undefined,
  }, { '../utils/proxy-context': helpers })
  middleware.default(event)
  assert.equal(event.context.miraiClientIp, '223.5.5.5')
  assert.equal(event.context.miraiForwardedFor, '223.5.5.5')
  middleware.default(event)
  assert.equal(event.context.miraiForwardedFor, '223.5.5.5')
  event.node.req.headers['user-agent'] = 'browser-agent'
  event.node.req.headers['x-app-version'] = 'forged-browser-version'
  event.node.req.headers['x-mirai-client-ip'] = '198.51.100.66'
  let forwarded
  const backend = await load('utils/backend', {
    useRuntimeConfig: () => ({ apiBase: 'https://api.example/api/v1', proxySecret: 'private-secret', appVersion: 'web-v1' }),
    getHeader: (event, name) => event.node.req.headers[name],
    getCookie: () => undefined,
    getRequestURL: () => new URL('https://web.example/api/backend/web/home'),
    $fetch: { raw: async (url, options) => { forwarded = options.headers; return {} } },
  }, { './proxy-context': helpers })
  await backend.backendRequest(event, 'web/home')
  assert.equal(forwarded['x-mirai-client-ip'], '223.5.5.5')
  assert.equal(forwarded['user-agent'], 'browser-agent')
  assert.equal(forwarded['x-app-version'], 'web-v1')
  assert.equal(forwarded['x-client-platform'], 'web')
  const payload = `${forwarded['x-mirai-proxy-time']}\nGET\n/api/v1/web/home\n223.5.5.5`
  assert.equal(forwarded['x-mirai-proxy-signature'], createHmac('sha256', 'private-secret').update(payload).digest('hex'))
})

test('Node requests cannot spoof Cloudflare platform metadata', async () => {
  const event = { context: {}, node: { req: { headers: { 'cf-connecting-ip': '223.5.5.5', 'x-forwarded-for': '198.51.100.66' } } } }
  const middleware = await load('middleware/client-ip', {
    defineEventHandler: fn => fn,
    getHeader: (event, name) => event.node.req.headers[name],
    getRequestIP: () => '127.0.0.1',
  }, { '../utils/proxy-context': helpers })
  middleware.default(event)
  assert.equal(event.context.miraiClientIp, undefined)
  assert.equal(event.context.miraiForwardedFor, '198.51.100.66, 127.0.0.1')
})
