#!/bin/bash
# Worker - Executes ONE task then dies
# Uses claude with strict context isolation
# Called by manager.sh, never run in a loop

set -e

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
TASK_ID="${1:-}"
WORKER_ID="${2:-w1}"
TIMEOUT_MINUTES="${3:-30}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[worker:$WORKER_ID]${NC} $(date +%H:%M:%S) $1"; }
log_success() { echo -e "${GREEN}[worker:$WORKER_ID]${NC} $(date +%H:%M:%S) $1"; }
log_error() { echo -e "${RED}[worker:$WORKER_ID]${NC} $(date +%H:%M:%S) $1"; }

if [[ -z "$TASK_ID" ]]; then
    echo "Usage: $0 <task_id> [worker_id] [timeout_minutes]"
    exit 1
fi

# Files
CURRENT_TASK="$PROJECT_DIR/CURRENT_TASK.md"
CONTEXT_FILE="$PROJECT_DIR/CONTEXT.md"
PLAN_FILE="$PROJECT_DIR/MIGRATION_PLAN.md"

log "Starting worker for $TASK_ID"
log "Timeout: ${TIMEOUT_MINUTES}m"

# Check CURRENT_TASK.md exists
if [[ ! -f "$CURRENT_TASK" ]]; then
    log_error "CURRENT_TASK.md not found - manager should create this"
    exit 1
fi

# Build prompt file combining context + task
PROMPT_FILE=$(mktemp)
cat > "$PROMPT_FILE" << 'PROMPT_HEADER'
# Worker Instructions

You are a focused worker executing a single task. Follow these rules strictly:

1. **Read CONTEXT.md first** - Understand coding standards
2. **Read CURRENT_TASK.md** - Understand your specific task
3. **Only modify files listed in the task scope**
4. **Run verification commands before finishing**
5. **Exit immediately when done**

Do NOT:
- Modify files outside your scope
- Start new tasks
- Refactor unrelated code
- Add features not in the task

When complete, output:
```
---TASK_COMPLETE---
Task: <task_id>
Status: DONE
Files modified: <list>
Verification: <PASS/FAIL>
---END_TASK---
```

If blocked (missing dependencies, unclear requirements, etc), output:
```
---TASK_BLOCKED---
Task: <task_id>
Reason: <why>
---END_TASK---
```

PROMPT_HEADER

echo "" >> "$PROMPT_FILE"
echo "---" >> "$PROMPT_FILE"
echo "" >> "$PROMPT_FILE"
echo "# Context (Coding Standards)" >> "$PROMPT_FILE"
echo "" >> "$PROMPT_FILE"
cat "$CONTEXT_FILE" >> "$PROMPT_FILE"
echo "" >> "$PROMPT_FILE"
echo "---" >> "$PROMPT_FILE"
echo "" >> "$PROMPT_FILE"
echo "# Your Current Task" >> "$PROMPT_FILE"
echo "" >> "$PROMPT_FILE"
cat "$CURRENT_TASK" >> "$PROMPT_FILE"

log "Executing claude (permissions bypassed)..."

# Run claude with the combined prompt
# Single execution (not loop), strict timeout
TIMEOUT_SECONDS=$((TIMEOUT_MINUTES * 60))
OUTPUT_FILE=$(mktemp)

cd "$PROJECT_DIR"

# Use claude directly with permission bypass for automated pipelines
if timeout ${TIMEOUT_SECONDS}s claude \
    --dangerously-skip-permissions \
    --print \
    --output-format text \
    --allowedTools "Write,Read,Edit,Glob,Grep,Bash,WebFetch" \
    -p "$(cat "$PROMPT_FILE")" \
    > "$OUTPUT_FILE" 2>&1; then

    EXIT_CODE=0
    log_success "Claude execution completed"
else
    EXIT_CODE=$?
    if [[ $EXIT_CODE -eq 124 ]]; then
        log_error "Task timed out after ${TIMEOUT_MINUTES}m"
    else
        log_error "Claude exited with code $EXIT_CODE"
    fi
fi

# Check for completion signal - look for the exact marker
if grep -q "\-\-\-TASK_COMPLETE\-\-\-" "$OUTPUT_FILE" 2>/dev/null; then
    log_success "Task signaled completion"
    RESULT="complete"
elif grep -q "\-\-\-TASK_BLOCKED\-\-\-" "$OUTPUT_FILE" 2>/dev/null; then
    log_error "Task is blocked"
    RESULT="blocked"
else
    log "No explicit completion signal"
    # If claude succeeded and no explicit block, assume progress was made
    if [[ $EXIT_CODE -eq 0 ]]; then
        RESULT="complete"
    else
        RESULT="unknown"
    fi
fi

# Cleanup
rm -f "$PROMPT_FILE"

# Save output for manager to review
cp "$OUTPUT_FILE" "$PROJECT_DIR/logs/worker_${TASK_ID}_$(date +%Y%m%d_%H%M%S).log" 2>/dev/null || true
rm -f "$OUTPUT_FILE"

# Return appropriate exit code
case "$RESULT" in
    complete) exit 0 ;;
    blocked) exit 2 ;;
    *) exit $EXIT_CODE ;;
esac
