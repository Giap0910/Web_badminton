---
name: batch-operations
description: Apply operations across multiple files simultaneously. Pattern-based bulk modifications, search-and-replace across codebases, consistent changes to many files at once.
when_to_use: "When the user needs to change multiple files with the same pattern, rename across a codebase, add imports to many files, update versions, or apply consistent modifications. NOT for single-file edits."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
effort: medium
---

# Batch Operations — Multi-File Changes

> Apply consistent changes across many files at once. One pattern, many targets.

## When to Use

✅ **Good for:**
- Renaming a function/component across all files that use it
- Adding an import to every file in a directory
- Updating version numbers across package files
- Applying the same code pattern to multiple similar files
- Migrating from one API to another across the codebase
- Adding/removing a field from all similar data structures

❌ **Not for:**
- Single-file edits (use direct editing)
- Unique changes per file (handle individually)
- Changes that need per-file judgment (use an agent per domain)

---

## Batch Operation Protocol

### Step 1: Define the Pattern
```
What:     [exact text/pattern to find]
Replace:  [exact replacement text]
Scope:    [file glob pattern, e.g., "frontend/src/**/*.jsx" or "backend/src/**/*.java"]
Exclude:  [files to skip, e.g., "**/*.test.jsx"]
```

### Step 2: Preview Before Executing
```bash
# Find all affected files FIRST
grep -rl "oldPattern" frontend/src/ --include="*.jsx"

# Count matches
grep -rc "oldPattern" frontend/src/ --include="*.jsx" | grep -v ":0$"

# Show context for each match
grep -rn "oldPattern" frontend/src/ --include="*.jsx"
```

> 🔴 **NEVER batch-modify without previewing first.** Show the user what will change.

### Step 3: Execute the Batch

For text replacements:
```powershell
# On Windows (PowerShell)
Get-ChildItem -Path frontend/src -Recurse -Filter *.jsx |
  ForEach-Object { (Get-Content $_) -replace 'oldPattern','newPattern' | Set-Content $_ }
```

For structural changes (adding imports, wrapping code):
- Use the Edit tool on each file
- Process files in a consistent order (alphabetical or by dependency)

### Step 4: Verify the Batch
```bash
# Confirm no missed instances
grep -rl "oldPattern" frontend/src/ --include="*.jsx"
# Should return empty

# Confirm replacements are correct
grep -rn "newPattern" frontend/src/ --include="*.jsx" | head -5

# Run tests to catch breakage
npm run test
npm run build
```

---

## Common Batch Patterns

| Operation | Command Pattern |
|---|---|
| **Rename import** | Find all `import { X }` → replace with `import { Y }` |
| **Update version** | Find `"version": "1.0"` → replace across all package.json |
| **Add export** | Append `export { X }` to all index files |
| **Remove deprecated** | Find `deprecatedFn()` → replace with `newFn()` |
| **Add header** | Prepend license header to all source files |
| **Type migration** | Find `interface X` → replace with `type X =` |

---

## Safety Rules

1. **Preview first** — always show affected files before modifying
2. **Git safety** — ensure clean working directory (`git stash` or commit first)
3. **Exclude tests** — often tests need different treatment than source
4. **Verify after** — run build + tests after every batch operation
5. **Report changes** — list every file modified with change summary
