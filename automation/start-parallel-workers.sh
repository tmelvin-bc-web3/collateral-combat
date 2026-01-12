#!/bin/bash
# Start Parallel Ralph Workers in tmux
# Usage: ./start-parallel-workers.sh [workers...]
#
# Default workers: frontend-lib frontend-ui
# Example: ./start-parallel-workers.sh backend frontend-lib frontend-ui

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKER_SCRIPT="$SCRIPT_DIR/ralph-parallel-worker.sh"
SESSION_NAME="ralph-workers"

# Default workers (skip contracts as they need Solana MCP)
WORKERS=("${@:-frontend-lib frontend-ui}")
if [[ $# -eq 0 ]]; then
  WORKERS=("frontend-lib" "frontend-ui")
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[launcher]${NC} $1"; }
log_success() { echo -e "${GREEN}[launcher]${NC} $1"; }
log_error() { echo -e "${RED}[launcher]${NC} $1"; }

# Check dependencies
if ! command -v tmux &> /dev/null; then
  log_error "tmux is required. Install with: brew install tmux"
  exit 1
fi

# Make worker script executable
chmod +x "$WORKER_SCRIPT"
chmod +x "$SCRIPT_DIR/ralph-queue.sh"

# Kill existing session if running
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  log "Killing existing session..."
  tmux kill-session -t "$SESSION_NAME"
fi

# Initialize queue
log "Initializing queue..."
"$SCRIPT_DIR/ralph-queue.sh" status

# Create new session with first worker
log "Starting tmux session: $SESSION_NAME"
cd "$PROJECT_DIR"

FIRST_WORKER="${WORKERS[0]}"
tmux new-session -d -s "$SESSION_NAME" -n "$FIRST_WORKER" \
  "bash -c 'cd $PROJECT_DIR && $WORKER_SCRIPT $FIRST_WORKER 10; read -p \"Press enter to close...\"'"

# Add windows for remaining workers
for ((i=1; i<${#WORKERS[@]}; i++)); do
  WORKER="${WORKERS[$i]}"
  tmux new-window -t "$SESSION_NAME" -n "$WORKER" \
    "bash -c 'cd $PROJECT_DIR && $WORKER_SCRIPT $WORKER 10; read -p \"Press enter to close...\"'"
  log "Added worker: $WORKER"
done

# Add a status window
tmux new-window -t "$SESSION_NAME" -n "status" \
  "bash -c 'cd $PROJECT_DIR && watch -n 10 $SCRIPT_DIR/ralph-queue.sh status'"

log_success "Started ${#WORKERS[@]} workers in tmux session: $SESSION_NAME"
echo ""
echo "Workers started:"
for w in "${WORKERS[@]}"; do
  echo "  - $w"
done
echo ""
echo "Commands:"
echo "  tmux attach -t $SESSION_NAME    # View workers"
echo "  tmux kill-session -t $SESSION_NAME  # Stop all workers"
echo "  $SCRIPT_DIR/ralph-queue.sh status   # Check queue"
echo ""

# Optionally attach
read -p "Attach to session? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  tmux attach -t "$SESSION_NAME"
fi
