export interface HyaliteOptions {
  bevel?: number
  thickness?: number
  blur?: number
  dispersion?: number
  rim?: number
  materialize?: number
  settle?: number
  self?: boolean
}

export interface GlassWatcher {
  stop(): void
}

export const HYALITE_PRESET: Readonly<Required<HyaliteOptions>>
export const Hyalite: {
  version: string
  attach(element: HTMLElement, options?: HyaliteOptions): void
  detach(element: HTMLElement): void
  refresh(element: HTMLElement): void
  supported(): boolean
  info(): {
    maxDisplacement: number
    bevel: number
    mapSize: [number, number]
  } | null
}
export function watchLiquidGlass(root?: HTMLElement): GlassWatcher
