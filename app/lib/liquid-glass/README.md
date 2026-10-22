# Hyalite screenshot material

Source: [VII-Cae/hyalite--liquid-glass](https://github.com/VII-Cae/hyalite--liquid-glass),
commit `b9f27192a7256bf5295bf027b582b86864f9b59d`.
The requested screenshot is the **0.1.0** card in `demo/index.html`, not the
current engine's 0.5.0 default. `hyalite.js` vendors
`demo/legacy/hyalite-0.1.0.js`. The UMD/global wrapper becomes an ESM export,
and map generation reuses one detached scratch canvas, releasing its pixel
buffer when the last surface detaches. The optical functions, map encoding
and SVG graph are unchanged.
The upstream MIT notice is in `LICENSE`.

Original file SHA-256 (LF):
`f68a85cfc9adf13ef7f84355671f2b538ef67a78945100f45ba7885272aca6d7`.

## Exact optics

For inward distance `d`, bevel `B`, and slab thickness `T`:

```
u = clamp(1 - d / B, 0, 1)
s = sqrt(max(1e-6, 1 - u*u))
alpha = min(atan(u / s), 1.40)
beta = asin(sin(alpha) / 1.5)
displacement = (T + B*s) * tan(alpha - beta)
```

The displacement table is sampled every 0.25px, from the interior outwards,
with a 0.85px/px no-fold slope cap. The true rounded-rectangle SDF supplies
depth; a widened rounded-rectangle SDF supplies the inward direction.
RGB stores x displacement, y displacement and rim light. SVG filters run in
sRGB, with three RGB displacement passes for chromatic dispersion.

`preset.js` uses the screenshot's bevel 25, thickness 10, blur 0.5,
dispersion 0.09 and rim 0.3. `settle: 0` keeps the filter attached during
resizes; it does not alter the final optics. The original live resize behavior
can briefly clip the old pixel-sized filter until the throttled rebuild.

## Integration

`liquid-glass.client.ts` starts after hydration. `.glass-surface` is a light
CSS material: translucent tint, border and highlights, with **no backdrop
filter**. Only `.glass-surface.glass-refract` opts into real refraction.
The header, mobile dock, hero pager and explicit `UiPanel glass` dialogs opt
in. Dense media lists, nested cards, inputs and tab indicators do not.

`watchLiquidGlass()` shares one manager per root even when initialized twice.
One IntersectionObserver releases offscreen filters and one MutationObserver
handles insertions/removals. Hover/selection changes do not rebuild maps unless
corner geometry changes. ResizeObserver and geometry-based filter sharing
remain owned by Hyalite. No recurring animation loop or scroll listener is
installed. Stop/HMR releases observers and filters; reduced transparency
disables refraction. Large explicit lenses use upstream's 320,000-pixel map cap.

The lens is rendered on a separate `::before` layer so child controls do not
sample a translucent parent backdrop root (which darkens the RGB sum). The
app uses a light tint and softer shadows suited to its light background;
the comparison fixture retains the screenshot's original dark finish.
Images intended to bend must be behind the lens, not painted on it.

## WebGL reference and performance choice

Reviewed [martin65536/liquid-glass-webgl](https://github.com/martin65536/liquid-glass-webgl)
at `0b90f9fc1cea8c7e59825f9aff1cbb96674b5b80`. Its
[`context.tsx`](https://github.com/martin65536/liquid-glass-webgl/blob/0b90f9fc1cea8c7e59825f9aff1cbb96674b5b80/src/components/liquid-glass/context.tsx)
renders wallpaper, glass, labels and hit targets in a self-contained canvas;
it cannot directly sample arbitrary live Nuxt DOM. Its
[`methods-render.ts`](https://github.com/martin65536/liquid-glass-webgl/blob/0b90f9fc1cea8c7e59825f9aff1cbb96674b5b80/src/components/liquid-glass/renderer/methods-render.ts)
uses dirty flags, culling and cached/downsampled blur passes. We apply the
resource-sharing and render-only-when-needed principles without adding a
second renderer or replacing accessible DOM controls. No code is copied
from that project. There is one detached 2D scratch canvas, no WebGL contexts,
and no per-card canvas. Browser compositing still has a cost for each active
lens, so reducing the number and area of active lenses is the main saving.

Chrome/Edge/Chromium render SVG backdrop refraction. Safari/Firefox keep the
CSS blur fallback, as in upstream; identical refraction is not available in
those engines through this implementation.

Verification: `node --test tests/hyalite.test.mjs`. Browser comparison harness:
`node tests/hyalite-preview.mjs <path-to-upstream-checkout>`, then open its URL.
It compares actual PNG bytes and SVG graphs to upstream and exercises dynamic
mount/resize/unmount, duplicate manager initialization, one-canvas reuse,
offscreen cleanup, and adding 100 cards without extra filters.
