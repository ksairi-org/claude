#!/usr/bin/env bash
# Monitor script — checks for Supabase migration files not yet applied to the local DB.
# Emits a notification once on session start if pending migrations are found,
# then re-checks every 5 minutes.

check_pending() {
  local migrations_dir="supabase/migrations"
  [ -d "$migrations_dir" ] || return 0

  # Ask Supabase CLI for migration status; filter for "not applied" rows
  local pending
  pending=$(supabase migration list 2>/dev/null \
    | awk '/NOT APPLIED/ || /pending/ {print}' \
    | head -20) || return 0

  if [ -n "$pending" ]; then
    echo "[pending-migrations] Unapplied Supabase migrations detected — run 'supabase db push' or 'supabase migration up':"
    echo "$pending"
  fi
}

check_pending
while true; do
  sleep 300
  check_pending
done
