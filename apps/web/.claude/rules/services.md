---
paths:
  - '**/*.ts'
  - '**/*.tsx'
---

# 服务层规范

## 1. API 类型定义与错误处理

API 方法必须明确定义请求/响应类型，返回 `Promise<T | null>`，内部捕获异常返回 `null`，调用方不使用 try-catch。

## 2. API 地址统一管理

所有 API 地址在 `constants/api.ts` 中集中定义（附多行注释说明用途），业务代码中禁止硬编码 URL。
