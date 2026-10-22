# 配置与部署

## 配置边界

`nuxt.config.ts` 只声明配置结构与通用默认值，组件通过 `useSite()` 获取公开品牌配置。服务端通过 `useRuntimeConfig(event)` 读取后端参数和密钥。个人值从运行环境注入，不需要在开源版和私有版之间反复修改源文件。

`NUXT_PUBLIC_*` 会发送给浏览器。GA Measurement ID 和站点域名本来就是公开信息；移出源码是为了隔离不同部署的统计和 SEO。API Key、代理签名密钥只能使用服务端变量。

| 环境变量                       | 默认值 / 作用                                                            | 可公开   |
| ------------------------------ | ------------------------------------------------------------------------ | -------- |
| `NUXT_API_BASE`                | `http://127.0.0.1:8081/api/v1`；后端 API 基址                            | 部署自定 |
| `NUXT_API_KEY`                 | 空；后端 App Key，匹配后端 `APP_API_KEYS`                                | 否       |
| `NUXT_PROXY_SECRET`            | 空；访客 IP 签名，匹配后端 `WEB_PROXY_SECRET`                            | 否       |
| `NUXT_APP_VERSION`             | 空；日志中的发布标签或提交号                                             | 是       |
| `NUXT_AUTH_COOKIE_SECURE`      | `true`；本地 HTTP 开发设置 `false`                                       | 是       |
| `NUXT_REDIRECT_HOSTS`          | 空；需要 301 跳转的旧域名，逗号分隔                                      | 是       |
| `NUXT_PUBLIC_SITE_URL`         | `http://localhost:3000`；canonical、分享链接、robots、sitemap 的站点地址 | 是       |
| `NUXT_PUBLIC_GA_ID`            | 空；空值关闭 GA，生产环境配置自己的 `G-...`                              | 是       |
| `NUXT_PUBLIC_SITE_NAME`        | `MiraiTV`；页面、Logo 文字、SEO、结构化数据、PWA 名称                    | 是       |
| `NUXT_PUBLIC_SITE_DESCRIPTION` | MiraiTV 默认简介；首页、SEO 缺省描述与 PWA 简介                          | 是       |
| `NUXT_PUBLIC_SITE_LOGO`        | `/brand/mirai-mark.webp`；Logo 图片与组织结构化数据                      | 是       |
| `NUXT_PUBLIC_SITE_IMAGE`       | `/og-image.jpg`；没有作品海报时的默认分享图                              | 是       |
| `NUXT_PUBLIC_SITE_TAGLINE`     | `好的电影，是另一种人生体验。`；页脚文案                                 | 是       |
| `NITRO_HOST` / `NITRO_PORT`    | Node 监听地址和端口；本地模板为 `127.0.0.1:3000`                         | 是       |

站点 URL 应填写完整的 HTTP(S) 站点根地址，例如 `https://tv.example.com`。它是部署者指定的正式地址，不根据访客的 Host 自动推断。预览环境应填写自己的预览域名，并关闭 GA。

`NUXT_REDIRECT_HOSTS` 只填写域名，不包含协议、端口和路径，例如 `old.example.com,legacy.example.com`。只精确匹配列出的域名，保留请求路径和查询参数；未配置时不跳转。即使误填主站域名，也不会重定向到自身。静态资源可能由平台直接分发，如需整站跳转，另在平台配置域名重定向。

## 本地与 Node 生产环境

- 开发：复制 `.env.example` 为 `.env`，运行 `pnpm dev`。
- Node 生产：复制 `.env.prod.example` 为 `.env.prod`，运行 `pnpm build`、`pnpm start:prod`。
- 平台注入：将相同变量注入容器或进程管理器，运行 `pnpm start`。

环境文件不会提交到 Git，也不会随源代码自动同步到其他机器。生产 Node 进程不自动加载 `.env`，`start:prod` 使用 Node 22+ 的 `--env-file=.env.prod` 显式加载。已有进程环境变量优先于文件值。运行时修改域名、GA 或品牌参数后，重启服务即可；更换静态图片需要重新构建与发布。

后端启用了 App Key 校验时必须填写 `NUXT_API_KEY`；使用签名访客 IP 时填写 `NUXT_PROXY_SECRET`。这些值来自已有后端或部署平台，模板不提供真实凭据。前端仍通过 Nitro 服务端代理调用后端，密钥不进入浏览器配置。

## Cloudflare Pages

### 本地 CLI 部署

1. 复制根目录 `wrangler.example.toml` 为同目录下的 `wrangler.toml`。
2. 修改 `name`、`[vars]` 与 `[env.preview.vars]`，分别填写个人生产和预览参数。预览环境的变量需单独配置，模板默认关闭统计。
3. 配置生产密钥（以下命令交互式读取值）：

```bash
pnpm exec wrangler pages secret put NUXT_API_KEY
pnpm exec wrangler pages secret put NUXT_PROXY_SECRET
```

只配置后端实际需要的密钥；已有 Pages Secrets 继续保留。预览密钥在 Pages 控制台的预览环境单独配置。

```bash
pnpm build:pages
pnpm deploy:pages
```

构建输出为 `dist/`，`deploy:pages` 会重新构建，再使用 `wrangler.toml` 部署。Pages 不能访问你电脑的 `127.0.0.1`，部署参数中的后端应为 Pages 可访问的地址。

本地 Worker 预览时，复制 `.dev.vars.example` 为 `.dev.vars` 并运行 `pnpm preview:pages`。`.dev.vars` 用于 Wrangler 运行时，会覆盖配置文件中的同名变量；预览命令不会加载 `.env.prod`，也不会修改线上部署。

### Git 集成部署

仓库根目录直接部署时，Pages 的根目录留空或填 `.`，构建命令为 `pnpm build:pages`，输出目录为 `dist`。如果将本项目放入单体仓库的子目录，根目录按实际位置填写。

公开仓库只提供 `wrangler.example.toml`，不会自动把个人项目参数发布到 Cloudflare。可以选择一种配置来源：

- **控制台管理**：在生产、预览环境分别设置运行时变量和 Secrets。使用已有项目时，确认 `NUXT_PUBLIC_SITE_URL`、`NUXT_PUBLIC_GA_ID`、`NUXT_REDIRECT_HOSTS` 已明确设置。删除旧 `wrangler.toml` 后重新部署，Cloudflare 保留上一部署的配置并恢复控制台编辑。
- **私有仓库管理**：在私有仓库将模板复制为 `wrangler.toml`，提交个人非敏感参数；Secrets 仍在平台管理。公开上游没有这个文件，后续合并不会反复改写你的部署配置。如需版本管理，确认文件只有非敏感参数后，在私有仓库使用 `git add -f wrangler.toml` 显式跟踪；公开仓库不跟踪该文件。

使用 Wrangler 配置文件部署后，文件是所声明字段的配置来源，同名字段不能再从控制台编辑；详见 [Cloudflare Pages 配置说明](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)。不要在两个地方维护同一批参数。

### 已有站点迁移

从写死生产参数的版本升级时，在首次发布新版本前将这些值迁移到运行环境：

1. 原 `runtimeConfig.public.gaId` → `NUXT_PUBLIC_GA_ID`。
2. 原 `runtimeConfig.public.siteUrl` → `NUXT_PUBLIC_SITE_URL`。
3. 原域名跳转中间件的旧域名 → `NUXT_REDIRECT_HOSTS`；跳转目标统一使用 `NUXT_PUBLIC_SITE_URL`。
4. 原 Wrangler `[vars]`、`[env.preview.vars]` → 个人 Wrangler 文件或平台对应环境。
5. 已有 API Key、签名密钥继续留在本地环境文件或平台 Secrets。

本次本地整理会保留个人参数到忽略文件；其他机器与 Git 集成构建不会获得这些文件，需要在首次部署前按上述方式配置。缺少新变量时将使用通用默认值，GA 和域名跳转默认关闭。

## 品牌素材与私有功能

默认 MiraiTV 品牌和界面素材随通用代码保留。自有 Logo 可放在私有仓库的 `public/custom/`，然后通过 `NUXT_PUBLIC_SITE_LOGO=/custom/logo.webp` 指定。默认分享图通过 `NUXT_PUBLIC_SITE_IMAGE` 指定，两者均支持绝对图片 URL。浏览器图标和 PWA 图标仍使用 `public/icons/`，需要自有素材时在私有仓库替换对应文件。

本地整理保留的原分享图位于 `public/og-image.local.jpg`、`public/og-image.local.webp`，个人生产配置指向前者。这些文件会随本机构建发布，但由 Git 忽略；跨机器部署时需要单独同步，或将图片上传到自有图片服务后配置绝对 URL。

自有素材可在私有仓库提交；真实密钥即使在私有仓库也使用环境变量或 Secrets。通用功能先在开源仓库开发，个人功能尽量放在独立组件、composable 或服务端文件中，以减少同步上游时的冲突。
