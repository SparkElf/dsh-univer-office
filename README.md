# DSH × Univer 插件

在 DeepSeek Harness 应用内直接预览 Univer 表格：跑过 univer 命令的回合会自动出现
预览卡片，点击即在应用内全屏展开 —— 无需浏览器、无需手动起服务。

```
┌────────────────────────────────────────┐
│ 📊 销售表格.univer  [wt-xxx]  [展开预览 ▾] │  ← 回合尾部卡片
│ /Users/.../销售表格.univer              │
└────────────────────────────────────────┘
```

## 安装

```bash
# 方式一（推荐）：本包自带的安装器
npx --package ./univer-0.1.0.tgz univer-dsh install
# 或解压本包后
bash install.sh
```

安装完成后在 DeepSeek Harness 窗口按 **Cmd+R** 刷新。

## 使用

1. 像平时一样在会话里跑 univer 命令（`univer new/import/execute/inspect/...`）；
2. 回合结束（AI 回复完成）后，回合尾部自动出现预览卡片；
3. 点卡片 → 应用内全屏预览；`✕` / 遮罩 / Esc 关闭；
4. 多会话并行时，各会话显示各自回合的表格。

daemon 未运行时卡片上会显示黄色圆点，点击即可自动启动。

## 卸载

```bash
univer-dsh uninstall   # 或手动删除 ~/.dsh/profiles/node_modules/@dsh-local/univer 及配置条目
```

## 环境要求

- macOS + 已安装 DeepSeek Harness
- 建议安装 univer CLI（`npm i -g univer-cli`）；未安装时插件会提示
