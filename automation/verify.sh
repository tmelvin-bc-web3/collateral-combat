#!/bin/bash
# Verification Script - QA Gate
# Usage: ./verify.sh <task_id> [mode]
# Modes: quick (default), full

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
TASK_ID="${1:-manual}"
MODE="${2:-quick}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

log_check() { echo -e "${YELLOW}[$1]${NC} $2"; }
log_pass() { echo -e "${GREEN}✓${NC} $1"; }
log_fail() { echo -e "${RED}✗${NC} $1"; ((ERRORS++)); }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; ((WARNINGS++)); }

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Verification: $TASK_ID ($MODE mode)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# 1. Backend TypeScript
log_check "1/5" "Backend TypeScript"
if [[ -d "$PROJECT_DIR/backend" ]]; then
    cd "$PROJECT_DIR/backend"
    if npm run typecheck 2>&1 | grep -q "error TS"; then
        log_fail "Backend TypeScript errors"
    else
        log_pass "Backend TypeScript compiles"
    fi
    cd "$PROJECT_DIR"
else
    log_warn "Backend directory not found"
fi

# 2. Frontend TypeScript
log_check "2/5" "Frontend Build"
if [[ -d "$PROJECT_DIR/web" ]]; then
    cd "$PROJECT_DIR/web"
    if pnpm exec tsc --noEmit 2>&1 | grep -q "error TS"; then
        log_fail "Frontend TypeScript errors"
    else
        log_pass "Frontend TypeScript compiles"
    fi
    cd "$PROJECT_DIR"
else
    log_warn "Web directory not found"
fi

# 3. Lint (non-blocking in quick mode)
log_check "3/5" "Lint"
if [[ -d "$PROJECT_DIR/web" ]]; then
    cd "$PROJECT_DIR/web"
    LINT_OUTPUT=$(pnpm lint 2>&1 || true)
    LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c "error" 2>/dev/null || echo "0")
    LINT_ERRORS=$(echo "$LINT_ERRORS" | tr -d '\n' | tr -d ' ')
    if [[ "$LINT_ERRORS" -gt 0 ]]; then
        if [[ "$MODE" == "full" ]]; then
            log_fail "Lint errors: $LINT_ERRORS"
        else
            log_warn "Lint warnings (non-blocking)"
        fi
    else
        log_pass "Lint clean"
    fi
    cd "$PROJECT_DIR"
fi

# 4. Security check (look for exposed secrets)
log_check "4/5" "Security"
# Look for actual hardcoded secrets - strings that look like real API keys or passwords
# Exclude: process.env references, header names, variable declarations, comments
SECRETS_FOUND=$(grep -rE "(api[_-]?key|secret|password)\s*[:=]\s*['\"][a-zA-Z0-9_-]{20,}['\"]" \
    --include="*.ts" --include="*.tsx" --include="*.js" \
    "$PROJECT_DIR/web/src" "$PROJECT_DIR/backend/src" 2>/dev/null | \
    grep -vi "process\.env" | \
    grep -vi "example" | \
    grep -vi "placeholder" | \
    wc -l | tr -d ' ')

if [[ "$SECRETS_FOUND" -gt 0 ]]; then
    log_fail "Possible hardcoded secrets found"
else
    log_pass "No hardcoded secrets detected"
fi

# 5. TypeScript strict (any count)
log_check "5/5" "TypeScript Strict"
ANY_COUNT=$(grep -rE ":\s*any\b" --include="*.ts" --include="*.tsx" \
    "$PROJECT_DIR/web/src" "$PROJECT_DIR/backend/src" 2>/dev/null | wc -l | xargs)

if [[ "$ANY_COUNT" -gt 100 ]]; then
    if [[ "$MODE" == "full" ]]; then
        log_fail "'any' type count too high: $ANY_COUNT"
    else
        log_warn "'any' count: $ANY_COUNT (consider reducing)"
    fi
else
    log_pass "'any' count acceptable: $ANY_COUNT"
fi

# Summary
echo -e "${BLUE}═══════════════════════════════════════${NC}"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}  ✓ VERIFICATION PASSED${NC}"
    if [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}  ($WARNINGS warnings)${NC}"
    fi
    exit 0
else
    echo -e "${RED}  ✗ VERIFICATION FAILED ($ERRORS errors)${NC}"
    exit 1
fi
