#!/bin/bash
# DSH × Univer 插件安装器（macOS 双击运行版）
# 双击本文件 → 弹出终端 → 自动完成安装
cd "$(dirname "$0")"

DEST="$HOME/.dsh/profiles/node_modules/@dsh-local/univer"
PATCH="$HOME/.dsh/profiles/web/cordis.patch.yml"

echo "==============================================="
echo "  DSH × Univer 插件安装器"
echo "==============================================="
echo ""

# 1. 检查 DeepSeek Harness 是否安装
if [ ! -d "/Applications/DeepSeek Harness.app" ] && [ ! -d "$HOME/Applications/DeepSeek Harness.app" ]; then
  echo "❌ 没找到 DeepSeek Harness 应用"
  echo "   请先安装 DeepSeek Harness 再运行本安装器。"
  echo ""
  read -n 1 -s -r -p "按任意键退出..."
  exit 1
fi

# 2. 复制插件
mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -R "$(dirname "$0")/univer" "$DEST"
echo "✅ 第1步：插件文件已装好"

# 3. 写配置（幂等）
if ! grep -q "name: '@dsh-local/univer'" "$PATCH" 2>/dev/null; then
  mkdir -p "$(dirname "$PATCH")"
  printf '\n# DSH × Univer integration: CLI/daemon management + preview UI.\n- insert:\n    - id: univer\n      name: '"'"'@dsh-local/univer'"'"'\n' >> "$PATCH"
  echo "✅ 第2步：加载配置已写好"
else
  echo "✅ 第2步：加载配置已存在"
fi

# 4. 检测 univer CLI
if command -v univer >/dev/null 2>&1; then
  echo "✅ 第3步：univer CLI 已就绪（$(univer --version 2>/dev/null | head -1)）"
else
  echo "⚠️  第3步：没找到 univer CLI"
  echo "   想预览表格需要它。可以以后让 AI 帮你装，或手动运行："
  echo "   npm i -g univer-cli"
fi

echo ""
echo "==============================================="
echo "  🎉 安装完成！"
echo ""
echo "  接下来："
echo "  1. 打开 DeepSeek Harness"
echo "  2. 在窗口里按 Cmd + R（刷新页面）"
echo "  3. 让 AI 跑 univer 命令，回合尾部会出现预览卡片"
echo "==============================================="
echo ""
read -n 1 -s -r -p "按任意键关闭窗口..."
