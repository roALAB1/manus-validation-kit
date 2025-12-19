# Codebase Audit Guide (Layer 6)

## Overview

Layer 6 adds **Evidence-Based Codebase Auditing** to the Manus Validation Kit. Unlike AI-opinion-based analysis, this system uses **proven static analysis tools** and provides **evidence for every recommendation**.

## Core Principle: No Hallucination

Every finding includes proof from a real tool:

| Approach | Risk | Our Approach |
|----------|------|--------------|
| "This file looks unused" | ❌ High hallucination risk | ✅ "This file has 0 imports" (tool proof) |
| "This dependency seems unnecessary" | ❌ High hallucination risk | ✅ "Package not imported anywhere" (depcheck proof) |
| "This code is bloated" | ❌ High hallucination risk | ✅ "95% similarity with file X" (jscpd proof) |

## Quick Start

```bash
# Run full audit
npm run validate:audit

# Run specific audit type
npm run validate:audit:deps    # Unused dependencies only
npm run validate:audit:files   # Unused files only

# Generate cleanup script
npx manus-validate audit --generate-cleanup
```

## What Gets Detected

### 1. Unused Dependencies
**Tool:** `depcheck`

Finds npm packages in `package.json` that are never imported.

```
📦 UNUSED-DEPENDENCY [95%]
   Target: lodash
   → Remove "lodash" from dependencies in package.json
   Evidence: depcheck
```

### 2. Unused Files
**Tool:** `unimported`

Finds source files that are not reachable from any entry point.

```
📁 UNUSED-FILE [70%]
   Target: src/utils/old-helper.ts
   → Archive or remove "src/utils/old-helper.ts" - not imported by any entry point
   Evidence: unimported
```

### 3. Unused Exports
**Tool:** `ts-prune`

Finds TypeScript exports that are never imported.

```
📤 UNUSED-EXPORT [75%]
   Target: src/services/api.ts:42
   → Remove unused export "legacyFetch" from src/services/api.ts
   Evidence: ts-prune
```

### 4. Duplicate Code
**Tool:** `jscpd`

Finds copy-pasted code blocks.

```
📋 DUPLICATE-CODE [85%]
   Target: src/utils/helpers.ts <-> src/lib/utils.ts
   → Refactor duplicate code into shared function/module
   Evidence: jscpd (15 lines, 120 tokens)
```

### 5. Circular Dependencies
**Tool:** `madge`

Finds circular import chains.

```
🔄 CIRCULAR-DEPENDENCY [90%]
   Target: api.ts → service.ts → utils.ts → api.ts
   → Break circular dependency cycle
   Evidence: madge
```

### 6. Stale Files
**Tool:** Filesystem check

Finds files not modified in 180+ days.

```
📅 STALE-FILE [40%]
   Target: src/legacy/old-module.ts
   → Review stale file - not modified in 180+ days
   Evidence: filesystem
```

## Confidence Levels

| Level | Score | Meaning | Action |
|-------|-------|---------|--------|
| 🔴 High | 80-100% | Tool-proven, multiple signals | Safe to act on |
| 🟡 Medium | 60-79% | Single tool signal | Needs human review |
| ⚪ Low | 0-59% | Heuristic-based | Do not auto-act |

### Confidence Calculation

Base confidence comes from the tool, then modifiers are applied:

**Boosters:**
- +15: Multiple tools agree on the same finding
- +10: File not modified in 6+ months
- +5: No test files reference this code

**Reducers:**
- -20: File is in `.validation/keep.json`
- -15: File has "TODO" or "WIP" comments
- -10: File is in `__tests__/` directory

## Configuration

### `.validation/config.json`

```json
{
  "audit": {
    "enabled": true,
    "tools": {
      "depcheck": { "enabled": true },
      "ts-prune": { "enabled": true },
      "unimported": { "enabled": true },
      "jscpd": { "enabled": true, "minLines": 10 },
      "madge": { "enabled": true }
    },
    "thresholds": {
      "minConfidenceToReport": 50,
      "minConfidenceToRecommend": 70,
      "staleFileDays": 180
    },
    "exclusions": {
      "paths": ["node_modules/", "dist/", "__tests__/"],
      "packages": ["@types/*"],
      "patterns": ["*.config.js", "*.d.ts"]
    }
  }
}
```

### `.validation/keep.json` (Exclusion List)

Use this to mark files/packages that should be kept despite appearing unused:

```json
{
  "description": "Files and packages intentionally kept",
  "files": [
    {
      "path": "src/utils/legacy-helper.ts",
      "reason": "Used by external service via API",
      "addedBy": "john@example.com",
      "addedAt": "2024-01-10"
    }
  ],
  "packages": [
    {
      "name": "dotenv",
      "reason": "Loaded via -r flag in production",
      "addedBy": "jane@example.com",
      "addedAt": "2024-01-12"
    }
  ]
}
```

## CLI Commands

```bash
# Full audit
npx manus-validate audit

# Specific type
npx manus-validate audit --type=dependencies
npx manus-validate audit --type=files
npx manus-validate audit --type=exports
npx manus-validate audit --type=duplicates

# Output formats
npx manus-validate audit --output=json
npx manus-validate audit --output=markdown
npx manus-validate audit --output=text  # default

# Generate cleanup script
npx manus-validate audit --generate-cleanup

# CI mode (exit code 1 if high-confidence issues)
npx manus-validate audit --ci

# Custom confidence threshold
npx manus-validate audit --min-confidence=70
```

## Output Files

After running an audit, reports are saved to:

```
.validation/
├── reports/
│   ├── audit-2024-01-15T10-30-00.json    # Full JSON report
│   └── audit-2024-01-15T10-30-00.md      # Markdown report
├── audit/
│   └── (individual tool outputs)
└── cleanup.sh                             # Generated cleanup script
```

## Cleanup Workflow

### Step 1: Run Audit
```bash
npm run validate:audit
```

### Step 2: Review Report
Open `.validation/reports/audit-*.md` and review findings.

### Step 3: Update Keep List
Add any false positives to `.validation/keep.json`.

### Step 4: Generate Cleanup Script
```bash
npx manus-validate audit --generate-cleanup
```

### Step 5: Review Script
```bash
cat .validation/cleanup.sh
```

### Step 6: Execute (After Review!)
```bash
# Make sure you've reviewed the script!
chmod +x .validation/cleanup.sh
./.validation/cleanup.sh
```

## Programmatic Usage

```typescript
import { audit } from '@roALAB1/manus-validation-kit';

const results = await audit('/path/to/project', {
  type: 'all',
  generateCleanup: true,
});

console.log(results.report.summary);
// {
//   totalFindings: 42,
//   highConfidence: 12,
//   mediumConfidence: 18,
//   lowConfidence: 12,
//   unusedDependencies: 5,
//   unusedFiles: 8,
//   ...
// }

// Get specific findings
const unusedDeps = results.report.findings.filter(
  f => f.type === 'unused-dependency' && f.category === 'high'
);
```

## Safety Mechanisms

1. **No auto-delete**: Only generates recommendations
2. **Cleanup script review**: You must review before running
3. **Dry-run mode**: See what would happen without changes
4. **Backup reminder**: Always commit before cleanup
5. **Git check**: Warns if working tree is dirty

## Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Run Codebase Audit
  run: npm run validate:audit -- --ci

- name: Upload Audit Report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: audit-report
    path: .validation/reports/audit-*.md
```

## Troubleshooting

### Tool Not Found
```
Installing depcheck...
```
Tools are auto-installed on first run. If this fails, install manually:
```bash
npm install -g depcheck ts-prune unimported jscpd madge
```

### False Positives
Add to `.validation/keep.json` with a reason.

### Tool Errors
Check `.validation/reports/audit-*.json` for the `errors` array.

## Best Practices

1. **Run weekly**: Schedule audit as part of maintenance
2. **Review before acting**: Never blindly run cleanup scripts
3. **Update keep.json**: Document why files are kept
4. **Track trends**: Compare reports over time
5. **Start with high confidence**: Only act on 80%+ findings initially
