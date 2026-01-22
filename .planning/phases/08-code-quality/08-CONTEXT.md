# Phase 8: Code Quality - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean, readable codebase with tight types — informed by audit findings from Phases 5-7. Remove dead code, consolidate duplications, improve naming, eliminate `any` types. No new features or capabilities.

</domain>

<decisions>
## Implementation Decisions

### Dead code scope
- **WIP features kept:** LDS, Token Wars, Draft, Referrals stay in codebase — they'll be completed later. Only remove truly dead code.
- **Unused exports:** Claude's discretion — review each case, remove clear dead code, keep anything potentially useful
- **File removal:** Claude's discretion — evaluate file-by-file based on references
- **Legacy services:** Claude investigates whether predictionService.ts is still used or if predictionServiceOnChain.ts has fully replaced it

### DRY/consolidation approach
- **Extraction threshold:** Claude's discretion — judge based on complexity and likelihood of divergence (not strict rule of N duplicates)
- **Utility location:** Claude follows existing patterns (utils/ folders) and organizes logically
- **Service consolidation:** Claude evaluates whether consolidating similar game mode managers adds value or just complexity
- **Error handling:** Claude evaluates which error paths would benefit most from toApiError() adoption

### Naming conventions
- **Service/Manager naming:** Claude evaluates what makes sense semantically — no forced standardization
- **Variable naming:** Claude renames only where it significantly improves readability — avoid unnecessary churn
- **Patterns:** Follow standard TypeScript/React conventions and match existing codebase patterns

### Type safety strictness
- **Coverage target:** Claude improves where practical without major refactors — focus on value, not arbitrary percentage
- **Library boundaries:** Claude chooses approach (wrappers, assertions, or accept) based on frequency of use and risk
- **Runtime validation:** Claude adds Zod schemas for high-risk inputs (money/auth), skips low-risk

### Claude's Discretion
User explicitly delegated most decisions to Claude's judgment. Key areas of flexibility:
- Which unused exports to remove vs keep
- Whether to delete entire files or just exports
- When duplicated logic warrants extraction
- Service/Manager naming standardization
- Extent of variable/function renaming
- Type coverage improvement scope
- Zod schema addition scope

</decisions>

<specifics>
## Specific Ideas

**From Phase 5-7 findings:**
- Phase 5.2: 95 unused exports (web), 116 unused exports (backend) — review and clean
- Phase 5.2: Backend type coverage at 90.67% needs improvement (goal: 95%+)
- Phase 7.1: Battle config validation deferred to this phase for Zod schema
- Phase 7.2: toApiError() sanitization is underutilized — consider broader adoption
- Phase 7.2: Typed error adoption deferred to this phase

**Existing infrastructure to leverage:**
- Knip (dead code detection) — already configured in Phase 5.2
- type-coverage tool — already configured with baselines
- toApiError() in backend/src/utils/errors.ts — ready for broader adoption

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-code-quality*
*Context gathered: 2026-01-22*
