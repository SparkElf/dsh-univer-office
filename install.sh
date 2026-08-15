#!/bin/bash
# DSH × Univer 插件一键安装脚本（macOS）
# 用法：解压本包后，在终端里运行：  bash install.sh
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -d "$DIR/univer" ]; then SRC="$DIR/univer"; else SRC="$DIR/dist/univer"; fi
DEST="$HOME/.dsh/profiles/node_modules/@dsh-local/univer"
PATCH="$HOME/.dsh/profiles/web/cordis.patch.yml"

echo "📦 正在安装 DSH × Univer 插件..."

# 1. 复制插件本体
mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -R "$SRC" "$DEST"

# 2. 写入加载配置（幂等，不会重复）
if ! grep -q "name: '@dsh-local/univer'" "$PATCH" 2>/dev/null; then
  mkdir -p "$(dirname "$PATCH")"
  printf '\n# DSH × Univer integration: CLI/daemon management + preview UI.\n- insert:\n    - id: univer\n      name: '"'"'@dsh-local/univer'"'"'\n' >> "$PATCH"
  echo "   ✅ 已写入加载配置"
else
  echo "   ✅ 加载配置已存在（未重复添加）"
fi

# 3. 检测 univer CLI
if command -v univer >/dev/null 2>&1; then
  VER="$(univer --version 2>/dev/null | head -1)"
  echo "   ✅ univer CLI 已找到: $VER"
else
  echo "   ⚠️  未检测到 univer CLI（预览需要它，可运行: npm i -g univer-cli）"
fi

# 4. 检测 daemon
if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:8000/" 2>/dev/null; then
  echo "   ✅ univer daemon 运行中"
else
  echo "   ℹ️  daemon 未运行（打开预览时会自动启动）"
fi

echo ""
echo "🎉 安装完成！"
echo "👉 打开 DeepSeek Harness，按 Cmd+R 刷新即可使用。"
echo "   用法：在会话里让 AI 跑 univer 命令，回合尾部会出现预览卡片，点击全屏查看。"
