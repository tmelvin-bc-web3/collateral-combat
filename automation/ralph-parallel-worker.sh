#!/bin/bash
# Ralph Parallel Worker - Claims stories from queue and processes them
# Usage: ./ralph-parallel-worker.sh <worker_id> [max_stories]
#
# Worker IDs determine which stories they can claim:
#   backend      - backend/ files
#   frontend-lib - web/src/lib, hooks, contexts
#   frontend-ui  - web/src/app, components
#   contracts    - prediction_program/ files
#   any          - fallback, handles anything

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
QUEUE_SCRIPT="$SCRIPT_DIR/ralph-queue.sh"
LOG_SCRIPT="$PROJECT_DIR/.agents/ralph/log-activity.sh"
RALPH_TEMPLATES="$PROJECT_DIR/.agents/ralph"

WORKER_ID="${1:-any}"
MAX_STORIES="${2:-10}"
STORIES_COMPLETED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log() { echo -e "${CYAN}[worker:$WORKER_ID]${NC} $1"; }
log_success() { echo -e "${GREEN}[worker:$WORKER_ID]${NC} $1"; }
log_error() { echo -e "${RED}[worker:$WORKER_ID]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[worker:$WORKER_ID]${NC} $1"; }

# Log activity for Telegram notifications
activity() {
  if [[ -f "$LOG_SCRIPT" ]]; then
    bash "$LOG_SCRIPT" "$*" 2>/dev/null || true
  fi
}

# Create a focused prompt for the story
create_story_prompt() {
  local story_id="$1"
  local story_title="$2"
  local story_json="$3"

  cat <<EOF
You are working on user story $story_id: $story_title

Read the PRD at .agents/tasks/prd-parallel.md to understand the full context.
Focus ONLY on this story's tasks. Do not work on other stories.

Implementation steps:
1. Read the relevant files mentioned in the story
2. Implement the required changes
3. Verify your changes compile/work
4. Mark tasks complete as you finish them

Story details:
$story_json

When complete, output: "STORY_COMPLETE: $story_id"
EOF
}

# Run Claude on a story
run_claude_story() {
  local story_id="$1"
  local story_title="$2"
  local story_json="$3"

  local prompt=$(create_story_prompt "$story_id" "$story_title" "$story_json")
  local prompt_file=$(mktemp)
  echo "$prompt" > "$prompt_file"

  log "Running Claude for $story_id..."
  activity "Starting work on $story_id: $story_title"

  # Run Claude with the prompt
  if claude -p --dangerously-skip-permissions "$(cat "$prompt_file")" 2>&1; then
    rm -f "$prompt_file"
    return 0
  else
    rm -f "$prompt_file"
    return 1
  fi
}

# Main worker loop
main() {
  log "Starting worker (scope: $WORKER_ID, max: $MAX_STORIES stories)"

  while [[ $STORIES_COMPLETED -lt $MAX_STORIES ]]; do
    # Try to claim a story
    log "Checking queue for available stories..."
    local claimed=$("$QUEUE_SCRIPT" claim "$WORKER_ID" 2>/dev/null || echo "")

    if [[ -z "$claimed" || "$claimed" == "null" ]]; then
      log_warn "No stories available for $WORKER_ID scope"

      # Check if all stories are done
      local status=$("$QUEUE_SCRIPT" status 2>/dev/null | grep -oP '\d+(?= pending)' || echo "0")
      if [[ "$status" == "0" ]]; then
        log_success "All stories complete!"
        break
      fi

      # Check if any stories remain for this worker's scope
      local my_tasks=$("$QUEUE_SCRIPT" status 2>/dev/null | grep -c "@worker:$WORKER_ID" || echo "0")
      if [[ "$my_tasks" == "0" ]]; then
        log_success "No more tasks for $WORKER_ID scope. Exiting."
        break
      fi

      # Wait and retry (tasks for our scope may be locked by another instance)
      log "Waiting 30s before retry..."
      sleep 30
      continue
    fi

    # Extract story details
    local story_id=$(echo "$claimed" | jq -r '.id')
    local story_title=$(echo "$claimed" | jq -r '.title')

    log_success "Claimed $story_id: $story_title"

    # Process the story
    if run_claude_story "$story_id" "$story_title" "$claimed"; then
      # Mark complete
      "$QUEUE_SCRIPT" complete "$story_id"
      activity "$story_id: $story_title - COMPLETED"
      log_success "$story_id completed!"
      ((STORIES_COMPLETED++))
    else
      # Release on failure
      "$QUEUE_SCRIPT" release "$story_id"
      activity "$story_id: $story_title - FAILED"
      log_error "$story_id failed, released lock"
    fi

    # Brief pause between stories
    sleep 5
  done

  log_success "Worker finished. Completed $STORIES_COMPLETED stories."
}

# Check dependencies
if ! command -v jq &> /dev/null; then
  log_error "jq is required. Install with: brew install jq"
  exit 1
fi

if ! command -v claude &> /dev/null; then
  log_error "claude CLI is required"
  exit 1
fi

main
