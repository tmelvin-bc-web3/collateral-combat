#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ACTIVITY_LOG="$ROOT_DIR/.ralph/activity.log"
NOTIFY_SCRIPT="$ROOT_DIR/automation/notify.sh"
TELEGRAM_CONFIG="$ROOT_DIR/.telegram_config"

if [ $# -lt 1 ]; then
  echo "Usage: $0 \"message\""
  exit 1
fi

mkdir -p "$(dirname "$ACTIVITY_LOG")"
TS=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TS] $*" >> "$ACTIVITY_LOG"

# Send Telegram notification if configured
if [[ -f "$TELEGRAM_CONFIG" && -f "$NOTIFY_SCRIPT" ]]; then
  MESSAGE="$*"

  # Extract story ID (US-XXX) or task ID (T###)
  STORY_ID=$(echo "$MESSAGE" | grep -oE "US-[0-9]+" | head -1 || echo "")
  TASK_ID=$(echo "$MESSAGE" | grep -oE "T[0-9]+" | head -1 || echo "")
  ID="${STORY_ID:-${TASK_ID:-unknown}}"

  # Detect events and send appropriate notifications
  if echo "$MESSAGE" | grep -qi "ITERATION.*start\|Starting work on\|begin"; then
    bash "$NOTIFY_SCRIPT" start "$ID" "$MESSAGE" 2>/dev/null &
  elif echo "$MESSAGE" | grep -qi "COMPLETED\|complete.*success\|implemented"; then
    bash "$NOTIFY_SCRIPT" complete "$ID" "$MESSAGE" 2>/dev/null &
  elif echo "$MESSAGE" | grep -qi "failed\|error\|blocked"; then
    bash "$NOTIFY_SCRIPT" fail "$ID" "$MESSAGE" 2>/dev/null &
  fi
fi
