/** 每个请求从 Nuxt runtimeConfig 读取品牌配置，不保存跨请求的全局状态。 */
export function useSite() {
  return useRuntimeConfig().public
}
