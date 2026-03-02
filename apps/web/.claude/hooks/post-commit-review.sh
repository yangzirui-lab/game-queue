#!/bin/bash
# 检测 git commit 命令，触发 code-review skill

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -qE 'git commit'; then
    echo "检测到 git commit，请立即执行 /code-review 对本次提交进行代码审查。" >&2
    exit 2
fi

exit 0
