// Local browser verification only; no production route or dependency is added.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const upstream = process.argv[2]
if (!upstream) throw new Error('Pass the path to the pinned upstream checkout.')
const files = new Map([
  ['/', resolve(root, 'tests/fixtures/hyalite.html')],
  ['/glass.css', resolve(root, 'app/assets/css/glass.css')],
  ['/index.js', resolve(root, 'app/lib/liquid-glass/index.js')],
  ['/preset.js', resolve(root, 'app/lib/liquid-glass/preset.js')],
  ['/hyalite.js', resolve(root, 'app/lib/liquid-glass/hyalite.js')],
  ['/reference.js', resolve(upstream, 'demo/legacy/hyalite-0.1.0.js')],
])
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  const file = files.get(path)
  if (!file) return res.writeHead(404).end()
  let content = await readFile(file, 'utf8')
  // Separate the SVG ids so neither implementation can accidentally use the other's map.
  if (path === '/reference.js') content = content.replaceAll("'hyalite010-'", "'upstream010-'")
  res.writeHead(200, {
    'content-type': path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html',
    'cache-control': 'no-store',
  })
  res.end(content)
})
server.listen(0, '127.0.0.1', () => console.log(`Hyalite comparison: http://127.0.0.1:${server.address().port}`))
