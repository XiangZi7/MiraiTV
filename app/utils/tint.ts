import type { PosterTint } from '~/types/media'

/**
 * 由渐变 token 生成海报占位背景
 * 真实海报接入后该函数仅作为图片加载失败的兜底
 */
export function tintToGradient(tint: PosterTint) {
  return {
    backgroundImage: `linear-gradient(160deg, ${tint.from} 0%, ${tint.to} 72%)`,
  }
}

/**
 * 由渐变 token 生成横版剧照占位背景
 * 一个收紧的受光核心 + 一圈柔和光晕 + 压暗的底色，避免糊成一团
 */
export function tintToBackdrop(tint: PosterTint) {
  const halo = `color-mix(in oklab, ${tint.from} 30%, ${tint.to})`
  const base = `color-mix(in oklab, ${tint.from} 12%, ${tint.to})`

  return {
    backgroundImage: [
      `radial-gradient(38% 48% at 62% 26%, ${tint.from} 0%, transparent 68%)`,
      `radial-gradient(85% 75% at 70% 8%, ${halo} 0%, transparent 70%)`,
      `linear-gradient(200deg, ${base} 0%, ${tint.to} 58%)`,
    ].join(','),
  }
}
