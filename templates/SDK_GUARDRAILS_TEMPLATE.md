# [PROJECT_NAME] SDK Integration Guardrails

> **Purpose:** This document serves as the verified source of truth for all SDK/API integrations in this project. AI agents and developers MUST reference this document before writing any code that interacts with external services or databases.

**Version:** 1.0.0  
**Last Updated:** [DATE]  
**Verified By:** [NAME/ROLE]

---

## How to Use This Document

1. **Before writing any SDK code:** Check this document for verified schemas
2. **If a field is not listed:** Do NOT assume it exists - verify first
3. **If you find a discrepancy:** Update this document with evidence
4. **Non-existent fields:** Are explicitly listed to prevent common mistakes

---

## Source Files

These are the authoritative sources used to verify the schemas below:

| Source | Path/URL | Purpose | Last Verified |
|--------|----------|---------|---------------|
| API Spec | `./swagger_spec.json` | API endpoint definitions | [DATE] |
| DB Schema | `./database_schema.sql` | Database table definitions | [DATE] |
| Type Defs | `./src/types/index.ts` | TypeScript type definitions | [DATE] |

---

## Verified Table Schemas

### `[table_name]` Table

**Description:** [Brief description of what this table stores]

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| created_at | timestamp | Yes | Creation timestamp |
| updated_at | timestamp | Yes | Last update timestamp |
| [column_name] | [type] | [Yes/No] | [Description] |

**Primary Key:** `id`

**Foreign Keys:**
- `[column]` → `[referenced_table].[referenced_column]`

**JSONB Fields:**

If this table has JSONB columns, document their structure:

```typescript
// [jsonb_column_name] structure
interface [JsonbColumnName] {
  field1: string;
  field2: number;
  nested?: {
    subfield1: boolean;
  };
}
```

**Fields That DO NOT Exist:**

> ⚠️ These fields are commonly assumed but DO NOT exist. Do not use them.

- ❌ `[non_existent_field]` - Does not exist
- ❌ `[another_non_existent]` - Does not exist

---

## Verified API Endpoints

### [Service Name] API

**Base URL:** `[BASE_URL]`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/resource` | List resources | Yes |
| POST | `/api/v1/resource` | Create resource | Yes |
| GET | `/api/v1/resource/:id` | Get single resource | Yes |
| PUT | `/api/v1/resource/:id` | Update resource | Yes |
| DELETE | `/api/v1/resource/:id` | Delete resource | Yes |

**Deprecated Endpoints:**

| Endpoint | Deprecated | Use Instead |
|----------|------------|-------------|
| `/api/v0/old-endpoint` | 2024-01-01 | `/api/v1/new-endpoint` |

---

## Common Mistakes

> These are mistakes that have been made before. Learn from them.

| Mistake | Why It's Wrong | Correct Approach |
|---------|----------------|------------------|
| Using `data.fieldName` | Field doesn't exist | Use `data.correct_field` |
| Assuming nested structure | Structure is flat | Check verified schema |
| Hardcoding API URL | URL may change | Use environment variable |

---

## Code Examples

### Correct Usage

```typescript
// ✅ CORRECT: Using verified field names
const result = await db
  .from('[table_name]')
  .select('id, created_at, [verified_field]')
  .eq('id', id);

// Access data using verified fields
const item = result.data[0];
console.log(item.id);           // ✅ Verified field
console.log(item.created_at);   // ✅ Verified field
```

### Incorrect Usage

```typescript
// ❌ WRONG: Using non-existent field
const result = await db
  .from('[table_name]')
  .select('id, [non_existent_field]')  // ❌ This field doesn't exist!
  .eq('id', id);

// ❌ WRONG: Assuming field exists without verification
console.log(item.assumed_field);  // ❌ Not in verified schema
```

---

## Validation Rules

These rules are enforced by the SDK Guardrails Engine:

| Rule ID | Description | Severity |
|---------|-------------|----------|
| `no-unverified-fields` | All field access must be in verified schema | Critical |
| `no-deprecated-endpoints` | Do not use deprecated API endpoints | High |
| `no-hardcoded-urls` | API URLs must use environment variables | High |
| `no-assumed-structure` | JSONB structure must match verified schema | Medium |

---

## Changelog

| Date | Version | Changes | Verified By |
|------|---------|---------|-------------|
| [DATE] | 1.0.0 | Initial guardrails document | [NAME] |

---

## How to Verify/Update This Document

1. **To verify a field exists:**
   - Check the source files listed above
   - Run a test query against the actual database/API
   - Document the evidence

2. **To add a new field:**
   - Verify it exists in the source of truth
   - Add to the appropriate table schema
   - Update the "Last Verified" date

3. **To mark a field as non-existent:**
   - Confirm it doesn't exist in any source
   - Add to "Fields That DO NOT Exist" section
   - Document why it might be commonly assumed

---

*This document is part of the Manus Validation Kit SDK Guardrails system.*
