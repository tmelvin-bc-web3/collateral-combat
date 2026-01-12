#!/bin/bash
# Telegram Notification Script
# Usage: ./notify.sh <event> [task_id] [message]
# Events: start, complete, fail, blocked, pipeline_start, pipeline_end

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
CONFIG_FILE="$PROJECT_DIR/.telegram_config"

# Load config
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    exit 0  # Silent fail if not configured
fi

if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
    exit 0
fi

EVENT="${1:-}"
TASK_ID="${2:-}"
MESSAGE="${3:-}"

send_telegram() {
    local text="$1"
    curl -s -X POST \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${text}" \
        -d "parse_mode=HTML" \
        > /dev/null 2>&1
}

case "$EVENT" in
    start)
        send_telegram "🔄 <b>Task Started</b>
Task: $TASK_ID
$MESSAGE"
        ;;
    complete)
        send_telegram "✅ <b>Task Complete</b>
Task: $TASK_ID
$MESSAGE"
        ;;
    fail)
        send_telegram "❌ <b>Task Failed</b>
Task: $TASK_ID
$MESSAGE"
        ;;
    blocked)
        send_telegram "🚧 <b>Task Blocked</b>
Task: $TASK_ID
$MESSAGE"
        ;;
    pipeline_start)
        send_telegram "🚀 <b>Pipeline Started</b>
Worker: $TASK_ID"
        ;;
    pipeline_end)
        send_telegram "🏁 <b>Pipeline Complete</b>
Tasks completed: $TASK_ID
$MESSAGE"
        ;;
esac
