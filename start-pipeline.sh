#!/bin/bash
# DegenDome Pipeline Launcher
# Usage: ./start-pipeline.sh [command]

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
    echo -e "${CYAN}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     DegenDome Pipeline (Ralph + Manager)      ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  start       Start manager + telegram listener"
    echo "  manager     Start only the manager"
    echo "  telegram    Start only the telegram listener"
    echo "  status      Show task status"
    echo "  verify      Run verification manually"
    echo "  architect   Run architect to plan tasks"
    echo "  logs        Tail the marathon log"
    echo "  stop        Stop all pipeline processes"
    echo "  reset       Reset repo to clean state"
    echo ""
    echo -e "${YELLOW}Parallel Mode:${NC}"
    echo "  start w1    Start as worker 1"
    echo "  start w2    Start as worker 2 (separate terminal)"
    echo ""
}

case "${1:-help}" in
    start)
        WORKER_ID="${2:-w1}"
        echo -e "${GREEN}Starting pipeline (manager + telegram)...${NC}"
        echo ""

        # Remove any old stop signals
        rm -f .stop_pipeline .stop_listener

        # Start telegram listener in background
        echo -e "${CYAN}Starting Telegram listener...${NC}"
        nohup bash automation/telegram-listener.sh > logs/telegram.log 2>&1 &
        TELEGRAM_PID=$!
        echo "Telegram listener PID: $TELEGRAM_PID"

        # Start manager in foreground
        echo -e "${CYAN}Starting Manager...${NC}"
        echo ""
        WORKER_ID="$WORKER_ID" bash automation/manager.sh

        # When manager exits, stop telegram listener
        echo -e "${YELLOW}Stopping Telegram listener...${NC}"
        kill $TELEGRAM_PID 2>/dev/null || true
        ;;

    manager)
        WORKER_ID="${2:-w1}"
        echo -e "${GREEN}Starting manager only (worker: $WORKER_ID)...${NC}"
        WORKER_ID="$WORKER_ID" bash automation/manager.sh
        ;;

    telegram)
        echo -e "${GREEN}Starting Telegram listener...${NC}"
        bash automation/telegram-listener.sh
        ;;

    stop)
        echo -e "${YELLOW}Stopping pipeline...${NC}"
        touch .stop_pipeline .stop_listener
        pkill -f "manager.sh" 2>/dev/null || true
        pkill -f "telegram-listener.sh" 2>/dev/null || true
        echo -e "${GREEN}Stop signals sent${NC}"
        ;;

    status)
        echo -e "${CYAN}Task Status:${NC}"
        bash automation/lock.sh list
        ;;

    verify)
        TASK="${2:-manual}"
        MODE="${3:-quick}"
        bash automation/verify.sh "$TASK" "$MODE"
        ;;

    architect)
        echo -e "${CYAN}Running Architect...${NC}"
        echo "Goal: ${2:-Please specify a goal}"
        echo ""
        if [[ -z "$2" ]]; then
            echo "Usage: $0 architect \"Your goal here\""
            echo "Example: $0 architect \"Add error handling to all API endpoints\""
            exit 1
        fi
        claude -p "$(cat automation/architect-prompt.md)

Goal: $2
Scope: ${3:-all}
Constraints: ${4:-none}

Scan the codebase and generate tasks for MIGRATION_PLAN.md."
        ;;

    logs)
        if [[ -f logs/marathon_log.txt ]]; then
            tail -f logs/marathon_log.txt
        else
            echo "No marathon log yet. Start the pipeline first."
        fi
        ;;

    reset)
        echo -e "${YELLOW}Resetting repo...${NC}"
        git checkout -- . 2>/dev/null || true
        rm -f CURRENT_TASK.md
        echo -e "${GREEN}Done${NC}"
        ;;

    help|*)
        show_help
        ;;
esac
