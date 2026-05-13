---
name: "doc-rot"
description: "Detecta documentação podre, redundante ou enganosa para exclusão ou refatoração."
version: "1.0.0"
agent: "doc-rot"
user-invocable: true
maxTurns: 25
---

# Doc Rot Detector

Encontra documentação podre (stale, mentirosa, redundante) para DELETAR.

## Usage

```bash
/doc-rot <file_path>           # Analyze single file
/doc-rot <directory> --batch   # Scan directory for doc rot
```

## Arguments

- `$ARGUMENTS` - Path to file or directory to analyze

## The Golden Rule

```
WRONG DOCUMENTATION IS WORSE THAN NO DOCUMENTATION.

A stale TODO misleads future developers.
A lying comment wastes debugging hours.
An outdated @llm-context causes wrong LLM decisions.

When in doubt, DELETE IT.
```

## Protocol

Follow this 5-step verification protocol.

### Step 1: Scan for Rot Candidates

```bash
# Find potential doc rot markers
grep -n "TODO\|FIXME\|HACK\|XXX\|@deprecated\|DEPRECATED\|@ts-nocheck\|@ts-ignore\|@llm-context" "$ARGUMENTS"
```

### Step 2: Categorize Findings

| Category | Pattern | Rot Risk |
|----------|---------|----------|
| **Stale TODO** | "TODO: implement X" but X exists | HIGH |
| **Lying Comment** | Comment says A, code does B | CRITICAL |
| **Unnecessary Suppression** | @ts-nocheck but types are fine | HIGH |
| **Outdated Reference** | References deleted file/function | CRITICAL |
| **Stale @llm-context** | [verified:DATE] > 30 days old | MEDIUM |

### Step 3: Verify Each Finding

For each candidate, VERIFY before recommending deletion:

**For TODOs:**
```bash
# Check if the TODO item was implemented
# Example: TODO says "add email column" - check if column exists
grep -r "<feature_mentioned>" . --include="*.sql" --include="*.ts"

# Check git history - was this resolved?
git log -p -S "<todo_text>" -- "<file>" | head -50
```

**For Comments:**
```bash
# Read surrounding code to verify if comment matches reality
# If comment says "X doesn't exist" but code uses X → comment is lying
```

**For @ts-nocheck:**
```bash
# Try removing it and check if types pass
# If file has proper types → @ts-nocheck is unnecessary
```

**For @llm-context:**
```bash
# Verify the annotation is still accurate
# Check if referenced files/functions still exist
# Check if behavior described still matches code
```

### Step 4: Generate Deletion Report

```markdown
## Doc Rot Report: <filename>

### Summary
- **Total candidates scanned:** X
- **Confirmed doc rot:** Y
- **False positives:** Z

### Confirmed Doc Rot (DELETE THESE)

#### 1. [Line X] - <category>
- **Content:** `<the comment/annotation>`
- **Why it's rot:** <verification that proves it's wrong/stale>
- **Evidence:** <grep/git output proving it>
- **Action:** DELETE

#### 2. [Line Y] - <category>
...

### False Positives (KEEP THESE)
| Line | Content | Why Keep |
|------|---------|----------|
| ... | ... | Still valid because... |

### Recommended Deletions
```diff
- // @ts-nocheck
- // TODO: SCHEMA MISMATCH - columns don't exist
- // but they DO exist since migration 20251230
```
```

### Step 5: Apply Deletions (if --apply flag)

If `--apply` flag present:
1. Show the report
2. Ask for confirmation
3. Apply deletions using Edit tool
4. Run typecheck to verify no regressions

## Categories of Doc Rot

### 1. Stale TODOs

**Pattern:** TODO describes something that was already done.

```typescript
// ❌ DOC ROT - Column was added in migration 20251230
// TODO: Add email column to user_profiles

// ✅ VALID - Actually not implemented yet
// TODO: Add rate limiting to this endpoint
```

**Verification:** Check migrations, git history, grep for implementation.

### 2. Lying Comments

**Pattern:** Comment describes state that doesn't match reality.

```typescript
// ❌ DOC ROT - Code below DOES use these columns
// This file expects columns that don't exist in the schema
const { email, full_name } = await supabase.from('user_profiles').select('email, full_name');

// ✅ VALID - Accurate description
// Fallback to webm if mp4 not supported
const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
```

**Verification:** Read the code, check if comment matches behavior.

### 3. Unnecessary Type Suppressions

**Pattern:** @ts-nocheck or @ts-ignore that aren't needed.

```typescript
// ❌ DOC ROT - Types are actually fine
// @ts-nocheck
import { supabase } from './supabase'; // properly typed

// ✅ VALID - Genuine type issue with third-party lib
// @ts-ignore - replicate package lacks types
import Replicate from 'replicate';
```

**Verification:** Remove suppression, run `npm run typecheck`.

### 4. Outdated References

**Pattern:** References to files, functions, or features that no longer exist.

```typescript
// ❌ DOC ROT - Function was deleted in PR #123
// See utils/deprecated-helper.ts for implementation details

// ✅ VALID - File exists
// See docs/architecture/auth-flow.md for details
```

**Verification:** Check if referenced file/function exists.

### 5. Stale @llm-context

**Pattern:** @llm-context annotation that is no longer accurate.

```typescript
// ❌ DOC ROT - context-loader.cjs was renamed to context-loader.ts
// @llm-context: mmos-context-loader.cjs reads this file

// ✅ VALID - Still accurate
// @llm-context: --force bypasses this check
```

**Verification:** Verify referenced files exist, behavior still matches.

## Batch Mode

When using `--batch` on a directory:

```bash
/doc-rot app/modules --batch
```

Output summary table:

```markdown
## Batch Doc Rot Scan: app/modules/

| File | Rot Found | Categories |
|------|-----------|------------|
| api.ts | 2 | Stale TODO, Lying Comment |
| types.ts | 0 | - |
| hooks.ts | 1 | Unnecessary @ts-ignore |

**Total:** 3 items of doc rot across 2 files

Run `/doc-rot <file> --apply` on individual files to fix.
```

## What This Skill Does NOT Do

- Does NOT suggest adding new documentation
- Does NOT suggest adding @llm-context annotations
- Does NOT "improve" existing comments
- ONLY identifies documentation to DELETE

## Example

```bash
/doc-rot app/lib/formUserIntegration.ts
```

Output:
```markdown
## Doc Rot Report: formUserIntegration.ts

### Summary
- **Total candidates scanned:** 2
- **Confirmed doc rot:** 2
- **False positives:** 0

### Confirmed Doc Rot (DELETE THESE)

#### 1. [Line 1] - Unnecessary Type Suppression
- **Content:** `// @ts-nocheck`
- **Why it's rot:** File uses properly typed Supabase client, types should work
- **Evidence:** No actual type errors when removed
- **Action:** DELETE

#### 2. [Lines 2-4] - Lying Comment
- **Content:** `// TODO: SCHEMA MISMATCH - columns don't exist`
- **Why it's rot:** Columns `email` and `full_name` EXIST in user_profiles
- **Evidence:** Migration 20251230_006 line 47: `INSERT INTO user_profiles (id, email, full_name, mind_id)`
- **Action:** DELETE

### Recommended Deletions
```diff
- // @ts-nocheck
- // TODO: SCHEMA MISMATCH - This file expects user_profiles to have 'email' and 'full_name' columns
- // but the actual table only has: id, mind_id, created_at. This needs business logic refactoring
- // to either: (1) add these columns to user_profiles, or (2) look up email from auth.users/minds
```

Run `/doc-rot app/lib/formUserIntegration.ts --apply` to delete.
```
