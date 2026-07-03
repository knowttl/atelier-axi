# OpenSrc Source Context (Optional)

Use this guidance only when `opensrc` is installed and you need dependency internals, not just public API docs.

## When to Use

Use `opensrc` when you need to:
- Understand internal behavior that docs and types do not explain.
- Debug edge cases that appear to come from a dependency.
- Verify implementation details in npm, PyPI, crates.io, or GitHub sources.

Skip `opensrc` for basic API usage questions that official docs already answer.

## Core Usage

`opensrc path <package>` returns the cached source path and fetches automatically on cache miss.

Examples:

```bash
# npm package
rg "parse" "$(opensrc path zod)"
cat "$(opensrc path zod)/src/types.ts"

# PyPI package
find "$(opensrc path pypi:requests)" -name "*.py"

# crates.io package
rg "Deserializer" "$(opensrc path crates:serde)"

# GitHub repo
rg "createElement" "$(opensrc path facebook/react)"
```

## Practical Rules

- Prefer `rg`, `cat`, and `find` against the path from `opensrc path`.
- Pin versions when reproducing dependency bugs (example: `opensrc path zod@3.22.0`).
- Mention the inspected package/ref in your summary so future debugging is reproducible.
- Treat third-party source as read-only context. Do not propose edits inside cached dependencies.
