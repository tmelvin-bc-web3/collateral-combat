#!/bin/bash
# Task Locking - Prevents duplicate work
# Usage:
#   ./lock.sh claim T001 w1    # Claim task for worker
#   ./lock.sh release T001     # Release task (unclaim)
#   ./lock.sh complete T001    # Mark task done
#   ./lock.sh fail T001        # Mark task failed
#   ./lock.sh status T001      # Check task status

set -e

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
PLAN_FILE="$PROJECT_DIR/MIGRATION_PLAN.md"
ACTION="${1:-status}"
TASK_ID="${2:-}"
WORKER_ID="${3:-w1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [[ ! -f "$PLAN_FILE" ]]; then
    echo -e "${RED}Error: MIGRATION_PLAN.md not found${NC}"
    exit 1
fi

if [[ -z "$TASK_ID" && "$ACTION" != "list" ]]; then
    echo "Usage: $0 <action> <task_id> [worker_id]"
    echo "Actions: claim, release, complete, fail, status, list"
    exit 1
fi

case "$ACTION" in
    claim)
        # Check if task exists and is unclaimed
        if grep -q "^\- \[ \] $TASK_ID " "$PLAN_FILE"; then
            # Replace [ ] with [@worker]
            sed -i '' "s/^- \[ \] $TASK_ID /- [@$WORKER_ID] $TASK_ID /" "$PLAN_FILE"
            echo -e "${GREEN}✓ Claimed $TASK_ID for $WORKER_ID${NC}"
        elif grep -q "^\- \[@" "$PLAN_FILE" | grep -q "$TASK_ID"; then
            echo -e "${YELLOW}⚠ $TASK_ID already claimed${NC}"
            exit 1
        else
            echo -e "${RED}✗ $TASK_ID not found or not claimable${NC}"
            exit 1
        fi
        ;;

    release)
        # Release claim back to unclaimed
        if grep -q "^\- \[@[^]]*\] $TASK_ID " "$PLAN_FILE"; then
            sed -i '' "s/^- \[@[^]]*\] $TASK_ID /- [ ] $TASK_ID /" "$PLAN_FILE"
            echo -e "${GREEN}✓ Released $TASK_ID${NC}"
        else
            echo -e "${YELLOW}⚠ $TASK_ID not currently claimed${NC}"
        fi
        ;;

    complete)
        # Mark task as done
        if grep -q "$TASK_ID" "$PLAN_FILE"; then
            sed -i '' "s/^- \[[@x! ]*\] $TASK_ID /- [x] $TASK_ID /" "$PLAN_FILE"
            echo -e "${GREEN}✓ Completed $TASK_ID${NC}"
        else
            echo -e "${RED}✗ $TASK_ID not found${NC}"
            exit 1
        fi
        ;;

    fail)
        # Mark task as failed
        if grep -q "$TASK_ID" "$PLAN_FILE"; then
            sed -i '' "s/^- \[[@x ]*\] $TASK_ID /- [!] $TASK_ID /" "$PLAN_FILE"
            echo -e "${RED}✗ Marked $TASK_ID as failed${NC}"
        else
            echo -e "${RED}✗ $TASK_ID not found${NC}"
            exit 1
        fi
        ;;

    status)
        # Show task status
        TASK_LINE=$(grep "$TASK_ID" "$PLAN_FILE" | head -1)
        if [[ -n "$TASK_LINE" ]]; then
            if echo "$TASK_LINE" | grep -q "^\- \[ \]"; then
                echo -e "${YELLOW}◯ $TASK_ID: unclaimed${NC}"
            elif echo "$TASK_LINE" | grep -q "^\- \[@"; then
                WORKER=$(echo "$TASK_LINE" | grep -oE "@[^]]*" | tr -d '@')
                echo -e "${BLUE}◉ $TASK_ID: claimed by $WORKER${NC}"
            elif echo "$TASK_LINE" | grep -q "^\- \[x\]"; then
                echo -e "${GREEN}✓ $TASK_ID: completed${NC}"
            elif echo "$TASK_LINE" | grep -q "^\- \[!\]"; then
                echo -e "${RED}✗ $TASK_ID: failed${NC}"
            fi
        else
            echo -e "${RED}✗ $TASK_ID not found${NC}"
            exit 1
        fi
        ;;

    list)
        # List all tasks with status
        echo -e "${YELLOW}Unclaimed:${NC}"
        grep "^\- \[ \]" "$PLAN_FILE" | head -10 || echo "  (none)"
        echo ""
        echo -e "${BLUE}In Progress:${NC}"
        grep "^\- \[@" "$PLAN_FILE" || echo "  (none)"
        echo ""
        echo -e "${GREEN}Completed:${NC}"
        grep "^\- \[x\]" "$PLAN_FILE" | wc -l | xargs echo "  "
        echo ""
        echo -e "${RED}Failed:${NC}"
        grep "^\- \[!\]" "$PLAN_FILE" || echo "  (none)"
        ;;

    *)
        echo "Unknown action: $ACTION"
        echo "Actions: claim, release, complete, fail, status, list"
        exit 1
        ;;
esac
