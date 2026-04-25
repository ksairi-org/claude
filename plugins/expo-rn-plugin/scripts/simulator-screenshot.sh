#!/usr/bin/env bash
# Captures a screenshot from the active iOS simulator or Android emulator.
# Outputs the absolute path of the saved PNG to stdout.
# Also emits recent JS/RN error logs to stderr so the preview skill can surface them.

set -euo pipefail

OUTFILE="${TMPDIR:-/tmp}/expo-preview-$(date +%s).png"

# --- iOS Simulator ---
if xcrun simctl list devices 2>/dev/null | grep -q "(Booted)"; then
  xcrun simctl io booted screenshot "$OUTFILE"

  echo "--- recent device errors (last 30s) ---" >&2
  xcrun simctl spawn booted log show \
    --last 30s \
    --level error \
    --predicate 'subsystem == "com.facebook.react.log" OR processImagePath CONTAINS "Expo"' \
    2>/dev/null | tail -30 >&2 || true

  echo "$OUTFILE"
  exit 0
fi

# --- Android Emulator ---
# Skip header line ("List of devices attached") before grepping — "device" is a substring of "devices"
if command -v adb &>/dev/null && adb devices 2>/dev/null | tail -n +2 | grep -qE "emulator|device"; then
  adb exec-out screencap -p > "$OUTFILE"

  echo "--- recent RN errors (logcat) ---" >&2
  # shellcheck disable=SC2035
  adb logcat -d -t 50 ReactNativeJS:E *:S 2>/dev/null >&2 || true

  echo "$OUTFILE"
  exit 0
fi

echo "ERROR: No running iOS simulator or Android emulator detected. Start one with 'yarn expo start --ios' or 'yarn expo start --android'." >&2
exit 1
