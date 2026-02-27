# 代码规范

### 1. Happy Path 模式

优先处理错误/边界情况并 early return，让主业务逻辑保持在最外层，避免深层 if-else 嵌套。

### 2. 统一末尾导出

所有 `.ts`/`.tsx` 文件中，定义时不加 `export`，统一在文件末尾通过 `export { ... }` / `export type { ... }` 导出。

### 3. 禁止使用 `any` 类型

严格禁止使用 `any`，用 `unknown`、泛型 `<T>`、联合类型或具体接口替代。

### 4. API 类型定义与错误处理

API 方法必须明确定义请求/响应类型，返回 `Promise<T | null>`，内部捕获异常返回 `null`，调用方不使用 try-catch。

### 5. API 地址统一管理

所有 API 地址在 `constants/api.ts` 中集中定义（附多行注释说明用途），业务代码中禁止硬编码 URL。
