# Audit Tools Research

**Project:** Sol-Battles (DegenDome)
**Researched:** 2026-01-22
**Focus:** Code quality and security audit tools for TypeScript/Node.js and Solana/Anchor

---

## TypeScript/Node.js Code Quality

### 1. Knip - Dead Code Detection

**Recommendation:** PRIMARY TOOL for dead code elimination

**What it detects:**
- Unused files (never imported)
- Unused exports (dead code paths)
- Unused dependencies in package.json
- Unused devDependencies
- Missing dependencies (transitive dependency usage)
- Duplicate exports
- Unused class members and enum members

**Installation:**
```bash
# In web/ directory
pnpm add -D knip

# In backend/ directory
npm install -D knip
```

**Usage:**
```bash
# Run analysis (no config needed - auto-detects Next.js, Node.js)
npx knip

# Show detailed report
npx knip --reporter=compact

# Include only specific issue types
npx knip --include=files,exports,dependencies

# Fix auto-fixable issues (removes unused exports)
npx knip --fix
```

**Configuration (optional - knip.json):**
```json
{
  "entry": ["src/index.ts", "src/app/**/page.tsx"],
  "project": ["src/**/*.{ts,tsx}"],
  "ignore": ["**/*.test.ts", "**/*.spec.ts"]
}
```

**Why Knip over alternatives:**
- Active development (vs. deprecated ts-prune)
- Framework-aware (Next.js, Express plugins built-in)
- Dependency analysis included (not just code)
- Fast: Rust-based performance

**Source:** [Knip Official](https://knip.dev), [Effective TypeScript](https://effectivetypescript.com/2023/07/29/knip/)

---

### 2. type-coverage - TypeScript Type Coverage

**Recommendation:** Track `any` usage and type safety progress

**What it detects:**
- Identifiers with `any` type
- Type coverage percentage
- Progress tracking for strict mode migration

**Installation:**
```bash
pnpm add -D type-coverage
# or
npm install -D type-coverage
```

**Usage:**
```bash
# Basic type coverage report
npx type-coverage

# Detailed output showing all any usages
npx type-coverage --detail

# Set minimum threshold (fail if below)
npx type-coverage --at-least 90

# Ignore catch clause any (TypeScript limitation)
npx type-coverage --ignore-catch --at-least 95

# JSON output for CI integration
npx type-coverage --json-output coverage.json
```

**CI Integration:**
```bash
# Add to package.json scripts
"scripts": {
  "type-coverage": "type-coverage --at-least 85"
}
```

**Source:** [type-coverage npm](https://www.npmjs.com/package/type-coverage), [GitHub](https://github.com/plantain-00/type-coverage)

---

### 3. ESLint Complexity Rules - Code Complexity Analysis

**Recommendation:** Use existing ESLint with complexity rules enabled

**What it detects:**
- Cyclomatic complexity (number of code paths)
- Cognitive complexity (how hard code is to understand)
- Function length
- Nesting depth

**Configuration (.eslintrc.js):**
```javascript
module.exports = {
  rules: {
    // Cyclomatic complexity - max paths through function
    'complexity': ['warn', { max: 10 }],

    // Max lines per function
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],

    // Max nesting depth
    'max-depth': ['warn', { max: 4 }],

    // Max parameters
    'max-params': ['warn', { max: 4 }],

    // Max statements per function
    'max-statements': ['warn', { max: 15 }]
  }
};
```

**Usage:**
```bash
# Run with complexity rules
npx eslint src/ --rule 'complexity: [warn, 10]'

# Generate report
npx eslint src/ -f json -o complexity-report.json
```

**Advanced Option - ESLintCC:**
For detailed complexity reports with grades (A-F ranking):
```bash
npm install -D eslintcc
npx eslintcc src/
```

**Source:** [ESLint complexity rule](https://eslint.org/docs/latest/rules/complexity), [ESLintCC](https://eslintcc.github.io/)

---

## TypeScript/Node.js Security

### 1. npm audit - Dependency Vulnerabilities

**Recommendation:** ALWAYS RUN FIRST - built-in, zero config

**What it detects:**
- Known CVEs in dependencies
- Severity levels (low, moderate, high, critical)
- Remediation paths

**Usage:**
```bash
# Basic audit
npm audit

# JSON output for processing
npm audit --json

# Only show vulnerabilities at or above a level
npm audit --audit-level=high

# Auto-fix where possible
npm audit fix

# Force major version updates (review carefully)
npm audit fix --force
```

**For pnpm (web/):**
```bash
pnpm audit
pnpm audit --fix
```

**Source:** Built-in npm/pnpm feature

---

### 2. eslint-plugin-security - Code Pattern Security

**Recommendation:** ADD to existing ESLint setup

**What it detects:**
- `eval()` usage (detect-eval)
- Child process injection (detect-child-process)
- RegExp DoS (detect-unsafe-regex)
- Object injection (detect-object-injection)
- Non-literal requires (detect-non-literal-require)
- Pseudo-random number usage in security contexts (detect-pseudoRandomBytes)
- SQL injection patterns
- Path traversal vulnerabilities

**Installation:**
```bash
npm install -D eslint-plugin-security
```

**Configuration (.eslintrc.js):**
```javascript
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended-legacy'],
  // Or for flat config (ESLint 9+):
  // extends: ['plugin:security/recommended']
};
```

**Usage:**
```bash
npx eslint src/ --plugin security
```

**Note:** According to recent analysis, eslint-plugin-security covers about 14 security rules. For more comprehensive coverage, consider pairing with Semgrep.

**Source:** [eslint-plugin-security npm](https://www.npmjs.com/package/eslint-plugin-security)

---

### 3. Semgrep - Advanced Static Security Analysis

**Recommendation:** COMPREHENSIVE security scanning (covers more than ESLint)

**What it detects:**
- OWASP Top 10 vulnerabilities
- Injection flaws (SQL, NoSQL, Command, XSS)
- Insecure configurations
- Hardcoded secrets
- Authentication/authorization issues
- Taint analysis across functions
- Framework-specific issues (Express, Socket.IO)

**Installation:**
```bash
# macOS
brew install semgrep

# Or via pip
pip install semgrep
```

**Usage:**
```bash
# Run with recommended Node.js security rules
semgrep --config=p/nodejs src/

# Run with JavaScript security rules
semgrep --config=p/javascript src/

# Run with OWASP Top 10 rules
semgrep --config=p/owasp-top-ten src/

# Multiple rulesets
semgrep --config=p/nodejs --config=p/security-audit src/

# JSON output for CI
semgrep --config=p/nodejs --json -o semgrep-results.json src/

# Specific ESLint-security rules (subset)
semgrep --config=p/eslint-plugin-security src/
```

**Key Rulesets for this project:**
- `p/nodejs` - Node.js specific security
- `p/typescript` - TypeScript patterns
- `p/javascript` - General JS security
- `p/owasp-top-ten` - OWASP vulnerabilities
- `p/security-audit` - Comprehensive security audit

**Limitations:**
- Does NOT use TypeScript compiler for type information
- Pattern-based, not deep data flow analysis
- May have false positives

**Source:** [Semgrep Documentation](https://semgrep.dev/docs/), [JavaScript Guide](https://semgrep.dev/docs/languages/javascript)

---

### 4. Gitleaks + TruffleHog - Secret Detection

**Recommendation:** Use BOTH - they find different secrets

**What they detect:**
- API keys
- Private keys (including Solana keypairs)
- Passwords in code
- AWS credentials
- JWT secrets
- Database connection strings
- Environment variable leaks

**Gitleaks Installation:**
```bash
# macOS
brew install gitleaks

# Or download binary from releases
```

**Gitleaks Usage:**
```bash
# Scan current directory
gitleaks detect --source . -v

# Scan git history
gitleaks detect --source . --log-opts="--all"

# Scan with baseline (ignore known)
gitleaks detect --source . --baseline-path .gitleaks-baseline.json

# JSON output
gitleaks detect --source . -f json -r gitleaks-report.json
```

**TruffleHog Installation:**
```bash
# macOS
brew install trufflehog

# Or via pip
pip install trufflehog
```

**TruffleHog Usage:**
```bash
# Scan filesystem
trufflehog filesystem .

# Scan git history (more thorough)
trufflehog git file://. --only-verified

# Scan specific branch
trufflehog git file://. --branch main

# JSON output
trufflehog filesystem . --json > trufflehog-results.json
```

**Why both tools:**
- Research shows they find different unique secrets
- Gitleaks: faster, good for CI
- TruffleHog: verifies if secrets are live, deeper scanning

**Source:** [TruffleHog GitHub](https://github.com/trufflesecurity/trufflehog), [Gitleaks Best Practices](https://www.aikido.dev/blog/top-secret-scanning-tools)

---

## Solana/Anchor Security

### 1. sec3 X-Ray Scanner - Automated Vulnerability Detection

**Recommendation:** PRIMARY TOOL for Solana smart contract security

**What it detects:**
- 50+ vulnerability types including:
  - Missing signer checks
  - Missing owner validation
  - Arithmetic overflow/underflow
  - PDA validation issues
  - Flash loan vulnerabilities
  - Account validation flaws
  - Cross-program invocation risks
  - All Neodyme common pitfalls
  - Insecure Anchor usage patterns (sealevel-attacks)

**Installation:**
```bash
# Option 1: Docker (RECOMMENDED - cross-platform)
docker pull ghcr.io/sec3-product/x-ray:latest

# Option 2: Script install (Linux only)
sh -c "$(curl -k https://supercompiler.xyz/install)"
```

**Usage:**
```bash
# Docker (recommended for macOS)
cd programs/session_betting
docker run --rm --volume "$(pwd):/workspace" ghcr.io/sec3-product/x-ray:latest /workspace

# If using native install
x-ray .
x-ray -analyzeAll .

# Verify installation
docker run --rm ghcr.io/sec3-product/x-ray:latest -version
```

**Output:** Generates report with vulnerability findings, severity levels, and remediation guidance.

**Source:** [sec3 X-Ray GitHub](https://github.com/sec3-product/x-ray), [sec3 Documentation](https://doc.sec3.dev/)

---

### 2. cargo-audit - Rust Dependency Vulnerabilities

**Recommendation:** ALWAYS RUN - checks RustSec Advisory Database

**What it detects:**
- Known CVEs in Cargo dependencies
- Deprecated crates
- Unmaintained crates
- Yanked versions

**Installation:**
```bash
cargo install cargo-audit
```

**Usage:**
```bash
cd programs/session_betting

# Basic audit
cargo audit

# JSON output
cargo audit --json

# Fix vulnerabilities (update Cargo.lock)
cargo audit fix

# Ignore specific advisories
cargo audit --ignore RUSTSEC-2024-XXXX
```

**Source:** [cargo-audit crate](https://docs.rs/cargo-audit), [RustSec Database](https://rustsec.org/)

---

### 3. cargo-clippy - Rust Code Quality

**Recommendation:** Run with ALL warnings for audit

**What it detects:**
- 450+ lint rules
- Common mistakes
- Inefficient patterns
- Unsafe code patterns
- Missing error handling
- Potential panics

**Usage:**
```bash
cd programs/session_betting

# Standard run
cargo clippy

# Pedantic mode (more warnings)
cargo clippy -- -W clippy::pedantic

# Deny all warnings (fail on any issue)
cargo clippy -- -D warnings

# Specific Solana/security relevant lints
cargo clippy -- \
  -W clippy::unwrap_used \
  -W clippy::expect_used \
  -W clippy::panic \
  -W clippy::arithmetic_side_effects \
  -W clippy::integer_division
```

**Source:** [Clippy Documentation](https://doc.rust-lang.org/clippy/)

---

### 4. Trident - Fuzzing Framework (ADVANCED)

**Recommendation:** Use for deep testing if time permits

**What it detects:**
- Edge-case vulnerabilities
- Unexpected state transitions
- Logic errors under random inputs
- Crash conditions
- Assertion failures

**Installation:**
```bash
cargo install trident-cli
```

**Usage:**
```bash
cd programs/session_betting

# Initialize fuzzing setup
trident init

# Run fuzzer
trident fuzz run

# Run for specific duration
trident fuzz run --timeout 3600
```

**Note:** Requires test writing. Good for critical functions like:
- `settle_round`
- `credit_winnings`
- `transfer_to_global_vault`

**Source:** [Trident GitHub](https://github.com/Ackee-Blockchain/trident), [Trident Documentation](https://ackee.xyz/trident/docs/0.6.0/)

---

## Recommended Workflow

### Phase 1: Quick Wins (Run First)

These tools require no configuration and surface immediate issues:

```bash
# 1. Dependency vulnerabilities (both TypeScript projects)
cd web && pnpm audit
cd backend && npm audit
cd programs/session_betting && cargo audit

# 2. Secret scanning (entire repo)
gitleaks detect --source . -v
trufflehog filesystem .
```

### Phase 2: Code Quality Analysis

```bash
# 3. Dead code detection
cd web && npx knip
cd backend && npx knip

# 4. Type coverage
cd web && npx type-coverage --detail
cd backend && npx type-coverage --detail

# 5. Complexity analysis
cd web && npx eslint src/ --rule 'complexity: [warn, 10]' --rule 'max-depth: [warn, 4]'
cd backend && npx eslint src/ --rule 'complexity: [warn, 10]' --rule 'max-depth: [warn, 4]'
```

### Phase 3: Security Scanning

```bash
# 6. ESLint security rules
cd backend && npx eslint src/ --plugin security --ext .ts

# 7. Semgrep comprehensive scan
semgrep --config=p/nodejs --config=p/owasp-top-ten backend/src/
semgrep --config=p/javascript --config=p/typescript web/src/

# 8. Solana contract security
cd programs/session_betting
docker run --rm --volume "$(pwd):/workspace" ghcr.io/sec3-product/x-ray:latest /workspace
cargo clippy -- -W clippy::pedantic -W clippy::unwrap_used
```

### Phase 4: Deep Analysis (If Issues Found)

```bash
# 9. If critical smart contract functions identified
cd programs/session_betting
trident init
trident fuzz run --timeout 1800

# 10. Git history secret scan
trufflehog git file://. --only-verified
```

---

## Tool Installation Summary

### Backend (npm)
```bash
cd backend
npm install -D knip type-coverage eslint-plugin-security
```

### Frontend (pnpm)
```bash
cd web
pnpm add -D knip type-coverage
```

### System Tools
```bash
# macOS
brew install gitleaks trufflehog semgrep

# Rust tools
cargo install cargo-audit trident-cli
```

### Docker
```bash
docker pull ghcr.io/sec3-product/x-ray:latest
```

---

## CI Integration Script

Create `.github/workflows/security-audit.yml`:

```yaml
name: Security Audit

on:
  pull_request:
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: npm audit (backend)
        run: cd backend && npm audit --audit-level=high

      - name: pnpm audit (web)
        run: cd web && pnpm audit

      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2

      - name: Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/nodejs p/owasp-top-ten

      - name: Cargo audit
        run: |
          cargo install cargo-audit
          cd programs/session_betting && cargo audit
```

---

## Summary Table

| Tool | Category | What It Finds | Confidence |
|------|----------|---------------|------------|
| **Knip** | Code Quality | Dead code, unused deps | HIGH |
| **type-coverage** | Code Quality | Type safety gaps | HIGH |
| **ESLint complexity** | Code Quality | Complex functions | HIGH |
| **npm/pnpm audit** | Security | Dependency CVEs | HIGH |
| **eslint-plugin-security** | Security | Code patterns | MEDIUM |
| **Semgrep** | Security | OWASP, injection | MEDIUM |
| **Gitleaks** | Security | Leaked secrets | HIGH |
| **TruffleHog** | Security | Leaked secrets (verified) | HIGH |
| **sec3 X-Ray** | Smart Contract | 50+ Solana vulns | HIGH |
| **cargo-audit** | Smart Contract | Rust dep CVEs | HIGH |
| **cargo-clippy** | Smart Contract | Rust code quality | HIGH |
| **Trident** | Smart Contract | Edge-case bugs | MEDIUM |

---

## Sources

### TypeScript/Node.js
- [Knip](https://knip.dev) - Dead code detection
- [type-coverage](https://github.com/plantain-00/type-coverage) - Type safety
- [ESLint complexity](https://eslint.org/docs/latest/rules/complexity) - Complexity rules
- [eslint-plugin-security](https://www.npmjs.com/package/eslint-plugin-security) - Security patterns
- [Semgrep](https://semgrep.dev) - Static analysis
- [Gitleaks](https://github.com/gitleaks/gitleaks) - Secret scanning
- [TruffleHog](https://github.com/trufflesecurity/trufflehog) - Secret detection

### Solana/Anchor
- [sec3 X-Ray](https://github.com/sec3-product/x-ray) - Vulnerability scanner
- [cargo-audit](https://docs.rs/cargo-audit) - Dependency audit
- [Trident](https://github.com/Ackee-Blockchain/trident) - Fuzz testing
- [RustSec](https://rustsec.org/) - Advisory database
