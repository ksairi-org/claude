#!/usr/bin/env bash
# Monitor script — polls EAS for in-progress builds and emits status lines.
# Started only when the scaffold skill is invoked (when: on-skill-invoke:scaffold).

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
