#!/usr/bin/env bash
# Monitor script — polls EAS for in-progress builds and emits status lines.
# Runs always; no-ops silently when eas CLI is absent or no builds are active.

if ! command -v eas &>/dev/null; then
  exit 0
fi

LAST=""
while true; do
  CURRENT=$(eas build:list --limit 5 --json 2>/dev/null \
    | jq -r '.[] | select(.status | test("IN_QUEUE|IN_PROGRESS|ERRORED")) | "[eas-build] \(.status) \(.platform) — \(.id)"' 2>/dev/null) || true

  if [ -n "$CURRENT" ] && [ "$CURRENT" != "$LAST" ]; then
    echo "$CURRENT"
    LAST="$CURRENT"
  fi
  sleep 60
done
