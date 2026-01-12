#!/bin/bash
# Telegram Listener - Receives commands and provides status updates
# Commands:
#   /status  - Show current pipeline status
#   /tasks   - List pending tasks
#   /stop    - Stop the pipeline (creates stop file)
#   /logs    - Show recent activity
#   /help    - Show available commands

set -e

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
CONFIG_FILE="$PROJECT_DIR/.telegram_config"
OFFSET_FILE="$PROJECT_DIR/logs/.telegram_offset"
POLL_INTERVAL=5

# Load config
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo "Error: .telegram_config not found"
    exit 1
fi

if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
    echo "Error: Telegram not configured"
    exit 1
fi

mkdir -p "$PROJECT_DIR/logs"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${CYAN}[telegram]${NC} $(date +%H:%M:%S) $1"; }

# Send message to Telegram
send_message() {
    local message="$1"
    curl -s -X POST \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${message}" \
        -d "parse_mode=HTML" \
        > /dev/null 2>&1
}

# Get pipeline status
get_status() {
    local unclaimed=$(grep -c "^- \[ \] T[0-9]" "$PROJECT_DIR/MIGRATION_PLAN.md" 2>/dev/null || echo "0")
    local in_progress=$(grep -c "^- \[@" "$PROJECT_DIR/MIGRATION_PLAN.md" 2>/dev/null || echo "0")
    local completed=$(grep -c "^- \[x\]" "$PROJECT_DIR/MIGRATION_PLAN.md" 2>/dev/null || echo "0")
    local failed=$(grep -c "^- \[!\]" "$PROJECT_DIR/MIGRATION_PLAN.md" 2>/dev/null || echo "0")

    local current_task=""
    if [[ -f "$PROJECT_DIR/CURRENT_TASK.md" ]]; then
        current_task=$(grep "^## Description" -A1 "$PROJECT_DIR/CURRENT_TASK.md" 2>/dev/null | tail -1 || echo "None")
    fi

    local manager_running="No"
    if pgrep -f "manager.sh" > /dev/null 2>&1; then
        manager_running="Yes"
    fi

    echo "📊 <b>Pipeline Status</b>

<b>Manager Running:</b> $manager_running
<b>Current Task:</b> ${current_task:-None}

<b>Tasks:</b>
• Pending: $unclaimed
• In Progress: $in_progress
• Completed: $completed
• Failed: $failed"
}

# Get pending tasks
get_tasks() {
    local tasks=$(grep "^- \[ \] T[0-9]" "$PROJECT_DIR/MIGRATION_PLAN.md" 2>/dev/null | head -5 | sed 's/^- \[ \] /• /')

    if [[ -z "$tasks" ]]; then
        echo "📋 <b>No pending tasks</b>"
    else
        echo "📋 <b>Pending Tasks</b>

$tasks

<i>(showing first 5)</i>"
    fi
}

# Get recent logs
get_logs() {
    local logs=""
    if [[ -f "$PROJECT_DIR/logs/marathon_log.txt" ]]; then
        logs=$(tail -10 "$PROJECT_DIR/logs/marathon_log.txt" 2>/dev/null)
    fi

    if [[ -z "$logs" ]]; then
        echo "📜 <b>No recent activity</b>"
    else
        echo "📜 <b>Recent Activity</b>

<pre>$logs</pre>"
    fi
}

# Stop pipeline
stop_pipeline() {
    touch "$PROJECT_DIR/.stop_pipeline"
    pkill -f "manager.sh" 2>/dev/null || true
    echo "🛑 <b>Pipeline Stop Requested</b>

Stop signal sent. Manager will halt after current task."
}

# Help message
show_help() {
    echo "🤖 <b>DegenDome Pipeline Bot</b>

<b>Commands:</b>
/status - Pipeline status
/tasks - List pending tasks
/logs - Recent activity
/stop - Stop the pipeline
/help - Show this help"
}

# Process incoming message
process_message() {
    local text="$1"
    local response=""

    case "$text" in
        /status|/status@*)
            response=$(get_status)
            ;;
        /tasks|/tasks@*)
            response=$(get_tasks)
            ;;
        /logs|/logs@*)
            response=$(get_logs)
            ;;
        /stop|/stop@*)
            response=$(stop_pipeline)
            ;;
        /help|/help@*|/start|/start@*)
            response=$(show_help)
            ;;
        *)
            # Ignore non-command messages
            return
            ;;
    esac

    if [[ -n "$response" ]]; then
        send_message "$response"
    fi
}

# Get updates from Telegram
get_updates() {
    local offset=""
    if [[ -f "$OFFSET_FILE" ]]; then
        offset=$(cat "$OFFSET_FILE")
    fi

    local url="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?timeout=30"
    if [[ -n "$offset" ]]; then
        url="${url}&offset=${offset}"
    fi

    curl -s "$url"
}

# Main loop
main() {
    log "Telegram listener started"
    log "Listening for commands..."

    send_message "🟢 <b>Pipeline Bot Online</b>

Send /help for available commands."

    while true; do
        # Check for stop signal
        if [[ -f "$PROJECT_DIR/.stop_listener" ]]; then
            rm -f "$PROJECT_DIR/.stop_listener"
            log "Stop signal received"
            break
        fi

        # Get updates
        local updates=$(get_updates)

        # Process each update
        echo "$updates" | jq -c '.result[]?' 2>/dev/null | while read -r update; do
            local update_id=$(echo "$update" | jq -r '.update_id')
            local chat_id=$(echo "$update" | jq -r '.message.chat.id // .edited_message.chat.id // ""')
            local text=$(echo "$update" | jq -r '.message.text // .edited_message.text // ""')

            # Only process messages from authorized chat
            if [[ "$chat_id" == "$TELEGRAM_CHAT_ID" && -n "$text" ]]; then
                log "Received: $text"
                process_message "$text"
            fi

            # Update offset
            echo $((update_id + 1)) > "$OFFSET_FILE"
        done

        sleep "$POLL_INTERVAL"
    done

    log "Telegram listener stopped"
}

# Handle interrupts
cleanup() {
    log "Shutting down..."
    send_message "🔴 <b>Pipeline Bot Offline</b>"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Run
main
