# Requirements: Sol-Battles v1.1 Code & Security Audit

**Defined:** 2026-01-22
**Core Value:** Players can confidently bet against each other on price predictions with fair, transparent, on-chain settlement.

## v1.1 Requirements

Requirements for pre-mainnet audit milestone. Each maps to roadmap phases.

### Automated Analysis

- [x] **AUTO-01**: Run dependency audits (npm audit, pnpm audit, cargo audit) and fix/document all findings ✓
- [x] **AUTO-02**: Run secret scanning (Gitleaks, TruffleHog) and remediate any exposed secrets ✓
- [x] **AUTO-03**: Run dead code detection (Knip) and remove unused code, exports, dependencies ✓
- [x] **AUTO-04**: Measure TypeScript type coverage and improve to target threshold ✓

### Smart Contract Audit

- [x] **SC-01**: Audit for Sealevel attacks (missing signer/owner checks, reinitialization, integer overflow, PDA validation) ✓
- [x] **SC-02**: Audit betting logic (round state machine, double claim prevention, payout calculations) ✓
- [x] **SC-03**: Audit oracle security (Pyth integration, staleness checks, price manipulation resistance) ✓
- [x] **SC-04**: Audit authority/access controls (authority key usage, session key isolation, privilege escalation) ✓

### Backend Security

- [x] **SEC-01**: Audit input validation (API parameters, WebSocket events, user inputs sanitization) ✓
- [x] **SEC-02**: Audit auth/session (wallet signature verification, session key management) ✓
- [x] **SEC-03**: Audit race conditions (concurrent requests, balance checks, TOCTOU vulnerabilities) ✓
- [x] **SEC-04**: Audit error handling (error exposure, partial failure recovery, state consistency) ✓

### Code Quality

- [ ] **CQ-01**: Remove dead/unused code (functions, exports, dependencies, files)
- [ ] **CQ-02**: Consolidate redundant logic (reduce copy-paste patterns, DRY violations)
- [ ] **CQ-03**: Improve naming/readability (variable/function names, clarifying comments where needed)
- [ ] **CQ-04**: Improve type safety (remove 'any' types, tighten TypeScript strict mode compliance)

### Integration

- [ ] **INT-01**: Verify on-chain/off-chain sync (backend correctly uses on-chain guarantees, state consistency)
- [ ] **INT-02**: Assess authority key security (single-authority risk, plan/implement multi-sig)
- [ ] **INT-03**: Verify economic model (solvency invariants, fee calculations, pool accounting)

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Post-Audit

- **DEPLOY-01**: Deploy to Solana mainnet-beta
- **DEPLOY-02**: User acquisition (first 100 real users)
- **DEPLOY-03**: Iteration based on production feedback

### External Audit

- **EXT-01**: Professional security audit (recommended after 30+ days stable operation)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Formal verification | Too time-intensive for this milestone; consider for v2 |
| Fuzzing (Trident) | Optional if critical issues found; not required for baseline audit |
| Multi-sig implementation | Planning/assessment only this milestone; implementation deferred |
| New feature development | Audit-only milestone; no new functionality |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTO-01 | Phase 5 | Pending |
| AUTO-02 | Phase 5 | Pending |
| AUTO-03 | Phase 5 | Pending |
| AUTO-04 | Phase 5 | Pending |
| SC-01 | Phase 6 | Complete |
| SC-02 | Phase 6 | Complete |
| SC-03 | Phase 6 | Complete |
| SC-04 | Phase 6 | Complete |
| SEC-01 | Phase 7 | Complete |
| SEC-02 | Phase 7 | Complete |
| SEC-03 | Phase 7 | Complete |
| SEC-04 | Phase 7 | Complete |
| CQ-01 | Phase 8 | Pending |
| CQ-02 | Phase 8 | Pending |
| CQ-03 | Phase 8 | Pending |
| CQ-04 | Phase 8 | Pending |
| INT-01 | Phase 9 | Pending |
| INT-02 | Phase 9 | Pending |
| INT-03 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 after roadmap creation*
