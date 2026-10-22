/** 只给实际渲染的页面设置 no-store，不生成影响 Pages 静态文件的通配规则。 */
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:response', response => {
    response.headers = { ...response.headers, 'cache-control': 'no-store' }
  })
})
