---
name: lavish-implement
description: Execute an existing implementation plan (plan.md) task by task with a fresh subagent per task, TDD, review between tasks, and frequent commits. Use to run a written plan.md, implement a plan produced by lavish-plan, or resume a deferred plan in a fresh session. Give it the path to a plan.md.
---

# Lavish Implement — execute a plan.md

Given a `plan.md` path, implement it task by task. Self-contained: you need only the
`plan.md`, not the planning session's context. You orchestrate subagents and invoke no other
skill.

## Preconditions

1. Locate the `plan.md` — from the argument, the `lavish-plan` hand-off, or by asking the user.
2. Read it in full: goal, architecture, global constraints, and every task.
3. **Branch safety:** confirm the working branch. NEVER write code on `main`/`master` without
   explicit user consent — create or switch to a feature branch first.

## Per-task loop (for each Task N, in order)

1. Dispatch a FRESH implementer subagent with: the plan's Global Constraints block + Task N's
   full text (Files, Interfaces, and every Step). Instruct it to follow the TDD steps exactly
   — write the failing test, run it and confirm it fails, write the minimal implementation,
   run it and confirm it passes — using the project's test command, and to STOP before
   committing.
2. Dispatch a FRESH reviewer subagent with: Task N's text + the resulting diff. It verifies the
   deliverable meets the task, tests genuinely pass, no placeholders remain, and there is no
   scope creep. It returns a ranked findings list + a verdict.
3. If the reviewer rejects, send its findings to a fresh implementer subagent to fix, then
   re-review. After 3 rounds without a clean pass, stop and surface the remaining findings to
   the user.
4. On a clean review, commit the task (frequent commits), then proceed to Task N+1.

## Completion

- When all tasks pass, run the project's full verification (e.g. `pnpm run check`, or the
  test/build commands named in the plan's Global Constraints) and report the result.
- If interrupted, the committed tasks + the `plan.md` checkboxes let a fresh session resume
  from the next unchecked task.

## Rules

- Fresh context per task — subagents do not inherit each other's or your context.
- Never touch `main`/`master` without consent. Commit frequently. Invoke no other skill.
