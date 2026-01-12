#!/bin/bash
# Ralph Queue Manager - Handles story claiming and locking for parallel workers
# Usage:
#   ./ralph-queue.sh claim <worker_id>     # Claim next available story for worker
#   ./ralph-queue.sh release <story_id>    # Release a claimed story
#   ./ralph-queue.sh complete <story_id>   # Mark story as complete
#   ./ralph-queue.sh status                # Show queue status
#   ./ralph-queue.sh list <worker_id>      # List stories assigned to worker

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QUEUE_DIR="$PROJECT_DIR/.ralph/queue"
LOCKS_DIR="$QUEUE_DIR/locks"
PRD_FILE="$PROJECT_DIR/.agents/tasks/prd-parallel.md"

# Worker scope mappings (which file patterns each worker handles)
declare -A WORKER_SCOPES=(
  ["backend"]="backend/"
  ["frontend-lib"]="web/src/lib|web/src/hooks|web/src/contexts"
  ["frontend-ui"]="web/src/app|web/src/components"
  ["contracts"]="prediction_program/"
  ["any"]=".*"  # Fallback worker handles anything
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[queue]${NC} $1"; }
log_success() { echo -e "${GREEN}[queue]${NC} $1"; }
log_error() { echo -e "${RED}[queue]${NC} $1"; }

# Initialize queue directories
init_queue() {
  mkdir -p "$LOCKS_DIR"
}

# Parse stories from PRD
parse_stories() {
  if [[ ! -f "$PRD_FILE" ]]; then
    echo "[]"
    return
  fi

  # Extract stories with their scope tags
  python3 - "$PRD_FILE" <<'PY'
import re
import json
import sys
from pathlib import Path

prd = Path(sys.argv[1]).read_text()
pattern = re.compile(
    r'^### \[(?P<status>[ xX])\] (?P<id>US-\d+): (?P<title>.+?)$\n'
    r'(?P<body>(?:(?!^### ).)*)',
    re.MULTILINE | re.DOTALL
)

stories = []
for m in pattern.finditer(prd):
    status = 'done' if m.group('status').lower() == 'x' else 'pending'
    body = m.group('body')

    # Extract @scope tag
    scope_match = re.search(r'@scope:\s*(.+?)$', body, re.MULTILINE)
    scope = scope_match.group(1).strip() if scope_match else ''

    # Extract @worker tag
    worker_match = re.search(r'@worker:\s*(.+?)$', body, re.MULTILINE)
    worker = worker_match.group(1).strip() if worker_match else ''

    stories.append({
        'id': m.group('id'),
        'title': m.group('title').strip(),
        'status': status,
        'scope': scope,
        'worker': worker
    })

print(json.dumps(stories))
PY
}

# Check if story is locked
is_locked() {
  local story_id="$1"
  local lock_file="$LOCKS_DIR/${story_id}.lock"

  if [[ -f "$lock_file" ]]; then
    # Check if lock is stale (older than 30 minutes)
    local lock_age=$(($(date +%s) - $(stat -f %m "$lock_file" 2>/dev/null || echo 0)))
    if [[ $lock_age -gt 1800 ]]; then
      log "Removing stale lock for $story_id (${lock_age}s old)"
      rm -f "$lock_file"
      return 1
    fi
    return 0
  fi
  return 1
}

# Lock a story for a worker
lock_story() {
  local story_id="$1"
  local worker_id="$2"
  local lock_file="$LOCKS_DIR/${story_id}.lock"

  # Atomic lock creation using mkdir (atomic on POSIX)
  local tmp_lock="$LOCKS_DIR/.${story_id}.$$"
  echo "$worker_id:$(date +%s)" > "$tmp_lock"

  if mv -n "$tmp_lock" "$lock_file" 2>/dev/null; then
    return 0
  else
    rm -f "$tmp_lock"
    return 1
  fi
}

# Release a story lock
release_lock() {
  local story_id="$1"
  local lock_file="$LOCKS_DIR/${story_id}.lock"
  rm -f "$lock_file"
}

# Check if worker can handle story based on scope
worker_matches_scope() {
  local worker_id="$1"
  local story_scope="$2"
  local story_worker="$3"

  # If story has explicit worker assignment, check it
  if [[ -n "$story_worker" ]]; then
    [[ "$story_worker" == "$worker_id" ]] && return 0 || return 1
  fi

  # If story has no scope, any worker can take it
  if [[ -z "$story_scope" ]]; then
    return 0
  fi

  # Check if worker's scope pattern matches story scope
  local worker_pattern="${WORKER_SCOPES[$worker_id]:-}"
  if [[ -z "$worker_pattern" ]]; then
    return 1
  fi

  echo "$story_scope" | grep -qE "$worker_pattern"
}

# Claim next available story for worker
claim_story() {
  local worker_id="$1"
  init_queue

  local stories=$(parse_stories)

  # Find first pending story that matches worker scope and isn't locked
  local story=$(echo "$stories" | python3 -c "
import json
import sys

stories = json.load(sys.stdin)
worker_id = sys.argv[1]

for s in stories:
    if s['status'] == 'pending':
        print(json.dumps(s))
        break
" "$worker_id" 2>/dev/null || echo "")

  if [[ -z "$story" || "$story" == "null" ]]; then
    echo ""
    return 1
  fi

  local story_id=$(echo "$story" | jq -r '.id')
  local story_scope=$(echo "$story" | jq -r '.scope // ""')
  local story_worker=$(echo "$story" | jq -r '.worker // ""')

  # Check scope match
  if ! worker_matches_scope "$worker_id" "$story_scope" "$story_worker"; then
    # Try to find another story
    echo ""
    return 1
  fi

  # Check if already locked
  if is_locked "$story_id"; then
    echo ""
    return 1
  fi

  # Try to acquire lock
  if lock_story "$story_id" "$worker_id"; then
    echo "$story"
    return 0
  else
    echo ""
    return 1
  fi
}

# Mark story complete in PRD
complete_story() {
  local story_id="$1"

  # Update PRD to mark story as complete
  sed -i '' "s/^### \[ \] ${story_id}:/### [x] ${story_id}:/" "$PRD_FILE"

  # Release lock
  release_lock "$story_id"

  log_success "$story_id marked complete"
}

# Show queue status
show_status() {
  init_queue

  echo "=== Ralph Queue Status ==="
  echo ""

  local stories=$(parse_stories)
  local pending=$(echo "$stories" | jq '[.[] | select(.status == "pending")] | length')
  local done=$(echo "$stories" | jq '[.[] | select(.status == "done")] | length')
  local total=$(echo "$stories" | jq 'length')

  echo "Stories: $done/$total complete ($pending pending)"
  echo ""

  echo "Pending:"
  echo "$stories" | jq -r '.[] | select(.status == "pending") | "  [ ] \(.id): \(.title) @scope:\(.scope) @worker:\(.worker)"'

  echo ""
  echo "Locks:"
  if ls "$LOCKS_DIR"/*.lock 2>/dev/null | head -1 > /dev/null; then
    for lock in "$LOCKS_DIR"/*.lock; do
      local story_id=$(basename "$lock" .lock)
      local content=$(cat "$lock")
      echo "  🔒 $story_id: $content"
    done
  else
    echo "  (none)"
  fi
}

# Main command handler
case "${1:-status}" in
  claim)
    claim_story "${2:-any}"
    ;;
  release)
    release_lock "${2:-}"
    ;;
  complete)
    complete_story "${2:-}"
    ;;
  status)
    show_status
    ;;
  *)
    echo "Usage: $0 {claim|release|complete|status} [args]"
    exit 1
    ;;
esac
