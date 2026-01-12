#!/bin/bash
# Ralph Worker Wrapper with Telegram Notifications
# Usage: ./ralph-worker.sh <worker_name> <plan_file> [max_iterations]
#
# Examples:
#   ./ralph-worker.sh backend .ralph/plan-backend.md 5
#   ./ralph-worker.sh contracts .ralph/plan-contracts.md 3
#   ./ralph-worker.sh frontend-lib .ralph/plan-frontend-lib.md 5
#   ./ralph-worker.sh frontend-ui .ralph/plan-frontend-ui.md 10

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

WORKER_NAME="${1:-worker}"
PLAN_FILE="${2:-.ralph/IMPLEMENTATION_PLAN.md}"
MAX_ITERATIONS="${3:-5}"
PROGRESS_FILE=".ralph/progress-${WORKER_NAME}.md"

NOTIFY_SCRIPT="$PROJECT_DIR/automation/notify.sh"
TELEGRAM_CONFIG="$PROJECT_DIR/.telegram_config"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[ralph:$WORKER_NAME]${NC} $(date +%H:%M:%S) $1"; }
log_success() { echo -e "${GREEN}[ralph:$WORKER_NAME]${NC} $(date +%H:%M:%S) $1"; }

notify() {
  if [[ -f "$TELEGRAM_CONFIG" && -f "$NOTIFY_SCRIPT" ]]; then
    bash "$NOTIFY_SCRIPT" "$@" 2>/dev/null || true
  fi
}

# Count pending tasks
count_pending() {
  grep -c "^\- \[ \]" "$PLAN_FILE" 2>/dev/null || echo "0"
}

# Get first pending task ID
get_first_task() {
  grep "^\- \[ \]" "$PLAN_FILE" | head -1 | grep -oE "T[0-9]+" | head -1 || echo ""
}

# Cleanup on exit
cleanup() {
  log "Worker stopped"
  notify pipeline_end "$WORKER_NAME" "Iterations: $COMPLETED_ITERATIONS"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start
PENDING_BEFORE=$(count_pending)
log "═══════════════════════════════════════════"
log "  Ralph Worker: $WORKER_NAME"
log "  Plan: $PLAN_FILE"
log "  Progress: $PROGRESS_FILE"
log "  Max iterations: $MAX_ITERATIONS"
log "  Pending tasks: $PENDING_BEFORE"
log "═══════════════════════════════════════════"

notify pipeline_start "$WORKER_NAME" "Tasks: $PENDING_BEFORE"

COMPLETED_ITERATIONS=0

for ((i=1; i<=MAX_ITERATIONS; i++)); do
  FIRST_TASK=$(get_first_task)

  if [[ -z "$FIRST_TASK" ]]; then
    log_success "No more pending tasks!"
    break
  fi

  log "Iteration $i/$MAX_ITERATIONS - Starting $FIRST_TASK"
  notify start "$FIRST_TASK" "Worker: $WORKER_NAME, Iteration: $i/$MAX_ITERATIONS"

  # Run Ralph
  if ralph build 1 --plan "$PLAN_FILE" --progress "$PROGRESS_FILE" --no-commit; then
    log_success "Iteration $i complete"
    notify complete "$FIRST_TASK" "Worker: $WORKER_NAME"
    ((COMPLETED_ITERATIONS++))

    # Commit changes
    if [[ -n $(git status --porcelain) ]]; then
      git add -A
      git commit -m "$FIRST_TASK: Completed by Ralph ($WORKER_NAME)

Worker: $WORKER_NAME
Iteration: $i

Co-Authored-By: Claude <noreply@anthropic.com>" || true
      log "Committed changes for $FIRST_TASK"
    fi
  else
    log "Iteration $i failed or no changes"
    notify fail "$FIRST_TASK" "Worker: $WORKER_NAME - iteration failed"
  fi

  # Brief pause between iterations
  sleep 2
done

PENDING_AFTER=$(count_pending)
TASKS_DONE=$((PENDING_BEFORE - PENDING_AFTER))

log "═══════════════════════════════════════════"
log_success "  Worker Complete: $WORKER_NAME"
log "  Iterations run: $COMPLETED_ITERATIONS"
log "  Tasks completed: $TASKS_DONE"
log "  Remaining: $PENDING_AFTER"
log "═══════════════════════════════════════════"

notify pipeline_end "$WORKER_NAME" "Completed: $TASKS_DONE tasks"
