# Game Gallery

游戏收藏管理平台 - Monorepo

## 项目结构

```
game-gallery/
├── apps/
│   └── web/              # 前端应用 (Vue + Vite)
├── games/
│   └── tower-defense/    # 塔防游戏 (Godot)
├── games.json            # 游戏收藏数据
└── package.json          # Monorepo 配置
```

**后端仓库**: [degenerates-backend](https://github.com/catalyzer-dot/degenerates-backend)

## 本地开发

### 前置要求

- Node.js 20+
- Git

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/catalyzer-dot/game-gallery.git
cd game-gallery

# 安装依赖
npm install

# 启动前端开发服务器
npm run dev
```

访问 http://localhost:5173

### 环境变量

在 `apps/web/.env` 中配置：

```bash
VITE_API_URL=http://localhost:8080/api
```

> 注意：本地开发需要后端服务运行，请参考 [degenerates-backend](https://github.com/catalyzer-dot/degenerates-backend) 仓库。

## 子项目

### apps/web

游戏收藏管理前端应用，使用 Vue 3 + TypeScript + Vite 构建。

### games/tower-defense

使用 Godot 引擎开发的塔防游戏。
