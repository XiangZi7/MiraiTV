# MiraiTV Web

基于 Nuxt 4 + Tailwind CSS v4 的影视内容站，已接入 `service/` 中的 FastAPI。
生产使用 Nitro SSR，支持 Node 服务与 Cloudflare Pages，页面首屏由服务端请求真实数据，浏览器从 payload 恢复。

## 技术栈

| 能力     | 方案                                                                 |
| -------- | -------------------------------------------------------------------- |
| 框架     | Nuxt 4（`app/` 目录、文件路由、组件自动导入）                        |
| 样式     | Tailwind CSS v4（`@theme` 定义 token，无 `tailwind.config.js`）      |
| 图标     | `@nuxt/icon` + `lucide` / `simple-icons`                             |
| 工具函数 | `@vueuse/core`（`useScroll` / `useWindowScroll` / `onClickOutside`） |
| 状态     | `@pinia/nuxt`（已装好，跨页共享状态时再使用）                        |

## 命令

```bash
pnpm dev          # 开发，默认 3000 端口
pnpm build        # 生产构建
pnpm typecheck    # vue-tsc 类型检查
```

> 安装依赖会触发 `nuxt prepare` 重写 `.nuxt`。若 dev 正在运行，装包后需
> **重启 dev server**，否则会出现 `injection "Symbol(route location)" not found` 的 500。

## 目录结构

```
app/
├── assets/css/main.css      # @theme 设计 token + 基础样式 + 自定义工具类
├── components/
│   ├── ui/                  # 基础组件库，无业务语义，自动导入为 Ui*
│   ├── media/               # 影视业务组件，自动导入为 Media*
│   └── app/                 # 全站骨架，自动导入为 App*
├── constants/               # 导航、筛选项等静态配置
├── mocks/                   # UI 阶段静态数据，接口接入后整体替换
├── types/                   # 领域模型
├── utils/                   # cn / omitClass / tint，自动导入
├── layouts/                 # default（含顶栏页脚）、immersive（登录）
└── pages/                   # 文件路由
```

## 设计 token

全部定义在 `app/assets/css/main.css` 的 `@theme` 中，**组件内禁止出现裸色值与魔法尺寸**。

- 背景层级：`base` → `surface-1` → `surface-2` → `surface-3`（由深到浅）
- 描边：`line` / `line-strong`
- 文字：`ink`（主）/ `ink-2`（次）/ `ink-3`（辅助、占位）
- 主色：`brand` / `brand-hover` / `brand-soft`
- 状态：`star`（评分）/ `live`（更新中）/ `danger`
- 圆角：`rounded-poster` / `rounded-card` / `rounded-panel`
- 自定义工具类：`container-page`、`scrollbar-none`、`text-shadow-hero`

## 基础组件库（`app/components/ui`）

Nuxt 按目录加前缀自动导入，`ui/Button.vue` → `<UiButton>`，无需手写 import。

| 组件              | 用途                                                           |
| ----------------- | -------------------------------------------------------------- |
| `UiButton`        | 主按钮，`variant` = primary / glass / ghost / outline / danger |
| `UiIconButton`    | 圆形图标按钮，支持 `dot` 红点与 `active` 态                    |
| `UiBadge`         | 角标，`tone` = neutral / brand / live / star / danger / glass  |
| `UiRating`        | 星级评分                                                       |
| `UiMetaRow`       | 点分隔元信息行，自动过滤空值                                   |
| `UiTabs`          | 下划线页签（`v-model`）                                        |
| `UiChipGroup`     | 胶囊筛选组（`v-model`）                                        |
| `UiSelect`        | 轻量下拉筛选（`v-model`）                                      |
| `UiSearchInput`   | 胶囊搜索框（`v-model` + `@submit`）                            |
| `UiSwitch`        | 开关（`v-model`）                                              |
| `UiProgress`      | 进度条                                                         |
| `UiAvatar`        | 头像，缺图时回退渐变 + 首字母                                  |
| `UiPanel`         | 面板容器，`glass` 为毛玻璃                                     |
| `UiSectionHeader` | 区块标题（中文主标 + 英文 kicker + 说明 + `#actions`）         |
| `UiTextLink`      | 「查看全部 →」文字链接                                         |
| `UiScroller`      | 横向滚动列，悬停浮出左右箭头                                   |
| `UiListRow`       | 设置类列表项，`#trailing` 可放开关                             |
| `UiEmpty`         | 空状态                                                         |
| `UiLogo`          | 品牌标识                                                       |

### 根节点 class 合并约定

基础组件的根节点统一按下面的方式处理 class，调用方传入的 class 才能正确覆盖内部样式：

```vue
<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const rootClass = computed(() => cn('内部基础类', attrs.class))
</script>

<template>
  <div
    v-bind="omitClass($attrs)"
    :class="rootClass"
  >
    …
  </div>
</template>
```

直接依赖 Vue 默认的 attrs 合并会把调用方 class **拼接**在内部类之后，同一属性的 Tailwind
工具类胜负由样式表顺序决定——例如给 `UiIconButton` 传 `absolute` 会被内部的 `relative`
覆盖。`cn`（clsx + tailwind-merge）才能正确去冲突。

## 业务组件（`app/components/media`）

`MediaPoster`（统一比例 / 占位封面 / 悬停播放）、`MediaCard`、`MediaAnimeCard`、
`MediaHeroBanner`、`MediaPageHero`、`MediaCategoryPage`、`MediaCollectionCard`、
`MediaContinueCard`、`MediaScheduleRow`、`MediaHistoryRow`、`MediaPlayer`、
`MediaEpisodeList`、`MediaPlaybackInfo`、`MediaMiniCard`。

电影 / 剧集 / 动漫三个分类页复用 `MediaCategoryPage`，页面文件只提供标题、题材与区块数据。

## 占位封面

`MediaItem.poster` 为空时，`MediaPoster` 用 `tintToGradient()` 依据 `tint` 生成渐变封面并
叠上作品原名；横版图用 `tintToBackdrop()`。接入接口后给 `poster` / `backdrop` 赋值即自动
切换为真实图片，组件无需改动。小尺寸场景传 `compact` 隐藏占位标题。

列表封面保持统一比例，默认按原图和容器的实际比例适配：裁切不超过 15% 时居中铺满；
比例差异较大时完整显示主图，用同图放大模糊补齐边缘，避免底部单侧留空或拉伸变形。
详情页的 `natural` 海报仍跟随原图比例；纯装饰底图可显式指定 `fit="cover"`。

## 状态写法约定

组件内 3 个以上相关状态统一用 `reactive()` 聚合为 `state`：

- 每个字段上方写中文注释，`reactive()` 上方标注 `// 响应式状态`
- `<script setup>` 中一律通过 `state.xxx` 读写
- 模板中使用 `toRefs(state)` 解构出的 ref，只解构模板真正用到的字段

## 页面清单

| 路由                         | 页面                                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| `/`                          | 发现（Hero 轮播 / 本周新番 / 编辑精选 / 热门电影 / 继续观看 / 我的片单） |
| `/search`                    | 探索搜索                                                                 |
| `/movies` `/series` `/anime` | 分类页                                                                   |
| `/detail/[id]`               | 作品详情（详情 / 剧照 / 演员 / 相关推荐）                                |
| `/play/[id]`                 | 内嵌播放（选集 / 封面与作品信息 / 简介 / 相关推荐，手动进入全屏）        |
| `/watchlist`                 | 我的片单                                                                 |
| `/profile`                   | 个人中心                                                                 |
| `/history`                   | 观看历史                                                                 |
| `/schedule`                  | 周番排期                                                                 |
| `/settings`                  | 设置                                                                     |
| `/login`                     | 登录                                                                     |

## 首屏加载与缓存

首页内容和站点公告、分类提供方和片库、搜索结果和搜索建议并行请求；核心内容继续服务端渲染，
浏览器复用 SSR payload。首页的个人历史与片单在客户端加载，避免元数据补全拖慢公开首屏。
首页和公告组件通过 `useSiteContent` 共享数据，首次激活不重复刷新。
首页内容限制为六栏：本周新番、高分推荐、电影推荐、剧场版、最近更新、人气动漫。横向推荐每栏最多 8 部，周番每天最多 6 部；无数据的栏目和卡片元信息不占位。后端同步减少聚合查询，最新内容由头图与最近更新共用，不再请求全部来源首页和各题材。轮播只优先加载首张图片，其余首次切换到时加载，并保留图片完成淡出；其他海报保持懒加载。

HTML 由 `server/plugins/page-cache.ts` 设置 `Cache-Control: no-store`；API 保留独立的禁止缓存规则。
带哈希的 `/_nuxt/` 静态资源使用长期缓存，`/images/`、`/brand/`、`/icons/` 缓存一天。
不要重新添加全局 `/**` 的 `no-store`：Cloudflare Pages 会合并匹配的 `_headers` 规则，导致静态资源也禁止缓存。

加密封面使用固定宽度档位的 `srcset` 与按展示区域设置的 `sizes`，由图片 Worker 输出 WebP；
外部原图和本地图片保持原地址。图片转换配置与发布顺序见
[图片 Worker 说明](../service/deploy/cloudflare-image-proxy/README.md#响应式图片)。

回归检查：先 `pnpm build`，再 `pnpm test:ssr`；`tests/performance.test.mjs` 覆盖并行请求、
个人数据不阻塞 SSR、静态资源缓存与 HTML/会话禁止缓存。Pages 发布前运行 `pnpm build:pages` 检查产物。

## API 封装与 SSR 部署

`app/composables/useApi.ts` 是统一的类型化接口入口，公共内容、账号、收藏、历史和播放均通过它调用。
`server/api/backend/[...path].ts` 将浏览器同域请求转发给 FastAPI。地址与 App Key 只在服务端配置，
登录 token 存在 HttpOnly Cookie 中，SSR 状态仅保存用户资料。`useAuth` 管理会话，`auth` 中间件保护个人页。

开发：复制 `.env.example` 为 `.env`，先启动 FastAPI，再运行 `pnpm dev`。
`NUXT_API_BASE` 应包含 `/api/v1`；默认 `http://127.0.0.1:8081/api/v1`。

代理会保留浏览器 UA、设备与客户端提示，供后端 `app_logs` 识别设备。`NUXT_APP_VERSION` 可填写发布标签或提交号，写入日志的 `app_version`；未配置时留空。Pages 跨 zone 部署需配置服务端 secret `NUXT_PROXY_SECRET`，与后端 `WEB_PROXY_SECRET` 使用同一个随机密钥。在 `service` 目录运行 `python tools/configure_web_proxy.py --env prod` 可生成并同步本地配置（不会输出密钥），随后把同一个值填入 Pages 服务端 secret。前端从 Cloudflare 平台原始请求中提取访客 IP 并签名，后端核验后恢复访客地址，避免日志全部记录 Worker 固定 IP。请求日志的 IP 列只保存真实 IPv4；只有 IPv6 时留空，原 IPv6 和原因放入日志 `extra`。修改后需重新部署前端并重新创建后端容器。密钥不能使用 `NUXT_PUBLIC_*`。
也可用 `pnpm dev --dotenv .env.dev` 显式选择开发环境。
本机 `.env.dev`、`.env.test`、`.env.prod` 已按 MiraiTV 整理并由 Git 忽略；
可提交的开发模板为 `.env.example`，生产环境变量见下方启动示例。

Node 服务部署：运行 `pnpm build`，部署整个 `.output` 目录，以 Node 运行 `node .output/server/index.mjs`。
**使用 build，不使用 generate。** 环境变量可在启动时修改，不需重新编译。
生产运行不会自动读取项目 `.env`。本机 `.env.prod` 已配置 `tvapi.yxcr.top`、
安全登录 Cookie 和本机反代端口，可在 Node 22 中显式加载：

```bash
node --env-file=.env.prod .output/server/index.mjs
```

也可以由进程管理器、容器或 shell 注入：

```powershell
$env:NUXT_API_BASE = 'https://tvapi.yxcr.top/api/v1'
$env:NUXT_API_KEY = '与后端 APP_API_KEYS 匹配的值'
$env:NUXT_AUTH_COOKIE_SECURE = 'true'
$env:NITRO_HOST = '127.0.0.1'
$env:NITRO_PORT = '3000'
node .output/server/index.mjs
```

公网 `tv.yxcr.top` 使用 HTTPS 反代到 Nuxt；只有本地 HTTP 验证时将 `NUXT_AUTH_COOKIE_SECURE` 设为 `false`。
同机部署可把 `NUXT_API_BASE` 改为 `http://127.0.0.1:28482/api/v1`。
FastAPI 的 `TRUSTED_PROXIES` 需要包含 Nuxt 的实际连接 IP；若 Nuxt 前面还有 Nginx，
也加入 Nginx 的实际连接 IP。Nuxt 追加真实连接这一跳，FastAPI 从右向左验证代理链，
避免把所有用户的请求归到同一个 Nuxt IP。页面和私有请求不使用共享页面缓存。

### Cloudflare Pages 部署

Pages 自动注入 `CF_PAGES=1`，构建时会选择 `cloudflare-pages` preset，生成 `dist/`
静态资源和 `dist/_worker.js/` SSR 服务。Pages 项目填写：

| 配置项                                 | 值               |
| -------------------------------------- | ---------------- |
| 根目录（Root directory）               | `web`            |
| 构建命令（Build command）              | `pnpm run build` |
| 构建输出目录（Build output directory） | `dist`           |

输出目录相对于根目录填写，根目录为 `web` 时不再填写 `web/dist`。
Wrangler 配置位于 Nuxt 项目根目录 `web/wrangler.toml`，输出目录为 `./dist`，
已启用 `nodejs_compat`。`name` 默认为 `miraitv`，须与实际 Pages 项目名一致。
文件中分别配置生产和预览环境的 `NUXT_API_BASE`、`NUXT_PUBLIC_SITE_URL`；
后端必须是包含 `/api/v1` 的公网地址，Pages 无法访问本机 `127.0.0.1`。

以下命令均在 `web/` 目录运行：

```bash
pnpm run build:pages          # 显式构建 Cloudflare Pages 产物
pnpm run preview:pages        # 用 Wrangler 预览 dist，默认 http://localhost:8788
pnpm exec wrangler login      # 首次使用 CLI 部署时登录
pnpm run deploy:pages         # 构建后部署到 wrangler.toml 中的 Pages 项目
```

CLI 首次部署前，在已有 Pages 项目中添加与后端 `APP_API_KEYS` 匹配的 secret：

```bash
pnpm exec wrangler pages secret put NUXT_API_KEY
```

命令交互式读取生产密钥，不要把真实密钥写进配置文件。预览环境的 secret 在 Pages 控制台添加；
Git 集成部署也可以在控制台的生产和预览环境分别添加 `NUXT_API_KEY` secret，修改后重新部署。
本地预览时复制 `.dev.vars.example` 为 `.dev.vars` 并填入本地后端参数；
该文件与 `.wrangler/` 缓存已加入 Git 忽略。

旧域名 `miraitv.pages.dev` 的页面请求会返回 `301`，跳转到 `https://tv.yxcr.top`
并保留路径与查询参数；仅匹配这个旧域名，分支预览地址可继续使用。
Cloudflare 将静态资源直接分发时不会执行 Nuxt 中间件；如果也要将静态资源访问统一跳转，
可在账户级 Bulk Redirects 中设置源 `miraitv.pages.dev/`、目标 `https://tv.yxcr.top/`、
状态码 `301`，开启子路径匹配、保留路径后缀和保留查询字符串，关闭子域名匹配。

SSR 数据读取使用 `useAsyncData`，提交操作使用 `useApi`。分类和搜索使用 `useMediaList`
管理游标、去重、筛选变化与取消请求；`useLibrary` 管理个人数据分页；`useFavorite` 复用收藏状态。
分类、搜索、片单和历史页面使用 VueUse `useIntersectionObserver` 自动预取下一页；
失败时保留重试入口，不支持观察器时才显示手动加载按钮。
后端契约和数据覆盖范围见 [Web 接口说明](../service/docs/web-api.md)。

播放器支持 MP4 和 m3u8：原生 HLS 可用时优先使用原生视频，否则挂载后动态加载 `hls.js`。
源站分集、线路、清晰度和字幕均来自实际响应；切集释放旧播放实例，支持续播和观看进度同步。
青空受防盗链保护的 HLS 通过 Cloudflare Worker 加载，播放列表、密钥和分片统一使用
加密链接，业务 API 只返回地址。其他视频源仍直接访问各自 CDN，播放能力受源站限制。
播放器提供刷新地址和切换源/线路；详情页确定的 source、seriesId、episodeId 一直传递到播放页。

封面接口现在返回 `images.yxcr.top/api/v1/images/v2.<密文>`，源 URL 不出现在页面 JSON 或查询参数中。
图片由 Cloudflare Worker 解密后直接回源并缓存，无需访问业务 API 查询映射，本地开发也可使用。
**使用新的封面地址前需要更新 Worker 并配置映射密钥**，步骤见
[Cloudflare 图片部署](../service/deploy/cloudflare-image-proxy/README.md)。

站内六张背景和 logo 为压缩 WebP：背景约 100–155 KB，logo 约 15 KB。
默认分享图使用约 28 KB 的 1200×630 JPEG，供分享爬虫直接读取。首屏图片优先加载，
其余图片懒加载并异步解码。兼容 favicon、Apple 与 PWA
保留 PNG / ICO，其中 PNG 已压缩至约 2–15 KB。远程影视海报由现有 Worker 协商并缓存图源格式，
当前链路不进行强制 WebP 转码。

验证：`pnpm typecheck`、`pnpm build`、`pnpm test:ssr`。
SSR 回归测试启动生产产物和离线契约服务，覆盖公共首屏、登录隔离、Cookie 转 Bearer、
JSON/查询参数/头像 multipart 转发、401/422、退出和跨站写入限制，不访问用户数据库。

## 账号图片与片单

设置页使用 Cropper.js 提供头像和主页背景的裁剪预览，支持拖动、缩放、重置和取消，确认后才上传。
头像导出 512×512 JPEG，背景导出 1600×400 JPEG，原文件上限 5 MB。
背景按账号保存在后端，也可恢复默认；此功能需同时更新 Web 与 API，后端启动时自动补齐背景表和字段。
片单卡显示第一部收藏作品的图片。片单周番默认选中北京时间当天，卡片只显示标题；
首页与片单在跨午夜或重新激活页面时同步当天筛选。

## SEO 与站点入口

`NUXT_PUBLIC_SITE_URL` 是 canonical、Open Graph、JSON-LD、robots 与 sitemap 的公开域名，
默认 `https://tv.yxcr.top`，换域名时在运行环境覆盖即可。作品详情由 SSR 输出标题、简介、
海报、Movie / TVSeries 与面包屑；分类、排期和探索页输出列表。缺少评分人数时不声明聚合评分。
纪录片使用 `/movies?kind=documentary` 作为独立 canonical，统计参数不进入 canonical。

搜索结果、播放页和个人页带 `noindex`；播放页 canonical 指向作品详情。robots 只禁止 API 和
构建清单，允许抓取页面以读取 `noindex`。个人页仍由登录权限保护。

- `/robots.txt`：按运行时域名输出 sitemap 地址。
- `/sitemap.xml`：包含公共导航、首页及排期作品、各元数据源每种类型最新一页（最多 50 条）的详情链接；
  去重后缓存十分钟，不遍历整个上游片库，不包含个人页或播放页。尚未覆盖的旧作品由站内链接继续发现。
  冷启动时所有公开数据均不可用则返回 503，避免缓存空地图。
- `/manifest.json`：独立窗口入口、主题色、192 / 512 图标；另提供 Apple Touch Icon。
- `/og-image.jpg`：没有作品海报时使用的默认分享图；SSR 输出 JPEG 类型、1200×630 尺寸与 HTTPS 地址。

`NUXT_PUBLIC_GA_ID` 默认使用 `G-ED0EZ3RBZ8`，设为空可关闭统计。开发模式不加载 GA；
生产在首屏挂载后用 `requestIdleCallback` 延迟注入，超时三秒，不支持时延迟两秒。
SPA 页面访问交给 GA 的增强型衡量记录，请在 GA 数据流的网页浏览设置中启用
[基于浏览器历史记录的网页更改](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)，
应用不额外手动发送 `page_view`，避免重复计数。

业务埋点统一通过 [`useAnalytics()`](app/composables/useAnalytics.ts) 调用；
事件和参数类型在 [analytics.ts](app/types/analytics.ts) 中维护：

```ts
const { track, trackSearch } = useAnalytics()
trackSearch('葬送的芙莉莲')
track('playback_select', {
  media_id: 'bangumi~MQ',
  media_title: '葬送的芙莉莲',
  selection_type: 'source',
  selected_value: 'xifan',
  selected_label: '稀饭动漫',
})
```

| 事件              | 触发时机                                                           | 主要参数                                                                                |
| ----------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `search`          | 搜索页收到有效关键词，包括导航栏搜索和热门词；不监听输入草稿或分页 | `search_term`、`search_location`                                                        |
| `video_start`     | 原生视频实际触发 `playing`，加载或播放失败不算观看                 | 作品、分集、来源、线路、画质、播放位置和总时长                                          |
| `video_complete`  | 视频自然结束，同一资源只发一次                                     | 同上，时长单位为秒                                                                      |
| `playback_select` | 用户切换分集、来源、线路或画质                                     | 当前作品/资源上下文，以及 `selection_type`、`selected_value`、`selected_label` 指明目标 |

播放事件包含 `media_id`、`media_title`、`media_type`、`source_id`、`source_name`、
`series_id`、`episode_id`、`episode_title`、`episode_number`、`line_id`、`line_name`、`quality`，
缺失字段直接省略。同一作品/分集/来源/线路/画质的暂停、缓冲、恢复或地址刷新不会重复发送
`video_start`；切换资源后真正播放时才产生新记录。保持页面实例的搜索返回操作按搜索结果页访问记录，
重复提交相同路由不增加记录。

GA 脚本下载前先排队，最多保留 100 条事件；脚本加载后正常发送。开发环境、SSR 和空 GA ID
不发送事件，统计异常不影响业务。业务事件只接收约定字段，不包含账号、播放 URL、鉴权参数或请求头；
搜索词中的明显邮箱/电话号码脱敏，文本最多 100 字符。事件提交时固定页面归属，并省略 URL 查询参数。
这些约束针对手动业务事件，GA 增强型衡量的页面访问和站内搜索仍由 GA 后台设置管理。

在 GA 管理后台按需为 `media_id`、`media_title`、`source_id`、`source_name`、`episode_id`、
`line_name`、`quality` 等创建事件级自定义维度，才能在报表中按这些字段分析；
参见 [GA4 自定义维度说明](https://support.google.com/analytics/answer/14240153?hl=zh-Hans)。
`search` 是本站统一的业务搜索计数，GA 增强型衡量的 `view_search_results` 为另一类事件，
本项目不再手动发送后者。

SSR 回归也验证上述 meta、结构化数据转义、索引规则、sitemap 缓存及图标尺寸。

## 响应式播放布局

全站使用雾白 Liquid Glass 主题。首页采用推荐大卡、今日放送 / 继续观看侧栏、周番与海报栏目；导航和筛选共用 `UiGlassIndicator`，以 480ms 弹性位移动画切换选中项，支持键盘操作和减少动态效果偏好。

首页轮播使用 Swiper Vue 的 Autoplay、EffectFade、A11y 模块，间隔 5000ms 自动切换；支持手势和前后按钮、悬停暂停、手动操作后继续轮播，页面 KeepAlive 停用时停止计时。减少动态效果时关闭自动轮播。非当前推荐的链接通过 inert 隔离，避免键盘焦点进入不可见内容。

周番、电影推荐和首页各海报栏目共用 `UiScroller` 的 Swiper 自由拖动列表。卡片宽度随断点变化，按钮按可视卡片组切换；周番更换日期后回到列表开头。播放页右栏优先显示关联作品，空数据时在客户端异步获取同类高分作品，并保留加载、失败重试和空结果状态。

折射模块来自 `D:\code\liquid-glass`，保存在 `app/lib/liquid-glass`，附带原 MIT 许可；仅将导出方式改为 ESM。`useLiquidGlass` 在客户端可见时加载模块，超过 800px 的表面使用 CSS 磨砂，在离屏、KeepAlive 停用和卸载时释放实例。Chromium 使用边缘折射，Safari / Firefox 使用磨砂回退。视频与海报内的深色表面保留独立文字配色。

- 首页 Hero 在窄屏下采用左文案、右侧 96×144 小海报，操作与轮播控制合并为底部一行，隐藏装饰英文和长简介；标题最多两行，完整标题保留在无障碍标签与悬停提示中。桌面保留左右分区，完整海报独立展示，避免竖版图铺成横幅时出现硬接缝。
- 六张背景采用二次元手绘日景，已优化为 1600×800 WebP，位于 `public/images/backgrounds`；内置 image_gen 的完整提示词保存在 `docs/background-prompts.json`。
- 继续观看卡片把进度条独立成行，百分比显示整数，低于 1% 显示「刚刚开始」；单集选集按钮保持紧凑宽度，长标题截断但保留完整提示。
- 详情页保留较大的竖版封面；播放源、选集与详情同时出现，选集位于既有页签下方、简介上方，简介只显示一次。
- 播放页默认使用全站布局与 16:9 内嵌播放器。加载和失败状态显示在播放器内部。
- 手机和桌面的源、线路、刷新地址与选集均位于作品信息下方、剧情简介上方；相关推荐可使用右栏。
- 封面、标题、评分、元信息、剧情简介在手机和桌面均显示，作品信息统一由 `MediaPlaybackInfo` 复用。
- 选集支持正序 / 倒序及上一集 / 下一集边界；切换作品或分集会重置播放进度。
- 播放进度使用原生滑杆，支持触摸和键盘；画质 / 倍速 / 字幕面板可在手机与桌面打开，全屏仅由按钮触发。
