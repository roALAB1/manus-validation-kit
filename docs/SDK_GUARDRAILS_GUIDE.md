# SDK Guardrails Guide

## Layer 7: Verified Data Structure Enforcement

The SDK Guardrails system prevents AI hallucination of data structures by validating code against verified schemas. This ensures that all field access, API calls, and data structures are backed by evidence from authoritative sources.

---

## The Problem This Solves

When AI agents generate code that interacts with databases or APIs, they often "hallucinate" field names and data structures that don't actually exist. This leads to runtime errors, failed deployments, and wasted debugging time.

**Common hallucination patterns:**

| What AI Assumes | Reality |
|-----------------|---------|
| `user.fullName` | Field is actually `user.full_name` |
| `data.items[0].metadata.tags` | Structure is flat: `data.items[0].tags` |
| `response.success` | Field doesn't exist; check `response.status` instead |

The SDK Guardrails system catches these issues **before** code is committed by validating against verified schemas.

---

## How It Works

The system operates on a simple principle: **If it's not in the verified schema, don't use it.**

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Project                              │
├─────────────────────────────────────────────────────────────┤
│  .validation/                                                │
│  └── sdk-guardrails.json    ← Project-specific schemas      │
│                                                              │
│  src/                                                        │
│  └── services/                                               │
│      └── api-client.ts      ← Code being validated          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              SDK Guardrails Engine                           │
├─────────────────────────────────────────────────────────────┤
│  1. Load verified schemas from config                        │
│  2. Scan source files for field access patterns              │
│  3. Compare against verified schemas                         │
│  4. Flag unverified or non-existent field access             │
│  5. Generate evidence-based report                           │
└─────────────────────────────────────────────────────────────┘
```

### Validation Process

1. **Load Config:** Read your project's `sdk-guardrails.json` or `SDK_GUARDRAILS.md`
2. **Scan Files:** Find all TypeScript/JavaScript files that interact with SDKs
3. **Pattern Match:** Detect field access patterns (e.g., `data.fieldName`, `row['column']`)
4. **Verify:** Check each field against the verified schema
5. **Report:** Generate findings with evidence and suggestions

---

## Setting Up SDK Guardrails

### Step 1: Create Your Guardrails Config

Copy the template and customize for your project:

```bash
cp node_modules/@roALAB1/manus-validation-kit/templates/SDK_GUARDRAILS_TEMPLATE.md \
   .validation/SDK_GUARDRAILS.md
```

Or generate a JSON config:

```bash
npx manus-validate sdk init --project "MyProject"
```

### Step 2: Document Your Verified Schemas

For each table/entity in your system, document:

1. **All verified fields** with their types
2. **Fields that DO NOT exist** (common mistakes)
3. **JSONB/nested structures** with exact shape
4. **Source files** used to verify the schema

Example JSON config:

```json
{
  "version": "1.0.0",
  "projectName": "MyProject",
  "lastUpdated": "2025-12-20",
  "sourceFiles": [
    {
      "path": "swagger_spec.json",
      "purpose": "API schema definitions"
    }
  ],
  "schemas": [
    {
      "name": "users",
      "fields": [
        { "name": "id", "type": "uuid", "required": true, "nullable": false },
        { "name": "email", "type": "text", "required": true, "nullable": false },
        { "name": "full_name", "type": "text", "required": false, "nullable": true }
      ],
      "nonExistentFields": ["fullName", "name", "username"]
    }
  ]
}
```

### Step 3: Run Validation

```bash
# Run SDK guardrails validation
npm run validate:sdk

# Or with options
npx manus-validate sdk --strict --output markdown
```

---

## Configuration Options

### JSON Config Format

Place at `.validation/sdk-guardrails.json`:

```json
{
  "version": "1.0.0",
  "projectName": "Your Project Name",
  "lastUpdated": "2025-12-20",
  "sourceFiles": [],
  "schemas": [],
  "endpoints": [],
  "commonMistakes": [],
  "rules": []
}
```

### Markdown Config Format

Place at `.validation/SDK_GUARDRAILS.md` or `SDK_GUARDRAILS.md`:

The engine parses Markdown tables to extract schema information. See the template for the expected format.

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--config` | Path to guardrails config | Auto-detect |
| `--target` | Specific files/directories to scan | Entire project |
| `--exclude` | Paths to exclude | `node_modules`, `.git`, `dist` |
| `--severity` | Minimum severity to report | All |
| `--strict` | Fail on any violation | false |
| `--output` | Output format (`json`, `text`, `markdown`) | `markdown` |

---

## Understanding Results

### Violation Types

| Type | Description | Severity |
|------|-------------|----------|
| `unverified_field` | Field not in verified schema | Critical |
| `wrong_type` | Field exists but wrong type used | High |
| `deprecated_field` | Field is deprecated | Medium |
| `missing_required` | Required field not accessed | Low |
| `invalid_structure` | JSONB structure incorrect | High |
| `hardcoded_value` | Hardcoded value that should be dynamic | Medium |
| `assumption` | Code assumes something not verified | Medium |
| `deprecated_endpoint` | Using deprecated API endpoint | High |

### Confidence Levels

| Level | Meaning | Action |
|-------|---------|--------|
| High | Tool-proven violation | Safe to act on |
| Medium | Likely issue, needs review | Review before acting |
| Low | Possible issue, uncertain | Informational only |

### Example Report

```markdown
# SDK Guardrails Validation Report

**Status:** ❌ FAILED
**Score:** 45/100
**Files Scanned:** 12
**Violations Found:** 3

## Violations

### 🔴 src/services/user-service.ts:42

**Type:** unverified_field
**Message:** Field 'fullName' does not exist on 'users' table

```typescript
const name = user.fullName;  // ❌ Wrong
```

**Suggestion:** Use 'full_name' instead of 'fullName'
**Evidence:** Verified schema for 'users' does not include field 'fullName'
```

---

## Best Practices

### 1. Keep Guardrails Updated

When your database schema or API changes, update the guardrails config immediately. Stale guardrails lead to false positives.

### 2. Document Non-Existent Fields

Explicitly list fields that don't exist but are commonly assumed. This catches AI hallucinations proactively.

### 3. Include Source References

Always document where your verified schema came from (swagger spec, database migration, type definitions). This enables verification.

### 4. Use in CI/CD

Add SDK guardrails to your CI pipeline to catch violations before merge:

```yaml
- name: Run SDK Guardrails
  run: npm run validate:sdk -- --strict
```

### 5. Review Medium-Confidence Findings

High-confidence findings are safe to act on. Medium-confidence findings should be reviewed—they might be false positives or reveal gaps in your guardrails config.

---

## Programmatic Usage

```typescript
import { SDKGuardrailsEngine } from '@roALAB1/manus-validation-kit';

const engine = new SDKGuardrailsEngine();

// Load config
await engine.loadConfig('.validation/sdk-guardrails.json');

// Run validation
const result = await engine.validate('./src', {
  strictMode: true,
  severityThreshold: 'medium'
});

// Generate report
const report = engine.generateReport(result, 'markdown');
console.log(report);

// Check status
if (result.status === 'failed') {
  process.exit(1);
}
```

---

## Troubleshooting

### "No SDK guardrails configuration found"

The engine couldn't find a config file. Create one at:
- `.validation/sdk-guardrails.json`
- `.validation/sdk-guardrails.md`
- `SDK_GUARDRAILS.md`

### Too Many False Positives

Your guardrails config may be incomplete. Add missing fields to the verified schema, or add patterns to exclude.

### Fields Marked as Non-Existent That Do Exist

Your guardrails config is out of date. Verify against the source of truth and update.

---

## Integration with Other Layers

SDK Guardrails (Layer 7) works alongside other validation layers:

| Layer | Purpose | Relationship |
|-------|---------|--------------|
| Layer 1: Code Validation | Syntax, types, linting | SDK Guardrails adds semantic validation |
| Layer 2: Skeptical Reasoning | Architecture analysis | SDK Guardrails provides data structure context |
| Layer 6: Codebase Audit | Find unused code | SDK Guardrails validates used code is correct |
| **Layer 7: SDK Guardrails** | Verify data structures | Prevents hallucinated schemas |

---

*This guide is part of the Manus Validation Kit v1.2.0*
