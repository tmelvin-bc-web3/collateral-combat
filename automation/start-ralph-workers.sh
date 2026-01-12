#!/bin/bash
# Start all Ralph workers in parallel using tmux
# Usage: ./start-ralph-workers.sh [max_iterations]

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

MAX_ITERATIONS="${1:-5}"
SESSION_NAME="ralph-workers"
WORKER_SCRIPT="$PROJECT_DIR/automation/ralph-worker.sh"
NOTIFY_SCRIPT="$PROJECT_DIR/automation/notify.sh"

# Check tmux
if ! command -v tmux &> /dev/null; then
  echo "Error: tmux is required. Install with: brew install tmux"
  exit 1
fi

# Kill existing session if running
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

echo "════════════════════════════════════════════════════"
echo "  Starting Ralph Workers (parallel)"
echo "  Max iterations per worker: $MAX_ITERATIONS"
echo "════════════════════════════════════════════════════"

# Send startup notification
if [[ -f "$NOTIFY_SCRIPT" ]]; then
  bash "$NOTIFY_SCRIPT" pipeline_start "all-workers" "Starting 4 parallel workers" 2>/dev/null || true
fi

# Create tmux session with 4 panes
tmux new-session -d -s "$SESSION_NAME" -n "workers"

# Split into 4 panes (2x2 grid)
tmux split-window -h -t "$SESSION_NAME"
tmux split-window -v -t "$SESSION_NAME:0.0"
tmux split-window -v -t "$SESSION_NAME:0.1"

# Start each worker in a pane (using separate PRDs for parallel execution)
# Worker 1: Main PRD (US-001 done, continues with remaining)
tmux send-keys -t "$SESSION_NAME:0.0" "ralph build $MAX_ITERATIONS --prd .agents/tasks/prd.md" C-m
# Worker 2: Smart contracts (requires Solana MCP)
tmux send-keys -t "$SESSION_NAME:0.1" "ralph build $MAX_ITERATIONS --prd .agents/tasks/prd-contracts.md" C-m
# Worker 3: Frontend stories
tmux send-keys -t "$SESSION_NAME:0.2" "ralph build $MAX_ITERATIONS --prd .agents/tasks/prd-frontend.md" C-m
# Worker 4: Additional frontend iterations
tmux send-keys -t "$SESSION_NAME:0.3" "ralph build $MAX_ITERATIONS --prd .agents/tasks/prd-frontend.md" C-m

echo ""
echo "Workers started in tmux session: $SESSION_NAME"
echo ""
echo "Commands:"
echo "  tmux attach -t $SESSION_NAME    # View workers"
echo "  tmux kill-session -t $SESSION_NAME  # Stop all workers"
echo "  Ctrl+B then D                   # Detach from session"
echo ""

# Attach to session
tmux attach -t "$SESSION_NAME"
