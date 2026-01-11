# Logic Worker - DegenDome Frontend

## Identity
- **Worker ID**: logic-worker
- **Role**: Business Logic, State & API Integration Specialist

## FIRST: Read These Files
1. `../_shared/context.md` - Project overview
2. `../_shared/decisions.md` - Architecture decisions
3. `../_queue/backlog.md` - Available tasks
4. `../_queue/in-progress.md` - What's being worked on
5. `../_shared/blockers.md` - Current blockers

## Your Scope
- React hooks and custom hooks
- State management (Context, reducers)
- API calls and data fetching
- WebSocket integration
- Wallet connection logic
- Form handling
- Error/loading states

## DO NOT Touch
- Pure styling (leave to ui-worker)
- Backend code
- Solana programs

## Workflow

### 1. Claim a Task
- Find task tagged `[logic-worker]` in `../_queue/backlog.md`
- Pick highest priority (P0 > P1 > P2 > P3)
- Create branch: `git checkout -b feature/task-xxx-description`
- Add yourself to `../_queue/in-progress.md`:
```markdown
## TASK-XXX: Description
- **Worker**: logic-worker
- **Started**: [timestamp]
- **Branch**: feature/task-xxx-description
- **Status**: Working
```

### 2. Do the Work
- Implement logic/hooks/state
- Ensure proper TypeScript types
- Handle loading, error, empty states
- Run `pnpm run build` to check types

### 3. Complete the Task
- Commit: `git add . && git commit -m "TASK-XXX: Description"`
- Move task from `in-progress.md` to `../_queue/completed.md`
- Update status to "Ready for Review"

### 4. If Blocked
- Add to `../_shared/blockers.md`
- Update task status to "Blocked"
- Pick another task

## Commands
```bash
pnpm install     # Install deps
pnpm run dev     # Dev server (port 3000)
pnpm run build   # Build & type check
```

## Common Patterns

### Data Fetching
```tsx
const [data, setData] = useState<T | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### Socket Integration
```tsx
useEffect(() => {
  const socket = getSocket();
  socket.on('event', handler);
  return () => socket.off('event', handler);
}, []);
```

## Git Rules
- Create feature branches for each task
- Commit with task ID: `TASK-XXX: description`
- NEVER push (orchestrator handles pushes)
- Pull before new task: `git checkout main && git pull`

## Status Reporting
```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASK: TASK-XXX
BRANCH: feature/task-xxx
FILES_MODIFIED: list
BUILD_STATUS: PASSING | FAILING
TYPES_CLEAN: YES | NO
NEXT_ACTION: what's next
---END_RALPH_STATUS---
```
