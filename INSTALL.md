# 卡片视图插件 · 安装说明

`@deepseek-ai/dsh-client-ui-workspace` v0.2.0-rc.2

给 DSH 侧边栏加一层**卡片视图**：每个工作区画成一张文件夹卡片，下面是该工作区会话的卡片网格；
支持按「主题」把网格拆成彩色分区，主题可新建、重命名、删除，纯浏览器本地保存。

---

## 一、先确认你的 DSH 版本（重要）

这个插件的浏览器半代码里，运行时 `require()` 只依赖下面 5 个模块：

| 运行时依赖 | 来源 |
| --- | --- |
| `@deepseek-ai/cordis` | npm 公开包（`^4.0.4`） |
| `@deepseek-ai/dsh-client-store` | **宿主 DSH 运行时注入** |
| `@deepseek-ai/dsh-client-ui-primitives` | **宿主 DSH 运行时注入** |
| `react` | **宿主 DSH 运行时注入** |
| `react/jsx-runtime` | **宿主 DSH 运行时注入** |

也就是说：真正决定能不能跑的，是**宿主 DSH 自己有没有把 `dsh-client-store` / `dsh-client-ui-primitives` 暴露给客户端模块加载器**。
npm 上这两个包只有很老的 `0.0.1-rc.1` / `0.1.2-alpha.2`，**不要从 npm 装它们**——它们本该由宿主提供。

### 兼容性分级

| 你的 DSH | 预期结果 | 怎么办 |
| --- | --- | --- |
| **本机同版本**（源码树版本 `0.2.0-rc.2`，即本插件产出时的宿主） | 直接可用 | 按第二节装 |
| 更新的 DSH（≥ 0.2.0-rc.2） | 大概率可用 | 按第二节装；装完看第三节验证 |
| 更旧的 DSH（< 0.2.0-rc.2） | **可能挂不上** | 见下面「降级路径」 |

### 降级路径（挂不上时）

插件的 `dsh.client.inject` 清单声明了 11 个宿主包：

```
dsh-api-remotes, dsh-api-session-controller, dsh-api-workspace-controller,
dsh-client-connection, dsh-client-locale, dsh-client-shortcuts,
dsh-client-ui-conversation, dsh-client-ui-layout, dsh-client-ui-renderer,
dsh-client-ui-session, dsh-client-ui-sidebar
```

旧宿主可能没有其中某些包，Loader 会因此拒绝挂载。处理方式：

1. 打开插件目录下的 `package.json`；
2. 在 `dsh.client.inject` 数组里**删掉你的 DSH 里不存在的那些包名**（保留 `dsh-client-ui-sidebar`，它是侧边栏挂载点，必需）；
3. 重新让 DSH 加载（改客户端半配置通常无需重启；若是你手动 link 进去的，刷新页面即可）。

> 注意：`inject` 只声明"我需要这些宿主包存在"。删除条目不会让功能变多，只让 Loader 不再因缺包而拒绝挂载。
> 若删完后卡片视图能出来但某些按钮缺失，说明那个包确实被用到了，此时只能升级 DSH。

---

## 二、安装

### 方式 A：本机 link（推荐，先试用）

```bash
# 1. 把插件目录放到一个固定位置，例如：
#    ~/dsh-plugins/dsh-client-ui-workspace

# 2. 在你的 profile 里加 link 依赖
cd ~/.dsh/profiles/<你的profile名>     # 常见是 desktop 或 web
# 编辑 package.json，在 dependencies 里加一行：
#   "@deepseek-ai/dsh-client-ui-workspace": "link:/Users/你/dsh-plugins/dsh-client-ui-workspace"

# 3. 装依赖
pnpm install

# 4. 在 profile 的 cordis.patch.yml 里启用（把包名加进 bundles 列表）
#    bundles:
#      - "@deepseek-ai/dsh-client-ui-workspace"

# 5. 重启 DSH（首次挂载新插件需要一次重启）
```

### 方式 B：npm 安装（作者发布后）

```bash
cd ~/.dsh/profiles/<你的profile名>
pnpm add @deepseek-ai/dsh-client-ui-workspace
# 然后在 cordis.patch.yml 的 bundles 里加入包名，重启 DSH
```

### 方式 C：github 依赖

```bash
pnpm add github:<你的账号>/<仓库名>#<commit>
```

若要走方式 B/C，仓库根需要有 `package.json`；本交付包已经是单包根目录，可直接作为一个仓库推送。

---

## 三、装完怎么验证

**不要只看没报错**——按下面顺序确认它真的活了：

1. **看插件是否被加载**
   在 DSH 里执行：`plugin_manager` → `list_plugins`，找到 `dsh-client-ui-workspace`，
   确认它的 `fiberPhase` 是 `active`（不是只看 README 说"装好了"）。

2. **看界面入口**
   打开 DSH 侧边栏的会话列表区，区头下方应出现一个**两段式切换控件**：
   `树形` / `卡片`。选「卡片」即进入卡片视图。

3. **看主题控件**
   卡片视图下，每张会话卡片上有一枚**标签按钮**；点开可给该会话选主题、清除主题或新建主题。
   定义了主题的文件夹，网格会按主题拆成带彩色实线边框的分区。

> 如果 `fiberPhase` 不是 active，或侧边栏没出现「卡片」切换，回到第一节的降级路径处理。

---

## 四、卸载

从 profile 的 `package.json` 删掉该依赖、从 `cordis.patch.yml` 的 bundles 里删掉包名，
`pnpm install` 后重启即可。主题数据存在浏览器本地视图 store 里，卸载后随之消失。

---

## 五、已知限制（诚实清单）

- **主题仅存于浏览器本地**：主题列表与会话归属保存在浏览器视图 store，不会同步到另一台机器或另一个浏览器；树形视图里也没有主题分组。
- **主题不影响会话本身**：只是侧栏的视图分组，不改会话的工作目录、日志或工作区归属。
- **搜索不分卡片**：非空白查询会接管任何浏览模式，返回单一扁平结果列表，不按卡片绘制。
- 本包**未在本机以外环境实测**；不同 DSH 版本下的表现按第一节分级预期。
