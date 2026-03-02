---
paths:
  - '**/*.ts'
  - '**/*.tsx'
---

# 代码风格规范

## 1. Happy Path 模式

优先处理错误/边界情况并 early return，让主业务逻辑保持在最外层，避免深层 if-else 嵌套。

## 2. 统一末尾导出

所有 `.ts`/`.tsx` 文件中，定义时不加 `export`，统一在文件末尾通过 `export { ... }` / `export type { ... }` 导出。

## 3. 禁止使用 `any` 类型

严格禁止使用 `any`，用 `unknown`、泛型 `<T>`、联合类型或具体接口替代。
