# 项目规范

## 部署架构

### 1. 整体架构

前端（本仓库）+ 后端（[degenerates-backend](https://github.com/Catalyzer-dot/degenerates-backend)）均运行在云服务器 Docker 中，域名 `degenerates.site`，由 nginx 统一代理。

### 2. 路由规则

- `/api/*` → 反向代理到后端容器 `backend:8080`
- `/*` → nginx 服务前端静态文件，SPA 模式（fallback 到 `index.html`）

## 行为规范

### 1. 任务完成后的行为

完成任务后直接告知修改了哪些文件及主要变更，不创建 SUMMARY.md、CHECKLIST.md 等总结性文档，除非用户明确要求。
