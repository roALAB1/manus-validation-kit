# Evidence-Based Audit System (Layer 6) - Design Document

## Overview

Layer 6 adds a **Codebase Health Audit** capability that scans an entire repository for unused code, bloated dependencies, duplicate code, and structural issues. Unlike AI-opinion-based analysis, this system uses **proven static analysis tools** and provides **evidence for every recommendation**.

## Core Principles

1. **Evidence-Based**: Every finding includes proof from a real tool
2. **No Hallucination**: AI does not guess; tools provide facts
3. **Confidence Scoring**: Findings rated by certainty level
4. **Non-Destructive**: Recommends only; human approves actions
5. **Exclusion Support**: Respects intentionally kept files

## Tool Integrations

| Tool | Purpose | Evidence Type |
|------|---------|---------------|
| `depcheck` | Unused npm dependencies | Package not imported anywhere |
| `ts-prune` | Unused TypeScript exports | Export has 0 consumers |
| `unimported` | Unreachable files | File not in import tree from entry |
| `jscpd` | Duplicate code detection | Side-by-side diff of duplicates |
| `eslint` | Code quality issues | Linter rule violations |
| `madge` | Circular dependencies | Dependency cycle graph |
| `cost-of-modules` | Dependency size analysis | Bundle size per package |

## Confidence Levels

| Level | Criteria | Action |
|-------|----------|--------|
| 🔴 **High** (90-100%) | Tool-proven, multiple signals agree | Safe to act on |
| 🟡 **Medium** (60-89%) | Single tool signal, likely issue | Needs human review |
| ⚪ **Low** (0-59%) | Heuristic-based, uncertain | Do not auto-act |

## Confidence Calculation

```typescript
interface Finding {
  type: 'unused-dependency' | 'unused-file' | 'unused-export' | 'duplicate-code' | 'circular-dep';
  target: string;           // file path or package name
  evidence: Evidence[];     // proof from tools
  confidence: number;       // 0-100
  recommendation: string;   // what to do
  category: 'high' | 'medium' | 'low';
}

interface Evidence {
  tool: string;             // which tool found this
  output: string;           // raw tool output
  timestamp: string;        // when the scan ran
}
```

### Confidence Boosters

- +30: Multiple tools agree on the same finding
- +20: File not modified in 6+ months
- +10: File not in git blame for recent commits
- +10: No test files reference this code

### Confidence Reducers

- -20: File is in `.validation/keep.json` exclusion list
- -15: File has "TODO" or "WIP" comments
- -10: File is in a `__tests__` or `test` directory
- -10: File matches common utility patterns (`utils/`, `helpers/`)

## Output Structure

```
.validation/
├── reports/
│   └── audit-2024-01-15T10-30-00.json
├── audit/
│   ├── unused-dependencies.json
│   ├── unused-files.json
│   ├── unused-exports.json
│   ├── duplicate-code.json
│   └── circular-dependencies.json
└── keep.json  # exclusion list
```

## Report Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "projectPath": "/path/to/project",
  "summary": {
    "totalFindings": 42,
    "highConfidence": 12,
    "mediumConfidence": 18,
    "lowConfidence": 12,
    "estimatedBloatKB": 156,
    "unusedDependencies": 5,
    "unusedFiles": 8,
    "unusedExports": 22,
    "duplicateBlocks": 4,
    "circularDependencies": 3
  },
  "findings": [
    {
      "id": "unused-dep-001",
      "type": "unused-dependency",
      "target": "lodash",
      "confidence": 95,
      "category": "high",
      "recommendation": "Remove from package.json",
      "evidence": [
        {
          "tool": "depcheck",
          "output": "Unused dependencies: lodash",
          "timestamp": "2024-01-15T10:30:00Z"
        }
      ],
      "impact": {
        "sizeKB": 72,
        "description": "Removing this saves 72KB from node_modules"
      }
    }
  ]
}
```

## CLI Commands

```bash
# Run full audit
npm run validate:audit

# Run specific audit type
npm run validate:audit -- --type=dependencies
npm run validate:audit -- --type=files
npm run validate:audit -- --type=exports
npm run validate:audit -- --type=duplicates

# Generate cleanup script (does not execute)
npm run validate:audit -- --generate-cleanup

# Execute approved cleanup (requires confirmation)
npm run validate:cleanup -- --confirm
```

## Configuration

`.validation/config.json` additions:

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
      "minConfidenceToReport": 60,
      "minConfidenceToRecommend": 80
    },
    "exclusions": {
      "paths": ["scripts/", "migrations/", "__mocks__/"],
      "packages": ["@types/*"],
      "patterns": ["*.config.js", "*.d.ts"]
    }
  }
}
```

## Exclusion List

`.validation/keep.json`:

```json
{
  "description": "Files and packages intentionally kept despite appearing unused",
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

## Safety Mechanisms

1. **No auto-delete**: Only generates recommendations
2. **Cleanup script review**: Generates a shell script for review before execution
3. **Dry-run mode**: Shows what would happen without doing it
4. **Backup before cleanup**: Creates `.validation/backup/` before any changes
5. **Git check**: Refuses to run cleanup on dirty working tree

## Integration with Existing Layers

- **Layer 1 (Code Validation)**: Audit findings feed into validation score
- **Layer 3 (Learning Loop)**: Tracks which findings were acted on
- **Layer 4 (Context Optimization)**: Audit reports are archived/compressed

## Future Enhancements

- Integration with IDE extensions for inline warnings
- GitHub PR comments for new bloat introduced
- Trend tracking over time (is bloat increasing?)
- Team attribution (who introduced unused code?)
