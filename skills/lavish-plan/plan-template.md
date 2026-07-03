# <Feature> Implementation Plan

**Goal:** <one sentence describing what this builds>

**Architecture:** <2-3 sentences on the approach>

**Tech Stack:** <key technologies/libraries/commands>

## Global Constraints

<project-wide requirements — version floors, dependency limits, naming/copy rules, the exact
test/build commands — one line each, exact values. Every task implicitly includes these.>

---

## Task N: <component>

**Files:**

- Create: `exact/path/to/file`
- Modify: `exact/path/to/existing:lines`
- Test: `exact/path/to/test`

**Interfaces:**

- Consumes: <exact signatures this task uses from earlier tasks>
- Produces: <exact names/types later tasks rely on>

- [ ] **Step 1: Write the failing test** — show the complete test code.
- [ ] **Step 2: Run it and confirm it fails** — exact command + expected failure message.
- [ ] **Step 3: Write the minimal implementation** — show the complete code.
- [ ] **Step 4: Run it and confirm it passes** — exact command + expected pass.
- [ ] **Step 5: Commit** — `git add <paths> && git commit -m "<message>"`.

## Rules

- Exact file paths always; complete code in every code step; exact commands with expected output.
- NO placeholders: "TBD", "add error handling", "handle edge cases", "similar to Task N", or a
  step that says what to do without showing how are plan failures.
- Types, function names, and signatures used in later tasks must match those defined earlier.
- DRY, YAGNI, TDD, frequent commits. Each task ends with an independently testable deliverable.
