#!/bin/bash
set -e

# Linux服务器前端部署脚本
# 此脚本从dist分支拉取前端构建产物并部署
# 后端服务由 degenerates-backend 仓库独立管理

echo "======================================"
echo "Game Gallery Frontend Deployment"
echo "======================================"
echo ""

# 配置变量
DEPLOY_DIR="${DEPLOY_DIR:-/opt/game-gallery}"
TEMP_DIR="/tmp/game-gallery-deploy-$$"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
log_info "Checking dependencies..."
if ! command -v git &> /dev/null; then
    log_error "Git is not installed"
    exit 1
fi

log_info "All dependencies are installed"

# 步骤1: 下载前端构建产物
echo ""
log_info "[1/2] Downloading frontend build from dist branch..."
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# 配置 git 以提高稳定性
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999

# 尝试克隆，最多重试 3 次
RETRY_COUNT=0
MAX_RETRIES=3
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    log_info "Attempt $((RETRY_COUNT + 1))/$MAX_RETRIES to download frontend..."

    if git clone --branch dist --depth 1 --single-branch https://github.com/catalyzer-dot/game-gallery.git .; then
        SUCCESS=true
        log_info "Frontend build downloaded successfully"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            log_warn "Download failed, retrying in 5 seconds..."
            sleep 5
        fi
    fi
done

if [ "$SUCCESS" = false ]; then
    log_error "Failed to download frontend build after $MAX_RETRIES attempts"
    log_info "Trying alternative method (GitHub API)..."

    # 备用方案：使用 GitHub API 下载
    cd "$TEMP_DIR"
    if curl -fsSL -o dist.tar.gz "https://github.com/catalyzer-dot/game-gallery/archive/refs/heads/dist.tar.gz"; then
        tar -xzf dist.tar.gz --strip-components=1
        rm dist.tar.gz
        log_info "Frontend downloaded via GitHub API"
    else
        log_error "All download methods failed"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
fi

# 步骤2: 部署前端文件
echo ""
log_info "[2/2] Deploying frontend files..."
mkdir -p "$DEPLOY_DIR/web/dist"
cp -r "$TEMP_DIR"/* "$DEPLOY_DIR/web/dist/"

# 修正文件权限
if id deploy &>/dev/null; then
    log_info "Setting file ownership to deploy user..."
    chown -R deploy:deploy "$DEPLOY_DIR/web"
fi

log_info "Frontend files deployed to $DEPLOY_DIR/web/dist"

# 清理临时目录
rm -rf "$TEMP_DIR"

# 显示部署信息
echo ""
echo "======================================"
echo -e "${GREEN}Frontend Deployment Complete!${NC}"
echo "======================================"
echo ""
echo "Deploy Directory: $DEPLOY_DIR/web/dist"
echo ""
echo "Note: Frontend is served by degenerates-backend nginx"
echo "URL: https://degenerates.site"
echo ""
