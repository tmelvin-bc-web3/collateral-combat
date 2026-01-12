# Ralph config for sol-battles
# All paths are relative to repo root unless absolute.

# Use Claude as the agent
AGENT_CMD="claude -p --dangerously-skip-permissions \"\$(cat {prompt})\""
PRD_AGENT_CMD="claude --dangerously-skip-permissions {prompt}"

# Paths
PRD_PATH=".agents/tasks/prd.md"
PLAN_PATH=".ralph/IMPLEMENTATION_PLAN.md"
PROGRESS_PATH=".ralph/progress.md"

# Settings
MAX_ITERATIONS=25
NO_COMMIT=false
