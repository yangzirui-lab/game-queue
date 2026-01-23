# Steam 登录配置指南

本文档说明如何配置 Steam 登录功能。

## 前置要求

1. 一个 Vercel 账号（免费）
2. 一个 Steam 账号
3. Steam Web API Key

## 配置步骤

### 1. 获取 Steam API Key

1. 访问 [Steam Web API Key 页面](https://steamcommunity.com/dev/apikey)
2. 登录你的 Steam 账号
3. 填写域名（可以填写你的 Vercel 域名，如 `your-app.vercel.app`）
4. 同意条款并创建 API Key
5. 保存生成的 API Key

### 2. 部署到 Vercel

#### 方式一：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 部署项目
vercel

# 按提示完成配置
```

#### 方式二：通过 Vercel Dashboard

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New Project"
3. 导入你的 GitHub 仓库
4. Vercel 会自动检测配置并开始构建

### 3. 配置环境变量

在 Vercel Dashboard 中配置以下环境变量：

1. 进入项目设置 → Environment Variables
2. 添加以下变量：

| 变量名          | 值                               | 说明                                                                     |
| --------------- | -------------------------------- | ------------------------------------------------------------------------ |
| `STEAM_API_KEY` | 你的 Steam API Key               | 从步骤 1 获取                                                            |
| `JWT_SECRET`    | 随机字符串（至少 32 字符）       | 用于签名 JWT token，推荐使用 [生成器](https://www.grc.com/passwords.htm) |
| `FRONTEND_URL`  | `https://your-domain.vercel.app` | 你的 Vercel 域名                                                         |

3. 点击 "Save" 保存
4. 重新部署项目使环境变量生效

### 4. 本地开发配置

如果需要本地开发和测试 Steam 登录：

1. 创建 `.env` 文件：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入真实的配置：

```env
JWT_SECRET=your-local-dev-secret-key
STEAM_API_KEY=your-steam-api-key
FRONTEND_URL=http://localhost:5173
```

3. 安装 Vercel CLI 并启动本地开发服务器：

```bash
# 安装依赖
npm install
cd api && npm install && cd ..
cd web && npm install && cd ..

# 启动本地开发
vercel dev
```

4. 访问 `http://localhost:3000`

### 5. 测试 Steam 登录

1. 访问你的应用
2. 点击右上角设置图标
3. 在设置弹窗中点击 "Sign in through Steam" 按钮
4. 重定向到 Steam 登录页面
5. 登录并授权
6. 成功后会重定向回应用，并显示你的 Steam 用户信息

## 工作原理

1. 用户点击 "Sign in through Steam"
2. 重定向到 `/api/auth/steam`（Vercel Serverless Function）
3. 构建 Steam OpenID 请求并重定向到 Steam
4. 用户在 Steam 登录并授权
5. Steam 重定向回 `/api/auth/callback`
6. 验证 Steam 响应并获取用户信息
7. 生成 JWT token
8. 重定向回前端，携带 token
9. 前端保存 token 到 localStorage
10. 显示用户信息

## 安全注意事项

1. **JWT_SECRET** 必须保密，不要提交到 Git
2. **STEAM_API_KEY** 有调用限制，不要暴露到前端
3. 生产环境使用强随机字符串作为 JWT_SECRET
4. JWT token 有效期为 7 天，过期后需要重新登录

## 故障排查

### Steam 登录后没有回调

- 检查 `FRONTEND_URL` 环境变量是否正确
- 确保 Vercel 部署成功
- 查看 Vercel Functions 日志

### "STEAM_API_KEY not configured" 错误

- 确认在 Vercel Dashboard 中配置了 `STEAM_API_KEY`
- 重新部署项目使环境变量生效

### JWT 验证失败

- 检查 `JWT_SECRET` 是否在所有环境中一致
- 清除浏览器 localStorage 并重新登录

### 本地开发无法登录

- 确保使用 `vercel dev` 而不是 `npm run dev`
- 检查 `.env` 文件配置是否正确
- 确认 Steam API Key 有效

## 其他资源

- [Steam Web API 文档](https://developer.valvesoftware.com/wiki/Steam_Web_API)
- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [OpenID 2.0 规范](https://openid.net/specs/openid-authentication-2_0.html)
