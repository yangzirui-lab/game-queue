#!/bin/bash

# Godot塔防游戏 - 导出并部署到GitHub Pages
set -e

echo "=== Godot塔防游戏部署脚本 ==="
echo ""

# 配置
GODOT_BIN="/Users/zhaoyang/github/game-gallery/godot-editor/Godot.app/Contents/MacOS/Godot"
PROJECT_DIR="/Users/zhaoyang/github/game-gallery/godot-tower-defense"
EXPORT_DIR="/Users/zhaoyang/github/game-gallery/web/public/godot-tower-defense"
TEMPLATE_DIR="/Users/zhaoyang/Library/Application Support/Godot/export_templates/4.3.stable"

# 1. 检查导出模板
echo "1. 检查导出模板..."
if [ ! -d "$TEMPLATE_DIR" ] || [ ! -f "$TEMPLATE_DIR/web_nothreads_release.zip" ]; then
    echo "  ❌ 导出模板未安装或不完整"
    echo "  请先运行: open $GODOT_BIN 并从编辑器中下载Web导出模板"
    exit 1
fi
echo "  ✓ 导出模板已安装"

# 2. 清理旧文件
echo "2. 清理旧的导出文件..."
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"
echo "  ✓ 目录已准备"

# 3. 导出Web版本
echo "3. 导出Godot项目为Web..."
cd "$PROJECT_DIR"
"$GODOT_BIN" --headless --export-release "Web" "$EXPORT_DIR/index.html" 2>&1 | grep -v "reimport"
if [ $? -eq 0 ]; then
    echo "  ✓ 导出成功"
else
    echo "  ❌ 导出失败"
    exit 1
fi

# 4. 验证导出文件
echo "4. 验证导出文件..."
if [ -f "$EXPORT_DIR/index.html" ] && [ -f "$EXPORT_DIR/index.wasm" ]; then
    echo "  ✓ 导出文件完整"
    ls -lh "$EXPORT_DIR"
else
    echo "  ❌ 导出文件不完整"
    exit 1
fi

# 5. 提交到Git
echo "5. 提交更改到Git..."
cd /Users/zhaoyang/github/game-gallery
git add web/public/godot-tower-defense/
git add godot-tower-defense/
git status

echo ""
echo "=== 部署准备完成 ==="
echo ""
echo "接下来请执行："
echo "  cd /Users/zhaoyang/github/game-gallery"
echo "  git commit -m '新增Godot塔防游戏'"
echo "  git push"
echo ""
echo "推送后，游戏将在以下地址可用："
echo "  https://catalyzer-dot.github.io/game-gallery/godot-tower-defense/"
