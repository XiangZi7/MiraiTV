# MiraiTV Web

基于 Nuxt 4、Vue 3、Tailwind CSS 和 Pinia 的影视前端，使用 SSR 输出页面，通过 Nitro 服务端代理连接兼容的后端 API。支持 Node 和 Cloudflare Pages 部署。

## 本地开发

需要 Node.js 22+、pnpm 10 和兼容的后端服务。本项目包含前端和服务端代理，不包含影视数据后端；接口路径与数据类型见 `app/composables/useApi.ts`、`app/types/web-api.ts`。

```bash
pnpm install --frozen-lockfile
```

复制 `.env.example` 为 `.env`，填写后端地址，再运行：

```bash
pnpm dev
```

默认地址为 `http://localhost:3000`，默认关闭 GA 和旧域名跳转。`NUXT_API_BASE` 必须包含 `/api/v1`。本地 HTTP 使用 `NUXT_AUTH_COOKIE_SECURE=false`。

## 配置与目录

| 路径                                         | 用途                               | 是否提交 |
| -------------------------------------------- | ---------------------------------- | -------- |
| `app/`、`server/`、`public/`                 | 通用前端、服务端代理、默认品牌素材 | 是       |
| `nuxt.config.ts`                             | 配置结构及通用默认值               | 是       |
| `.env.example`、`.env.prod.example`          | 本地开发、Node 生产配置模板        | 是       |
| `wrangler.example.toml`、`.dev.vars.example` | Pages 部署、本地 Worker 预览模板   | 是       |
| `.env`、`.env.prod`、`.dev.vars`             | 个人环境参数及本地密钥             | 否       |
| `wrangler.toml`                              | 个人 Pages 项目及非敏感部署参数    | 否       |

域名、GA、品牌文字和 Logo 均从 Nuxt `runtimeConfig` 读取。公开仓库保留默认品牌和通用模板，个人部署通过环境变量覆盖，不需要修改组件。

完整变量说明、品牌素材和已有站点迁移步骤见 [配置与部署](docs/configuration.md)。

公有、私有仓库各自提交哪些文件，以及私有前端放在 `web/` 子目录时的同步方式，见 [仓库与部署配置管理](docs/repository-workflow.md)。

## Node 部署

复制 `.env.prod.example` 为 `.env.prod` 并填写生产参数：

```bash
pnpm build
pnpm start:prod
```

部署整个 `.output/`，生产站点使用 HTTPS 反代。`start:prod` 显式加载 `.env.prod`；由容器或进程管理器注入变量时使用 `pnpm start`。生产 Node 服务不会自动读取 `.env`。本项目依赖服务端代理和登录会话，请使用 `build`，不要使用静态 `generate` 部署。

## Cloudflare Pages

复制 `wrangler.example.toml` 为 `wrangler.toml`，填写自己的项目名、生产和预览环境参数：

```bash
pnpm build:pages
pnpm preview:pages
pnpm deploy:pages
```

本地预览还需复制 `.dev.vars.example` 为 `.dev.vars`。密钥通过 Pages Secrets 配置，不写入 Wrangler 的 `[vars]`。Git 集成部署可以使用控制台管理配置，或在自己的私有仓库维护 `wrangler.toml`；详细步骤见 [配置与部署](docs/configuration.md#cloudflare-pages)。

## 开源仓库与私有仓库同步

建议通用功能先在开源仓库开发，再单向合并到私有仓库。个人环境文件由 Git 忽略；需要跨机器备份时使用私密配置存储。个人功能和自有素材在私有仓库维护，并尽量集中到独立文件。

两个仓库应保留共同的 Git 历史。私有仓库为空时，可以从开源仓库克隆，再将 `origin` 改为私有仓库地址，并将开源仓库添加为 `upstream`。

以下普通合并示例适用于两边都以前端为仓库根目录的情况。如果私有 Git 仓库包含 `web/` 和其他项目，应按 [子目录同步说明](docs/repository-workflow.md#私有前端位于-web-子目录) 处理，避免将前端文件合并到私有仓库根目录。

在私有项目中首次连接开源仓库：

```bash
git remote add upstream https://github.com/USER/OPEN_SOURCE_REPO.git
```

提交或暂存本地改动后同步（下面假设分支名为 `main`，本项目现有分支可能为 `master`，按实际替换）：

```bash
git fetch upstream
git switch main
git merge upstream/main
```

解决冲突、完成验证后，再 `git push origin main`。回馈开源项目时单独挑选通用提交，避免将私有分支的完整历史合入公开仓库。已被 Git 跟踪的文件不会因为加入 `.gitignore` 就自动停止跟踪；发布前也应检查历史中的凭据。

## 验证

```bash
pnpm typecheck
pnpm build
pnpm test:ssr
```

SSR 测试会启动离线契约服务和生产构建，覆盖登录隔离、代理、SEO、品牌运行时覆盖、域名跳转、埋点及播放状态，不连接生产数据库。测试需要先完成 `pnpm build`。

项目使用的第三方代码许可保留在 `app/lib/liquid-glass/LICENSE` 和 `public/licenses/` 中。
