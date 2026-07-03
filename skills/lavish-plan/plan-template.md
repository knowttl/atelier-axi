# <Feature> Implementation Plan

> **For agentic workers:** execute this plan task-by-task with a fresh subagent per task and a
> review between tasks — use the `lavish-implement` skill (or an equivalent subagent-driven
> loop). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** <one sentence describing what this builds>

**Architecture:** <2-3 sentences on the approach>

**Tech Stack:** <key technologies/libraries/commands>

## Global Constraints

<project-wide requirements — version floors, dependency limits, naming/copy rules, the exact
test/build commands — one line each, exact values. Every task implicitly includes these.>

## Decisions resolved during review

<The open questions the visual review settled — recorded here so the plan carries the review's
conclusions even when no `review.html` is kept (the small route keeps none). One line each:
**Accepted** — <question> → <chosen approach>; **Deferred** — <question> → why it was deferred
and the decision record it became. Omit only if the review surfaced no open questions.>

## File Structure

<Before defining tasks, map every file the plan creates or modifies and what each is
responsible for — this is where decomposition gets locked in. Design units with clear
boundaries and one responsibility each; files that change together live together. In an
existing codebase, follow its established patterns and file layout. This map informs the task
boundaries below.>

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
- Right-size tasks: a task is the smallest unit that carries its own test cycle and is worth a
  fresh reviewer's gate. Fold setup/config/scaffolding/docs into the task whose deliverable
  needs them; split only where a reviewer could reject one task while approving its neighbor.
- Write for an engineer with zero context for the codebase and questionable test taste.
- DRY, YAGNI, TDD, frequent commits. Each task ends with an independently testable deliverable.
