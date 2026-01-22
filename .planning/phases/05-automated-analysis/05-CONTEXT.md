# Phase 5: Automated Analysis - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Run automated security/quality tools (dependency audits, secret scanning, dead code detection, type coverage) and document findings before manual review. Establish baselines and CI gates to prevent regressions.

</domain>

<decisions>
## Implementation Decisions

### Finding disposition
- Fix critical and high severity dependency vulnerabilities
- Accept medium/low vulnerabilities with justification
- Remove most dead code, but keep anything that's clearly WIP (work-in-progress features)
- For secrets found in git history: rotate credentials AND scrub history (BFG/filter-repo)
- Accepted findings require BOTH: inline comment explaining why + entry in audit report

### Report location
- Audit reports live in `.planning/audits/`
- Single markdown file per audit run (e.g., `AUDIT-2026-01-22.md`)
- Report contains: findings, fixes applied, accepted risks with justification
- No raw tool output preserved - re-run tools if detailed logs needed

### Type coverage baseline
- Measure current state as baseline (no arbitrary threshold to start)
- Target: 100% type coverage by end of Phase 8 (zero `any` in application code)
- Measurement tool: `type-coverage` npm package
- Exclusions: test files, build scripts, auto-generated code (Anchor types, etc.)

### CI integration
- All checks become PR-blocking CI gates after this phase
- All checks must pass to merge: dependencies, secrets, dead code, type coverage
- Type coverage enforced as "no regression from baseline" initially, then "meet target" in Phase 8

### Claude's Discretion
- Choice of CI platform (GitHub Actions vs Vercel CI vs other)
- Specific tool versions and configurations
- Exact structure of audit report markdown
- How to handle edge cases in dead code detection

</decisions>

<specifics>
## Specific Ideas

- "Rotate + scrub" approach for secrets is non-negotiable - full cleanup of git history
- Both inline comments AND report entries for accepted findings ensures nothing gets lost
- Type coverage target of 100% aligns with Phase 8 success criteria ("Zero `any` types in application code")

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 05-automated-analysis*
*Context gathered: 2026-01-22*
