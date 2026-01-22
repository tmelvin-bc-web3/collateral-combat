# Roadmap: Sol-Battles

## Milestones

- [x] **v1.0 Mainnet Launch** - Phases 1-4 (shipped 2026-01-22)
- [ ] **v1.1 Code & Security Audit** - Phases 5-9 (in progress)

## Phases

<details>
<summary>v1.0 Mainnet Launch (Phases 1-4) - SHIPPED 2026-01-22</summary>

### Phase 1: Security Hardening
**Goal**: Eliminate race conditions and replay attacks
**Plans**: 4 plans (complete)

### Phase 2: UX Polish
**Goal**: Production-quality user experience
**Plans**: 5 plans (complete)

### Phase 3: Scheduled Matches
**Goal**: Solve cold-start player density problem
**Plans**: 3 plans (complete)

### Phase 4: Operations
**Goal**: Production monitoring and deployment automation
**Plans**: 6 plans (complete)

**Total v1.0:** 18 plans across 4 phases

</details>

## v1.1 Code & Security Audit (In Progress)

**Milestone Goal:** Comprehensive audit of codebase and smart contract for code quality and security before mainnet deployment.

**Phase Numbering:**
- Integer phases (5, 6, 7, 8, 9): Planned milestone work
- Decimal phases (e.g., 6.1): Urgent insertions if needed

- [x] **Phase 5: Automated Analysis** - Quick wins with zero-config tools ✓
- [x] **Phase 6: Smart Contract Audit** - On-chain security and correctness ✓
- [ ] **Phase 7: Backend Security** - Off-chain security hardening
- [ ] **Phase 8: Code Quality** - Cleanup informed by audit findings
- [ ] **Phase 9: Integration** - Cross-cutting concerns and economic model

## Phase Details

### Phase 5: Automated Analysis
**Goal**: Surface immediate issues using automated tools before manual review
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04
**Success Criteria** (what must be TRUE):
  1. All npm/pnpm/cargo audit findings documented with fix or explicit accept
  2. Secret scanning reports zero exposed secrets in repository history
  3. Dead code detection (Knip) reports zero unused exports/files/dependencies
  4. TypeScript type coverage measured with baseline established
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Dependency audits and secret scanning (AUTO-01, AUTO-02)
- [x] 05-02-PLAN.md — Dead code detection and type coverage (AUTO-03, AUTO-04)

### Phase 6: Smart Contract Audit
**Goal**: Document contract invariants and verify on-chain security
**Depends on**: Phase 5
**Requirements**: SC-01, SC-02, SC-03, SC-04
**Success Criteria** (what must be TRUE):
  1. All Sealevel attacks checked (signer, owner, reinitialization, overflow, PDA validation) with no vulnerabilities
  2. Round state machine verified: no invalid transitions, no double claims, correct payouts
  3. Pyth oracle integration verified: staleness checks exist, feed IDs validated, price manipulation resistant
  4. Authority/session key permissions documented: session keys verified CANNOT withdraw
  5. Contract invariants documented for backend consumption
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Sealevel attacks and access control audit (SC-01, SC-04)
- [x] 06-02-PLAN.md — Betting logic and oracle security audit (SC-02, SC-03)

### Phase 7: Backend Security
**Goal**: Verify backend correctly uses on-chain guarantees
**Depends on**: Phase 6 (contract invariants documented)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. All API parameters and WebSocket events validated against schema
  2. Wallet signature verification confirmed on all sensitive operations
  3. No TOCTOU race conditions in balance checking (verifyAndLockBalance pattern verified)
  4. Error handling reviewed: no sensitive data exposed, partial failures handled consistently
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Input validation (SEC-01) and auth/session security (SEC-02)
- [ ] 07-02-PLAN.md — Race conditions (SEC-03) and error handling (SEC-04)

### Phase 8: Code Quality
**Goal**: Clean, readable codebase with tight types (informed by audit findings)
**Depends on**: Phase 7 (security audit complete informs what to clean)
**Requirements**: CQ-01, CQ-02, CQ-03, CQ-04
**Success Criteria** (what must be TRUE):
  1. Zero dead/unused code (functions, exports, dependencies, files removed)
  2. No copy-paste patterns or DRY violations in business logic
  3. Variable/function names are clear and self-documenting
  4. Zero `any` types in application code (library boundaries excepted)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD (dead code removal and redundancy consolidation)
- [ ] 08-02: TBD (naming improvements and type safety)

### Phase 9: Integration
**Goal**: Verify cross-cutting concerns and economic model correctness
**Depends on**: Phase 8 (clean codebase makes integration testing reliable)
**Requirements**: INT-01, INT-02, INT-03
**Success Criteria** (what must be TRUE):
  1. On-chain/off-chain state consistency verified under failure scenarios
  2. Authority key security assessed with multi-sig plan documented
  3. Economic model verified: solvency invariants hold (total_payouts + fees <= total_pool)
**Plans**: TBD

Plans:
- [ ] 09-01: TBD (on-chain/off-chain sync verification)
- [ ] 09-02: TBD (authority security and economic model verification)

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 6 -> 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Security Hardening | v1.0 | 4/4 | Complete | 2026-01-22 |
| 2. UX Polish | v1.0 | 5/5 | Complete | 2026-01-22 |
| 3. Scheduled Matches | v1.0 | 3/3 | Complete | 2026-01-22 |
| 4. Operations | v1.0 | 6/6 | Complete | 2026-01-22 |
| 5. Automated Analysis | v1.1 | 2/2 | Complete | 2026-01-22 |
| 6. Smart Contract Audit | v1.1 | 2/2 | Complete | 2026-01-22 |
| 7. Backend Security | v1.1 | 0/2 | Not started | - |
| 8. Code Quality | v1.1 | 0/2 | Not started | - |
| 9. Integration | v1.1 | 0/2 | Not started | - |

---

*Roadmap created: 2026-01-22*
*v1.1 phases: 5-9 (5 phases, ~10 plans estimated)*
