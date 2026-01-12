# Architecture Decision Records

## ADR-001: Pipeline Architecture

**Status**: Accepted

**Context**: Need automated task execution with quality gates.

**Decision**: Implement Manager/Worker/Supervisor pattern:
- Manager: Long-running dispatcher
- Worker: Single-task, dies after completion
- Supervisor: Verification gate (verify.sh)

**Consequences**: Fresh context per task, parallel-safe.

---

## ADR-002: Task Locking

**Status**: Accepted

**Context**: Multiple workers could claim same task.

**Decision**: Use file-based locking in MIGRATION_PLAN.md:
- `[ ]` - unclaimed
- `[@wN]` - claimed by worker N
- `[x]` - completed
- `[!]` - failed

**Consequences**: Simple, human-readable, git-friendly.

---

## ADR-003: Verification Gate

**Status**: Accepted

**Context**: Need to ensure code quality before commits.

**Decision**: verify.sh runs:
1. TypeScript compilation
2. Lint checks
3. Security scans
4. Test suite (when applicable)

**Consequences**: Failed verification = retry or fail task.
