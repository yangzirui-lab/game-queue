# Game Gallery

一个现代化的游戏收藏管理应用。

## 项目结构

- **本仓库**: 前端代码 (Vue + Vite)
- **后端仓库**: [degenerates-backend](https://github.com/yangzirui-lab/degenerates-backend)

## 本地开发

### 前置要求

- Node.js 20+
- Git

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/yangzirui-lab/game-gallery.git
cd game-gallery/web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173

### 环境变量

在 `web/.env` 中配置：

```bash
VITE_API_URL=http://localhost:8080/api
```

> 注意：本地开发需要后端服务运行，请参考 [degenerates-backend](https://github.com/yangzirui-lab/degenerates-backend) 仓库。
