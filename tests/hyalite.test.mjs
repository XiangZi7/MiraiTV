import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import { HYALITE_PRESET } from '../app/lib/liquid-glass/preset.js'

const source = await readFile(
  new URL('../app/lib/liquid-glass/hyalite.js', import.meta.url),
  'utf8'
)

test('the optics match the pinned upstream source apart from ESM and shared scratch-canvas lifecycle', () => {
  const upstream = source
    .replaceAll('\r\n', '\n')
    .replace(
      '  let mapCanvas = null;            // one shared scratch canvas; never mounted in the DOM\n',
      ''
    )
    .replace(
      "const c = (mapCanvas ||= document.createElement('canvas'));",
      "const c = document.createElement('canvas');"
    )
    .replace(
      '    // Release the backing store when idle, retaining the single reusable canvas.\n    if (!bound.size && mapCanvas) { mapCanvas.width = mapCanvas.height = 1; }\n',
      ''
    )
    .replace('const Hyalite = (() => {', '(function (root) {')
    .replace(
      '  // ESM adaptation: keep the screenshot engine private to this application.',
      '  if (root.Hyalite010) return;'
    )
    .replace(
      '  return API;\n\n})();\n\nexport default Hyalite;\n',
      "  root.Hyalite010 = API;\n  if (typeof module !== 'undefined' && module.exports) module.exports = API;\n})(typeof window !== 'undefined' ? window : globalThis);"
    )
  assert.equal(
    createHash('sha256').update(upstream).digest('hex'),
    'f68a85cfc9adf13ef7f84355671f2b538ef67a78945100f45ba7885272aca6d7'
  )
})

test('the material uses the screenshot settings rather than the latest folding preset', () => {
  assert.deepEqual(HYALITE_PRESET, {
    bevel: 25,
    thickness: 10,
    blur: 0.5,
    dispersion: 0.09,
    rim: 0.3,
    materialize: 0,
    settle: 0,
    self: false,
  })
  assert.ok(Object.isFrozen(HYALITE_PRESET))
})

test('unsupported engines do not install an SVG backdrop filter', () => {
  for (const navigator of [
    { userAgent: 'Firefox/143.0', vendor: '' },
    {
      userAgent: 'Version/26.0 Safari/605.1.15',
      vendor: 'Apple Computer, Inc.',
    },
  ]) {
    const context = {
      navigator,
      CSS: { supports: () => true },
      element: {
        style: { setProperty: () => assert.fail('fallback overwritten') },
      },
    }
    runInNewContext(
      source.replace('export default Hyalite;', 'Hyalite.attach(element);'),
      context
    )
  }
})
