# DeepSeek Harness (DSH) × Univer 插件

> **DeepSeek Harness 中的 Univer 办公运行时窗口。**

[English](README.md) · [中文](README.zh-CN.md)

在 DeepSeek Harness（简称 DSH）应用内直接预览 Univer 办公文件（表格、文档、幻灯片、Base）：跑过 univer 命令的回合会自动出现预览卡片，点击即在应用内全屏展开 —— 无需浏览器、无需手动起服务。worktree 工作则有一个实时窗口：agent 一创建 worktree，角落就弹出实时同步的小浮窗；worktree ready 且会话结束后，浮窗自动关闭，合并审阅页面嵌入会话下方。

```
┌────────────────────────────────────────┐
│ 📊 销售表格.univer  [wt-xxx]  [展开预览 ▾] │  ← 回合尾部卡片
│ /Users/.../销售表格.univer              │
└────────────────────────────────────────┘

┌──────────────────────────────┐
│ ● agent-draft · 销售表格     │  ← 实时浮窗（draft worktree）
│ [进行中]  [−] [⤢] [✕]        │
│ ┌──────────────────────────┐ │
│ │   实时 worktree Viewer   │ │     点击标题栏放大，
│ │   （只读 · 实时同步）     │ │     可拖拽 / 折叠 / 关闭
│ └──────────────────────────┘ │
└──────────────────────────────┘

┌────────────────────────────────────────┐
│ 🧾 合并审阅「agent-draft」  [待确认] ▾  │  ← 会话结束合并面板
│ ┌────────────────────────────────────┐ │
│ │   合并预览页面（内嵌）              │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

## 功能

- **回合尾部预览卡片** —— 回合内 bash 调用中出现过 `.univer` 文件的，回合结束后自动出现预览卡片（支持 `--worktree`）。
- **应用内全屏预览** —— 点卡片在应用内 iframe 中打开表格；✕ / 遮罩 / Esc 关闭。
- **实时浮窗** —— agent 创建 worktree（`univer worktree add` / `execute --worktree`）后，**右上角**弹出小浮窗，内嵌只读实时 worktree 页面；CLI 的修改实时出现在浮窗里。一个 worktree 改动多个 unit（如表格+PPT）时，浮窗与审阅面板顶部的 **unit 切换 chips** 只列出有变动的单元（＋新增 / ✎修改 / －删除 / ⚠冲突），未变动的单元不显示；默认打开第一个变动单元。
- **浮窗交互** —— 拖深色标题栏移动；点击标题栏（未拖动）即放大；`−` 折叠成只剩标题条，`⤢` 最大化，**拖右下角调整大小**，`✕` 关闭（worktree 状态变化后自动重新出现）。
- **ready + 会话结束 → 自动关闭并嵌入合并页** —— 会话转入空闲后，所有**非终态** worktree 自动进入会话下方的审阅 dock：`ready` 显示合并预览（`scope=mergePreview`）+ 重新打开 / 丢弃 / 合并到 trunk 按钮；**`draft` 也进入 dock**，显示实时页面 + 标记为 ready / 丢弃按钮（agent 忘了标 ready 也能直接审阅）。会话仍在运行时，非终态 worktree 在右上角浮窗显示。**merge 或 discard 之后（终态）不再显示任何浮窗或面板。**
- **daemon 管理** —— 绿点 = daemon 运行中；黄点 = 未运行，点击自动启动。
- **多会话并行** —— 各会话显示各自回合的卡片、浮窗与合并面板。
- **双语界面** —— 卡片跟随应用语言（中/英）。

## 环境要求

- macOS（或 Linux）+ 已安装 DeepSeek Harness
- 建议安装 [univer-cli](https://github.com/dream-num/univer-cli)：`npm i -g univer-cli`；未安装时插件仍可安装，需要时会提示

## 安装

本包是一个标准 [DSH bundle](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/user/develop/basic/publish.md)：声明了 `dsh.bundle` 并自带 `cordis.patch.yml`，可通过标准 loader 安装：

### 从 git 安装

```sh
dsh plugin --profile web add github:dream-num/dsh-univer-plugin
```

### 从 npm 安装

```sh
dsh plugin --profile web add @univer-cli/dsh-univer-plugin
```

### 从本地 checkout 安装（开发用）

```sh
dsh plugin --profile web add /path/to/dsh-univer-plugin
```

> profile 首次使用会自动初始化；`dsh` 会把该 bundle 追加到 `dsh.profile.bundles`，pnpm 链接包后，loader 自动应用插件的 `cordis.patch.yml` 层。可用 `dsh --profile web --dump-config` 验证（应能看到 `# == @univer-cli/dsh-univer-plugin` 层）。

### 备用：一键安装脚本（无 dsh CLI 时）

无法运行 `dsh` CLI 时，可使用便利安装脚本：

```sh
bash install.sh
```

macOS zip 用户可直接双击 `install.command`（见 `packaging/INSTALL.txt`）。

任何方式安装后：在 DeepSeek Harness 窗口按 **Cmd+R / Ctrl+R** 刷新。

## 使用

1. 在会话里跑 univer 命令（`univer new/import/execute/inspect/...`）
2. 回合结束后，回合尾部自动出现预览卡片
3. 点卡片 → 应用内全屏预览
4. 创建 worktree → 角落弹出实时浮窗，agent 的每次修改实时可见
5. `univer worktree ready` → 浮窗显示「待确认」；会话结束后浮窗自动关闭，合并审阅面板嵌入会话下方
6. daemon 未运行时卡片上显示黄色圆点，点击即可自动启动

## 卸载

```sh
univer-dsh uninstall
```

或手动删除：删除 `~/.dsh/profiles/node_modules/@univer-cli/dsh-univer-plugin` 及 `cordis.patch.yml` 中对应条目。

## 结构

本插件是双半 DSH 插件：

- **node 半**（`lib/index.js`）—— 声明了 `dsh.client` 的包；提供 `univer` 服务与宿主的 `/univer-api/*` 回路路由：
  - `GET /univer-api/status` —— daemon + CLI 事实；
  - `POST /univer-api/ensure-daemon` —— 按需启动 daemon；
  - `GET /univer-api/state?file=<绝对路径>` —— worktree 生命周期状态（`draft`/`ready`/`merged`/`discarded`）与内嵌 Viewer 深链（`worktreeUrl`/`mergeUrl`/`trunkUrl`），gateway 优先、CLI 兜底、1s TTL 缓存。
- **client 半**（`lib/client.js`）—— 两处挂载：
  - `conversation.chat.turnTail` 预览卡片 + 全屏遮罩（通过纯的、可回放的 conversation-events 定义扫描回合内 bash 调用中的 `.univer` 目标）；
  - `conversation.input.dock` 条目：从会话快照推导目标文件，每 ~900ms 轮询 `/univer-api/state`，渲染实时浮窗（draft，或会话运行中的 ready）与会话结束合并面板（会话空闲后的 ready/merged）。

实时同步由 Viewer 页面本身完成（univer-cli 的 `packages/collab-web`）：它订阅 gateway 的生命周期 WebSocket 与 comb 通道，CLI 写入无需插件干预即反映到 iframe 中。

## 开发

`dist/` 与归档产物（`univer-dsh-plugin.zip`、`*.tgz`）是**生成物**——已加入 `.gitignore`，不入库。源文件在 `lib/`、`package.json`、`README*.md`、`cordis.patch.yml`、`install.sh` 与 `packaging/`。修改源文件后重建产物：

```sh
bash scripts/build-dist.sh
```

该脚本会重新生成 `dist/univer/`（发布包内容）、npm tarball `dist/univer-cli-dsh-univer-plugin-<version>.tgz` 与 zip 分发包 `univer-dsh-plugin.zip`（包内容 + 来自 `packaging/` 的 `install.command` + `INSTALL*.txt`）。

冒烟测试（host 冒烟需要本机真实的 `univer` CLI 与 daemon；client 冒烟在 jsdom 下运行，从本地 `deepseek-harness` checkout 解析 react —— 按需调整测试文件头部的 `repoRoot`）：

```sh
node test/host-smoke.mjs
node test/client-smoke.mjs
```

发布：`npm publish`（遵循 `files` 白名单）；zip/tgz 挂到 GitHub Release 供终端用户下载。

## 预留的 npm 包名

无 scope 的裸名 [`dsh-univer-plugin`](https://www.npmjs.com/package/dsh-univer-plugin) 已由本项目预留，用于防 typosquatting（恶意仿冒）——`redirects/dsh-univer-plugin/` 存放占位包（deprecated，指向官方包名），不含任何代码。**请始终安装官方包：**

```sh
dsh plugin --profile web add github:dream-num/dsh-univer-plugin   # 从 git
dsh plugin --profile web add @univer-cli/dsh-univer-plugin        # 从 npm
```

## 元数据

- **Topic**：[`dsh-plugin`](https://github.com/topics/dsh-plugin)
- **Bundle manifest**：`dsh.bundle.patch` → `./cordis.patch.yml`
- **Client manifest**：`dsh.client`（`platform: "web"` + `inject`）

## 许可

[Apache-2.0](LICENSE)
