---
name: code-review
description: 审查最新 git 提交的代码质量、潜在 bug、安全漏洞和项目规范。每次提交后自动执行。
disable-model-invocation: false
allowed-tools: Bash, Read, Grep, Glob
---

对最近一次 git 提交进行代码审查：

1. 执行 `git show --stat HEAD` 查看改动了哪些文件
2. 执行 `git diff HEAD~1 HEAD` 获取完整的 diff
3. 阅读 `CLAUDE.md` 了解项目编码规范

审查内容：

- 代码质量与可读性
- 潜在 bug 或逻辑错误
- 安全漏洞（输入注入、密钥泄露、未校验输入、XSS、SQL 注入等）
- 性能影响
- 是否符合 CLAUDE.md 中的项目规范
- 新功能是否有对应测试

输出格式：

## 代码审查：`[commit hash 前 7 位] [commit 标题]`

**变更摘要**：简述本次提交改了什么、为什么改

**问题**：

- 🔴 **严重**：必须修复（bug、安全漏洞）
- 🟡 **警告**：建议修复（代码质量、缺少错误处理）
- 🔵 **建议**：可选优化

**亮点**：做得好的地方

简洁、可操作。若无问题，直接确认代码质量良好。
