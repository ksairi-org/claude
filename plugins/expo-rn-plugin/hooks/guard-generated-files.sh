#!/usr/bin/env bash
# Warns when Claude attempts to edit orval-generated files directly.
set -euo pipefail

TOOL_INPUT=$(cat)
if [[ -z "$TOOL_INPUT" ]]; then
  exit 0
fi

FILE_PATH=$(echo "$TOOL_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path','') or d.get('path',''))" 2>/dev/null || echo "")

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

if echo "$FILE_PATH" | grep -qE '(generated|orval)/'; then
  # shellcheck disable=SC2016
  echo '{"type":"warning","message":"This is a generated file. Edit the backend spec and run `yarn generate:open-api-hooks` instead of editing manually."}'
  exit 2
fi

if echo "$FILE_PATH" | grep -qE 'src/theme/'; then
  # shellcheck disable=SC2016
  echo '{"type":"warning","message":"src/theme/ is auto-generated from Figma. Edit tokens in Figma and run `/sync-tokens` instead of editing manually."}'
  exit 2
fi
