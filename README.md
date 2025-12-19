# @roALAB1/manus-validation-kit

> A 6-layer production-ready validation and optimization system for AI-assisted development.

[![GitHub](https://img.shields.io/badge/install-from%20GitHub-blue)](https://github.com/roALAB1/manus-validation-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This validation kit goes far beyond traditional code linting. It provides a **6-layer defense system** that ensures your code is not just correct, but architecturally sound, scalable, and continuously improving.

### The 6 Layers

| Layer | Name | Purpose |
|-------|------|---------|
| **1** | Code Validation | 10 validators with consensus scoring |
| **2** | Skeptical Reasoning | Architectural soundness & scalability analysis |
| **3** | Learning Loop | Pattern detection & auto-fixing |
| **4** | Context Optimization | Cleanup, archival & compression |
| **5** | Token Efficiency | Code as API, Serena, Self-Spec, S²-MAD |
| **6** | **Codebase Audit** | Evidence-based bloat detection & cleanup |

## Installation

> **Important:** This package is installed directly from GitHub, not npm.

```bash
# npm
npm install "@roALAB1/manus-validation-kit@github:roALAB1/manus-validation-kit" --save-dev

# pnpm
pnpm add "@roALAB1/manus-validation-kit@github:roALAB1/manus-validation-kit" --save-dev

# yarn
yarn add "@roALAB1/manus-validation-kit@github:roALAB1/manus-validation-kit" --dev
```

## Quick Start

### Initialize in your project

```bash
npx manus-validate init
```

This creates a `.validation/` directory with default configuration.

### Run validation

```bash
# Run code validation (Layer 1)
npm run validate

# Run architectural analysis (Layer 2)
npm run validate:architecture

# Run all layers
npm run validate:all
```

## The 10 Validators (Layer 1)

| # | Validator | Weight | Purpose |
|---|-----------|--------|---------|
| 1 | Zod Schema Validation | 0.99 | API contract validation |
| 2 | Database Migration Check | 0.98 | SQL migration safety |
| 3 | TypeScript | 0.96 | Type checking |
| 4 | Biome | 0.94 | Fast linting |
| 5 | Jest Unit | 0.93 | Unit tests (80%+ coverage) |
| 6 | ESLint | 0.92 | Code quality |
| 7 | API Contract Test | 0.91 | API response validation |
| 8 | Docker Build Check | 0.90 | Container validation |
| 9 | Security Scan | 0.88 | Vulnerability scanning |
| 10 | Performance Check | 0.85 | Performance regression |

### Consensus Rule

An issue is flagged if:
- **2+ validators** agree on the same issue, OR
- A **single validator with weight > 0.95** flags it

## Skeptical Reasoning (Layer 2)

The skeptical reasoning engine asks the hard questions:

- "Will your database handle this at 10x scale?"
- "What happens when the cache goes down?"
- "What are you not thinking about?"

### What It Analyzes

1. **Architectural Critiques** - Design flaws before they bite you
2. **Scalability Phases** - When your architecture will break under load
3. **Blind Spots** - Risks you're not thinking about
4. **Tech Stack Validation** - Compatibility between components

### Example Output

```
═══════════════════════════════════════════════════════════════
  SKEPTICAL REASONING REPORT
═══════════════════════════════════════════════════════════════
  Recommendation: ⚠️ PROCEED-WITH-CAUTION
───────────────────────────────────────────────────────────────
  Readiness Score:    72/100
  Scalability Score:  65/100
  Architecture Score: 78/100
───────────────────────────────────────────────────────────────
  Critiques:    3
  Blind Spots:  5
  Tech Issues:  1
═══════════════════════════════════════════════════════════════

📋 Top Critiques:
  🔴 No Caching Layer Detected
     → Add Redis caching with appropriate TTL for frequently accessed data
  🟡 No Rate Limiting Detected
     → Implement rate limiting at API gateway or application level
```

## Learning Loop (Layer 3)

The learning loop tracks validation failures and detects patterns:

```bash
# Generate learning report
npm run validate:learn

# Apply auto-fixes for high-confidence patterns
npm run validate:learn -- --fix
```

### How It Works

1. **1st occurrence**: Logged
2. **2nd occurrence**: Pattern detected, suggestion generated
3. **3rd+ occurrence**: High confidence, auto-fix available

### Auto-Fix Criteria

A pattern becomes auto-fix ready when:
- **3+ occurrences** of the same pattern
- **80%+ fix success rate** on previous attempts

## Codebase Audit (Layer 6)

Evidence-based detection of unused code, dependencies, and bloat:

```bash
# Run full audit
npm run validate:audit

# Audit specific type
npm run validate:audit:deps    # Unused dependencies
npm run validate:audit:files   # Unused files

# Generate cleanup script
npx manus-validate audit --generate-cleanup
```

### What Gets Detected

| Type | Tool | Description |
|------|------|-------------|
| Unused Dependencies | depcheck | npm packages never imported |
| Unused Files | unimported | Files not reachable from entry points |
| Unused Exports | ts-prune | TypeScript exports never used |
| Duplicate Code | jscpd | Copy-pasted code blocks |
| Circular Dependencies | madge | Circular import chains |

### Confidence Levels

| Level | Score | Action |
|-------|-------|--------|
| 🔴 High | 80-100% | Safe to act on |
| 🟡 Medium | 60-79% | Needs human review |
| ⚪ Low | 0-59% | Do not auto-act |

### Key Principle: No Hallucination

Every finding includes **proof from a real tool**. The system never guesses.

See [docs/AUDIT_GUIDE.md](docs/AUDIT_GUIDE.md) for full documentation.

## Context Optimization (Layer 4)

Prevents context window bloat through automatic cleanup:

```bash
npm run validate:cleanup
```

### Cleanup Process

1. **Prune old failures** (older than 30 days)
2. **Remove low-confidence patterns** (< 3 occurrences AND < 20% fix rate)
3. **Archive old reports** (7+ days old)
4. **Compress archives** (14+ days old → gzip)
5. **Delete old archives** (90+ days old)

### Token Savings

| Validations/Week | Annual Token Savings |
|------------------|---------------------|
| 2/day | ~$240/year |
| 5/day | ~$600/year |
| 10/day | ~$1,200/year |

## Configuration

Configuration is stored in `.validation/config.json`:

```json
{
  "version": "1.0.0",
  "validators": {
    "typescript": { "enabled": true, "weight": 0.96 },
    "eslint": { "enabled": true, "weight": 0.92 },
    "jest_unit": { "enabled": true, "weight": 0.93 },
    "zod_schema_validation": { "enabled": true, "weight": 0.99 },
    "security_scan": { "enabled": true, "weight": 0.88 }
  },
  "consensus": {
    "minValidatorsToFlag": 2,
    "singleValidatorThreshold": 0.95
  },
  "cleanup": {
    "maxActiveSize": 512000,
    "retentionDays": 30,
    "archiveAfterDays": 7
  }
}
```

## Programmatic Usage

```typescript
import { validate, ValidationEngine, SkepticalReasoningEngine } from '@roALAB1/manus-validation-kit';

// Quick validation
const results = await validate('/path/to/project', {
  layer: 'all',
  fix: true,
});

// Or use individual engines
const engine = new ValidationEngine('/path/to/project');
const report = await engine.validate();

const skeptical = new SkepticalReasoningEngine('/path/to/project');
const analysis = await skeptical.analyze();
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx manus-validate validate --ci
      - run: npx manus-validate validate --layer=skeptical --ci
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npx manus-validate validate --ci
```

## The 10 Commandments

1. **No code without locked PRD**
2. **Validate at every step**
3. **Use multiple validators (consensus)**
4. **Infrastructure as code**
5. **Never use `any` type**
6. **Follow BaseService pattern**
7. **Write tests (80%+ coverage)**
8. **Monitor everything**
9. **Have rollback plan**
10. **Document everything**

## License

MIT © AudienceLab

---

**This is not a guideline. This is the operating system for quality. Follow it religiously.**
