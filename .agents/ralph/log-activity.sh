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

  # Detect task events and send appropriate notifications
  if echo "$MESSAGE" | grep -qi "starting task\|begin task\|working on"; then
    TASK_ID=$(echo "$MESSAGE" | grep -oE "T[0-9]+" | head -1 || echo "unknown")
    bash "$NOTIFY_SCRIPT" start "$TASK_ID" "$MESSAGE" 2>/dev/null &
  elif echo "$MESSAGE" | grep -qi "completed\|finished\|done\|success"; then
    TASK_ID=$(echo "$MESSAGE" | grep -oE "T[0-9]+" | head -1 || echo "unknown")
    bash "$NOTIFY_SCRIPT" complete "$TASK_ID" "$MESSAGE" 2>/dev/null &
  elif echo "$MESSAGE" | grep -qi "failed\|error\|blocked"; then
    TASK_ID=$(echo "$MESSAGE" | grep -oE "T[0-9]+" | head -1 || echo "unknown")
    bash "$NOTIFY_SCRIPT" fail "$TASK_ID" "$MESSAGE" 2>/dev/null &
  fi
fi
