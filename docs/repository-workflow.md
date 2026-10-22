# 仓库与部署配置管理

## 提交边界

下表的路径相对于前端目录；如果私有仓库的前端放在 `web/`，私有侧对应路径都加上 `web/` 前缀。

| 文件                                                         | 开源仓库                       | 私有仓库                                |
| ------------------------------------------------------------ | ------------------------------ | --------------------------------------- |
| `app/`、`server/`、默认 `public/` 素材                       | 提交通用代码                   | 同步通用代码，另提交个人功能            |
| `nuxt.config.ts`、`package.json`、`pnpm-lock.yaml`           | 提交通用默认值、依赖与构建配置 | 同步相同版本，个人参数通过环境覆盖      |
| `.env.example`、`.env.prod.example`、`.dev.vars.example`     | 提交不含个人值的模板           | 同步模板                                |
| `wrangler.example.toml`                                      | 提交通用模板                   | 同步模板作为参考                        |
| `wrangler.toml`                                              | 不提交                         | Git 自动部署时提交个人非敏感参数        |
| `public/custom/`                                             | 不提交个人专属素材             | 提交部署需要的个人图片                  |
| `.env`、`.env.prod`、`.env.dev`、`.env.test`、`.dev.vars`    | 不提交                         | 不提交；只在本地或私密配置存储中保留    |
| `public/*.local.jpg`、`public/*.local.webp`                  | 不提交                         | 本机备份，不作为 Git 自动部署的图片来源 |
| `.nuxt/`、`.output/`、`dist/`、`node_modules/`、`.wrangler/` | 不提交                         | 不提交，由构建环境生成                  |

`wrangler.toml` 只包含公开域名、GA ID、后端地址、品牌参数和兼容性设置。`NUXT_API_KEY`、`NUXT_PROXY_SECRET` 等真实凭据始终放在 Cloudflare Pages Secrets 中，不写入 `[vars]`。

`.gitignore` 不会停止跟踪一个已经提交的文件。私有仓库已经跟踪 `wrangler.toml` 时，可以继续正常提交它；在新私有副本中首次提交被忽略的个人配置时，可精确使用 `git add -f web/wrangler.toml`。这条强制添加命令只用于私有仓库，不用于开源仓库或环境密钥文件。

## 私有仓库的 Pages Git 自动部署

推荐将非敏感参数保存在私有仓库的 `web/wrangler.toml`，与个人配置相关的变更也可以单独审阅、回退。该文件不会出现在公开上游的新版本中，后续通用更新也就不会反复改写其中的参数。

生产环境至少应明确设置：

```toml
[vars]
NUXT_API_BASE = "https://api.example.com/api/v1"
NUXT_AUTH_COOKIE_SECURE = "true"
NUXT_PUBLIC_SITE_URL = "https://tv.example.com"
NUXT_PUBLIC_GA_ID = "G-EXAMPLE123"
NUXT_REDIRECT_HOSTS = "old.example.com"
NUXT_PUBLIC_SITE_IMAGE = "/custom/og-image.jpg"
```

以上是现有文件中的变量段，仍需保留文件顶部的 `name`、`pages_build_output_dir`、`compatibility_date` 和 `compatibility_flags`。完整结构见 `wrangler.example.toml`。

`[env.preview.vars]` 也要显式配置后端与预览域名，GA 和旧域名跳转建议留空。生产与预览 Secrets 在平台分别配置。使用 Wrangler 文件部署后，文件是所声明字段的配置来源，不在控制台重复维护同名普通变量；参考 [Cloudflare Pages 配置说明](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)。

对包含 `web/` 子目录的私有仓库，Pages 配置为：

| 设置         | 值                 |
| ------------ | ------------------ |
| Git 仓库     | 私有仓库           |
| 生产分支     | 实际用于生产的分支 |
| 根目录       | `web`              |
| 构建命令     | `pnpm build:pages` |
| 构建输出目录 | `dist`             |

输出目录相对于根目录，不写成 `web/dist`。平台执行构建与发布，构建命令不再运行 `deploy:pages`。

个人分享图应以 `web/public/custom/og-image.jpg` 这样的独立路径提交，并将 `NUXT_PUBLIC_SITE_IMAGE` 指向 `/custom/og-image.jpg`。`*.local.jpg` 是被 Git 忽略的本机备份，Git 自动部署拿不到它。首次同步开源默认分享图之前，先将原图保留到私有专属路径。

## 私有前端位于 web 子目录

如果开源仓库根目录直接包含 `app/`、`server/`，而私有仓库根目录包含 `web/`、`service/`，不能直接用普通根目录合并来同步前端。应使用 Git subtree 等按目录映射的方式，将开源仓库对应到私有仓库的 `web/`。

需要先完成一次现有 `web/` 的子树关联与内容核对。`web/` 已存在时不能直接执行 `git subtree add --prefix=web`。首次同步应先提交明确的公开版本，在保留个人文件的前提下导入通用源码，再登记带有 `git-subtree-dir` 和 `git-subtree-split` 的标准 squash 基线。可以在隔离副本中验证该登记方式，不需要先删除实际 `web/` 目录。

完成首次关联后，日常更新可以在私有 Git 仓库根目录执行：

```bash
git subtree pull --prefix=web upstream master --squash
```

这里 `upstream` 必须指向独立的开源仓库，`master` 按实际公开分支替换；该示例采用 squash 子树关联，首次初始化和以后更新需要使用一致方式。先提交或暂存本地改动，合并后完成验证，再推送私有生产分支。实际功能改动仍可能发生冲突，需要正常审阅；配置分离可以减少冲突，但不会消除全部冲突。

通用修复优先在开源仓库开发。回馈开源时只挑选适合公开的通用提交，不将包含后端和个人内容的私有完整历史推到开源仓库。
