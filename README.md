# dsh-card-view

DSH 侧边栏「卡片视图」插件 —— 给原生 `@deepseek-ai/dsh-client-ui-workspace` 加一层卡片呈现。

## 这是什么

这是 DeepSeek Harness（DSH）内置工作区侧栏包 `@deepseek-ai/dsh-client-ui-workspace` 的一个**分发版**（v0.2.0-rc.2，源自 DSH 仓库同版本），在官方能力之上加了：

- **卡片视图**：每个工作区画成一张文件夹卡片，下面是该工作区会话的卡片网格；侧边栏区头下有 `树形 / 卡片` 两段式切换。
- **会话主题**：可以给文件夹里的会话打彩色主题标签，卡片网格按主题拆成彩色分区；主题可新建 / 重命名 / 删除，纯浏览器本地保存。

包名**故意保持为** `@deepseek-ai/dsh-client-ui-workspace`——因为它是通过覆盖内置同包来生效的（影子包），改名就无法替换内置实现。

## 安装（给别人）

三种方式，详见 [INSTALL.md](./INSTALL.md)（里面含版本兼容分级、降级路径、验证步骤）：

```bash
# 方式 A：本机 link（先试用）
# 在你的 profile 里把依赖写成 link: 指向本仓库克隆
cd ~/.dsh/profiles/<profile>
# package.json dependencies 加：
#   "@deepseek-ai/dsh-client-ui-workspace": "link:/绝对路径/dsh-card-view"
pnpm install

# 方式 B：github 依赖（公开仓库，免鉴权）
pnpm add github:sumMer-ok/dsh-card-view

# 方式 C：npm（作者发布后）
pnpm add @deepseek-ai/dsh-client-ui-workspace
```

无论哪种方式，装完都要在 profile 的 `cordis.patch.yml` 的 `bundles` 列表里加上 `@deepseek-ai/dsh-client-ui-workspace`，再重启 DSH。

## 兼容性（先看）

运行时真正依赖 `@deepseek-ai/dsh-client-store`、`dsh-client-ui-primitives`、`react` 等模块——它们**由宿主 DSH 运行时注入**，不是 npm 装的（npm 上那两个只有极老版本，别装）。所以能不能跑取决于对方的 DSH 版本。详见 [INSTALL.md](./INSTALL.md) 的「兼容性分级」与「降级路径」。

## 文档

- [INSTALL.md](./INSTALL.md) — 安装 / 验证 / 卸载 / 兼容降级（**安装前必读**）
- [README.zh.md](./README.zh.md) — 功能详细说明（中文）
- [README-upstream.md](./README-upstream.md) — 上游官方 API 参考文档
- [LICENSE](./LICENSE) — MIT

## Build artifacts and absolute paths

`lib/` is shipped so the bundle can be loaded without a build step. The bundler
writes its build root into `//#region \0dsh-css:` comments; the absolute prefix
is stripped from every shipped `lib/*.js` before publishing (comment-only, no
behaviour change). If you rebuild `lib/` yourself, strip it again:

```sh
find lib -name '*.js' -print0 | xargs -0 perl -pi -e 's{/Users/[^\n]*?dsh-src/}{}g'
```
