#!/bin/bash
# Manager - Task Dispatcher
# Runs continuously, dispatching tasks to workers
# This is the ONLY long-running process

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

# Configuration
MAX_RETRIES=3
TASK_TIMEOUT=30  # minutes
LOOP_DELAY=10    # seconds between checks
FULL_VERIFY_EVERY=5  # full verification every N tasks

# Files
PLAN_FILE="$PROJECT_DIR/MIGRATION_PLAN.md"
CONTEXT_FILE="$PROJECT_DIR/CONTEXT.md"
CURRENT_TASK="$PROJECT_DIR/CURRENT_TASK.md"
MARATHON_LOG="$PROJECT_DIR/logs/marathon_log.txt"
LOCK_SCRIPT="$PROJECT_DIR/automation/lock.sh"
WORKER_SCRIPT="$PROJECT_DIR/automation/worker.sh"
VERIFY_SCRIPT="$PROJECT_DIR/automation/verify.sh"
NOTIFY_SCRIPT="$PROJECT_DIR/automation/notify.sh"

# State
TASKS_COMPLETED=0
WORKER_ID="${WORKER_ID:-w1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[manager]${NC} $(date +%H:%M:%S) $1"; }
log_success() { echo -e "${GREEN}[manager]${NC} $(date +%H:%M:%S) $1"; }
log_error() { echo -e "${RED}[manager]${NC} $(date +%H:%M:%S) $1"; }
log_warn() { echo -e "${YELLOW}[manager]${NC} $(date +%H:%M:%S) $1"; }

marathon_log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') | $1" >> "$MARATHON_LOG"
}

notify() {
    bash "$NOTIFY_SCRIPT" "$@" 2>/dev/null || true
}

# Initialize
mkdir -p "$PROJECT_DIR/logs"
touch "$MARATHON_LOG"

# Find next unclaimed task
find_next_task() {
    # Get first unclaimed task (starts with "- [ ] T")
    grep "^- \[ \] T[0-9]" "$PLAN_FILE" | head -1
}

# Parse task line to extract ID and info
parse_task() {
    local line="$1"
    TASK_ID=$(echo "$line" | grep -oE "T[0-9]+" | head -1)
    TASK_DESC=$(echo "$line" | sed 's/^- \[.\] //' | cut -d'-' -f1 | xargs)
}

# Extract task details from MIGRATION_PLAN.md
extract_task_details() {
    local task_id="$1"

    # Find the task and extract scope/verify/files info
    local in_task=false
    local scope=""
    local verify=""
    local files=""

    while IFS= read -r line; do
        if echo "$line" | grep -qE "^- \[[^]]*\] $task_id "; then
            in_task=true
            TASK_TITLE=$(echo "$line" | sed "s/^- \[[^]]*\] $task_id //")
        elif [[ "$in_task" == true ]]; then
            if echo "$line" | grep -qE "^- \[[^]]*\] T[0-9]"; then
                break  # Next task
            elif echo "$line" | grep -q "^##"; then
                break  # Next section
            elif echo "$line" | grep -q "Scope:"; then
                scope=$(echo "$line" | sed 's/.*Scope: *//')
            elif echo "$line" | grep -q "Verify:"; then
                verify=$(echo "$line" | sed 's/.*Verify: *//')
            elif echo "$line" | grep -q "Files:"; then
                files=$(echo "$line" | sed 's/.*Files: *//')
            fi
        fi
    done < "$PLAN_FILE"

    TASK_SCOPE="$scope"
    TASK_VERIFY="$verify"
    TASK_FILES="$files"
}

# Generate CURRENT_TASK.md for worker
generate_current_task() {
    local task_id="$1"

    extract_task_details "$task_id"

    cat > "$CURRENT_TASK" << EOF
# Current Task: $task_id

## Description
$TASK_TITLE

## Scope
$TASK_SCOPE

## Files to Modify
$TASK_FILES

## Verification
$TASK_VERIFY

## Worker
$WORKER_ID (Attempt $ATTEMPT of $MAX_RETRIES)

## Rules
1. ONLY modify files listed above
2. Follow CONTEXT.md coding standards
3. Run verification before completing
4. Signal completion with TASK_COMPLETE block
EOF

    log "Generated CURRENT_TASK.md for $task_id"
}

# Run verification
run_verification() {
    local task_id="$1"
    local mode="quick"

    # Full verification every N tasks
    if (( TASKS_COMPLETED % FULL_VERIFY_EVERY == 0 )) && (( TASKS_COMPLETED > 0 )); then
        mode="full"
        log "Running FULL verification (every $FULL_VERIFY_EVERY tasks)"
    fi

    if bash "$VERIFY_SCRIPT" "$task_id" "$mode"; then
        return 0
    else
        return 1
    fi
}

# Commit changes
commit_changes() {
    local task_id="$1"
    local desc="$2"

    if [[ -z $(git status --porcelain) ]]; then
        log "No changes to commit"
        return 0
    fi

    git add -A
    git commit -m "$task_id: $desc

Worker: $WORKER_ID
Verified: $(date +%Y-%m-%d)

Co-Authored-By: Claude <noreply@anthropic.com>"

    log_success "Committed: $task_id"
    marathon_log "COMMIT: $task_id - $desc"
}

# Reset working directory (DOES NOT DELETE PIPELINE INFRASTRUCTURE)
reset_repo() {
    log_warn "Resetting modified files..."
    # Only reset tracked files that were modified - DO NOT use git clean
    git checkout -- . 2>/dev/null || true
    rm -f "$CURRENT_TASK"
}

# Main loop
main() {
    log "═══════════════════════════════════════"
    log "  Manager Started"
    log "  Worker ID: $WORKER_ID"
    log "  Max retries: $MAX_RETRIES"
    log "  Task timeout: ${TASK_TIMEOUT}m"
    log "═══════════════════════════════════════"

    marathon_log "=== Manager started (worker: $WORKER_ID) ==="
    notify pipeline_start "$WORKER_ID"

    local consecutive_empty=0

    while true; do
        # Check for stop signal
        if [[ -f "$PROJECT_DIR/.stop_pipeline" ]]; then
            rm -f "$PROJECT_DIR/.stop_pipeline"
            log_warn "Stop signal received"
            break
        fi

        # Find next task
        local task_line=$(find_next_task)

        if [[ -z "$task_line" ]]; then
            ((consecutive_empty++))

            if [[ $consecutive_empty -ge 3 ]]; then
                log_success "No more tasks. Pipeline complete!"
                marathon_log "COMPLETE: No more tasks"
                notify pipeline_end "$TASKS_COMPLETED" "All tasks processed"
                break
            fi

            log "No unclaimed tasks. Waiting... ($consecutive_empty/3)"
            sleep "$LOOP_DELAY"
            continue
        fi

        consecutive_empty=0
        parse_task "$task_line"

        if [[ -z "$TASK_ID" ]]; then
            log_warn "Could not parse task ID"
            sleep 5
            continue
        fi

        log "Found task: $TASK_ID"
        marathon_log "FOUND: $TASK_ID"
        notify start "$TASK_ID" "$TASK_DESC"

        # Attempt loop
        ATTEMPT=1
        local success=false

        while [[ $ATTEMPT -le $MAX_RETRIES ]]; do
            log "Attempt $ATTEMPT/$MAX_RETRIES for $TASK_ID"

            # Claim task
            bash "$LOCK_SCRIPT" claim "$TASK_ID" "$WORKER_ID" || {
                log_error "Failed to claim $TASK_ID"
                break
            }

            # Generate task file
            generate_current_task "$TASK_ID"

            # Run worker
            log "Spawning worker..."
            if bash "$WORKER_SCRIPT" "$TASK_ID" "$WORKER_ID" "$TASK_TIMEOUT"; then
                # Worker completed - verify
                log "Worker completed. Running verification..."

                if run_verification "$TASK_ID"; then
                    # Success!
                    commit_changes "$TASK_ID" "$TASK_TITLE"
                    bash "$LOCK_SCRIPT" complete "$TASK_ID"
                    ((TASKS_COMPLETED++))
                    success=true
                    marathon_log "SUCCESS: $TASK_ID (attempt $ATTEMPT)"
                    log_success "✓ $TASK_ID completed!"
                    notify complete "$TASK_ID" "Verified and committed"
                    break
                else
                    log_error "Verification failed"
                    reset_repo
                    bash "$LOCK_SCRIPT" release "$TASK_ID"
                fi
            else
                local exit_code=$?
                if [[ $exit_code -eq 2 ]]; then
                    log_error "Task blocked"
                    bash "$LOCK_SCRIPT" fail "$TASK_ID"
                    marathon_log "BLOCKED: $TASK_ID"
                    notify blocked "$TASK_ID" "Worker reported blocked"
                    break
                else
                    log_error "Worker failed (exit $exit_code)"
                    reset_repo
                    bash "$LOCK_SCRIPT" release "$TASK_ID"
                fi
            fi

            ((ATTEMPT++))
            if [[ $ATTEMPT -le $MAX_RETRIES ]]; then
                log "Retrying in 5s..."
                sleep 5
            fi
        done

        if [[ "$success" != "true" && $ATTEMPT -gt $MAX_RETRIES ]]; then
            log_error "Task $TASK_ID failed after $MAX_RETRIES attempts"
            bash "$LOCK_SCRIPT" fail "$TASK_ID"
            marathon_log "FAILED: $TASK_ID (max retries)"
            notify fail "$TASK_ID" "Failed after $MAX_RETRIES attempts"
        fi

        # Cleanup
        rm -f "$CURRENT_TASK"

        # Brief pause
        sleep 3
    done

    log "═══════════════════════════════════════"
    log "  Manager Complete"
    log "  Tasks completed: $TASKS_COMPLETED"
    log "═══════════════════════════════════════"
    marathon_log "=== Manager stopped (completed: $TASKS_COMPLETED) ==="
}

# Handle interrupts
cleanup() {
    log_warn "Interrupted!"
    marathon_log "INTERRUPTED"
    rm -f "$CURRENT_TASK"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Run
main
