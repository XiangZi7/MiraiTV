/*! @license
 * Mesh color blending adapted from Paper Shaders (Apache-2.0).
 * https://github.com/paper-design/shaders/tree/43cd68db79fa0b1759f72ffc941b3238e2a3954c
 * Changes: WebGL 1 compatibility, four theme colors, no grain, slower motion.
 * License and attribution: /licenses/paper-shaders/LICENSE.txt and NOTICE.txt.
 */
const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`

// Paper's moving color spots blend by distance instead of layering noisy ribbons.
const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform float time;
uniform float aspect;
uniform vec3 colors[4];

vec2 getPosition(int i, float t) {
  float a = float(i) * 0.37;
  float b = 0.6 + fract(float(i) / 3.0) * 0.9;
  float c = 0.8 + fract(float(i + 1) / 4.0);
  return 0.5 + 0.5 * vec2(sin(t * b + a), cos(t * c + a * 1.5));
}
void main() {
  // A cover fit keeps large color fields on both narrow and wide canvases.
  vec2 p = (uv - 0.5) * vec2(max(aspect, 1.0), max(1.0 / aspect, 1.0)) * 0.7 + 0.5;
  float t = 0.5 * (time * 0.12 + 41.5);
  float radius = smoothstep(0.0, 1.0, length(p - 0.5));
  float center = 1.0 - radius;
  for (float i = 1.0; i <= 2.0; i++) {
    p.x += 0.18 * center / i * sin(t + i * 0.4 * smoothstep(0.0, 1.0, p.y))
         * cos(0.2 * t + i * 2.4 * smoothstep(0.0, 1.0, p.y));
    p.y += 0.18 * center / i * cos(t + i * 2.0 * smoothstep(0.0, 1.0, p.x));
  }
  vec3 color = vec3(0.0);
  float totalWeight = 0.0;
  for (int i = 0; i < 4; i++) {
    float dist = length(p - getPosition(i, t));
    float weight = 1.0 / (pow(dist, 3.5) + 0.001);
    color += colors[i] * weight;
    totalWeight += weight;
  }
  gl_FragColor = vec4(color / max(0.0001, totalWeight), 1.0);
}`

export function createFluidBackground(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  })
  if (!gl) return null

  const shaders: WebGLShader[] = []
  const program = gl.createProgram()
  const buffer = gl.createBuffer()
  const destroy = (releaseContext = true) => {
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    shaders.forEach(shader => gl.deleteShader(shader))
    if (releaseContext) gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  try {
    if (!program || !buffer) throw new Error('Fluid resources unavailable')
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Fluid shader unavailable')
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error('Fluid shader compilation failed')
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('Fluid program linking failed')
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    )
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const time = gl.getUniformLocation(program, 'time')
    const aspect = gl.getUniformLocation(program, 'aspect')
    const styles = getComputedStyle(canvas)
    const palette = ['blue', 'lilac', 'mist', 'white'].flatMap(name => {
      const hex = styles.getPropertyValue(`--color-ambient-${name}`).trim()
      if (!/^#[0-9a-f]{6}$/i.test(hex))
        throw new Error('Mesh gradient palette unavailable')
      return [1, 3, 5].map(
        start => parseInt(hex.slice(start, start + 2), 16) / 255
      )
    })
    gl.uniform3fv(gl.getUniformLocation(program, 'colors[0]'), palette)

    return {
      resize() {
        const width = Math.max(1, canvas.clientWidth)
        const height = Math.max(1, canvas.clientHeight)
        // Soft gradients need no retina buffer; cap fill rate on large screens too.
        const scale = Math.min(
          width < 640 ? 0.65 : 0.75,
          1280 / width,
          800 / height
        )
        canvas.width = Math.max(1, Math.round(width * scale))
        canvas.height = Math.max(1, Math.round(height * scale))
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.uniform1f(aspect, width / height)
      },
      draw(seconds: number) {
        gl.uniform1f(time, seconds)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      },
      destroy,
    }
  } catch {
    destroy()
    return null
  }
}
