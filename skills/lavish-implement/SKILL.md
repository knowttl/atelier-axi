---
name: lavish-implement
description: Execute an existing implementation plan (plan.md) task by task with a fresh subagent per task, TDD, review between tasks, and frequent commits. Use to run a written plan.md, implement a plan produced by lavish-plan, or resume a deferred plan in a fresh session. Give it the path to a plan.md.
---

# Lavish Implement — execute a plan.md

Given a `plan.md` path, implement it task by task by dispatching a fresh implementer subagent
per task, a task review (spec compliance + code quality) after each, and a broad whole-branch
review at the end. Self-contained: you need only the `plan.md`, not the planning session's
context. You orchestrate subagents and invoke no other skill.

**Why subagents:** each task runs in isolated context you construct precisely, so subagents
stay focused and your own context stays free for coordination. A subagent never inherits your
session history — you hand it exactly what it needs.

## Preconditions

1. Locate the `plan.md` — from the argument, the `lavish-plan` hand-off, or by asking the user.
2. Read it in full: goal, architecture, global constraints, file structure, and every task.
3. **Branch safety:** confirm the working branch. NEVER write code on `main`/`master` without
   explicit user consent — create or switch to a feature branch first. Record the branch's
   start commit (`git merge-base main HEAD`) for the final review.
4. **Pre-flight plan review:** scan the plan once for conflicts — tasks that contradict each
   other or the Global Constraints, or anything the plan mandates that a reviewer would treat
   as a defect. Batch everything you find to the user as one question (each finding beside the
   plan text that mandates it, asking which governs) before starting. If the scan is clean,
   proceed without comment.

## Continuous execution

Execute all tasks from the plan without stopping to check in between them. The only reasons to
stop are: a BLOCK you cannot resolve, ambiguity that genuinely prevents progress, or all tasks
complete. "Should I continue?" prompts and between-task progress summaries waste the user's
time — they asked you to execute the plan, so execute it.

## Model selection

Use the least powerful model that can handle each role, and **always specify the model
explicitly when dispatching** — an omitted model inherits your (often most expensive) session
model and silently defeats this.

- Task whose plan text already contains the complete code → transcription + testing → cheapest
  tier. Single-file mechanical fixes too.
- Multi-file integration or judgment → standard/mid tier.
- Reviewers → mid-tier floor, scaled up for subtle or high-risk diffs.
- The final whole-branch review → the most capable tier.

## Per-task loop (for each Task N, in order)

1. **Dispatch a FRESH implementer subagent** with only what it needs: the plan's Global
   Constraints block, Task N's full text (Files, Interfaces, every Step), and any interface or
   decision from earlier tasks it cannot know. Do NOT paste the whole plan or prior-task
   summaries — a dispatch describes one task, not the session's history. Instruct it to follow
   the TDD steps exactly (write the failing test → run it and confirm it fails → minimal
   implementation → run it and confirm it passes) using the project's test command, self-review
   its diff, and STOP before committing.
2. **Handle the implementer's status:**
   - **DONE** — proceed to review.
   - **DONE_WITH_CONCERNS** — read the concerns first; if about correctness or scope, resolve
     them before review; if observational, note and proceed.
   - **NEEDS_CONTEXT** — provide the missing context and re-dispatch.
   - **BLOCKED** — assess: a context gap → add context, re-dispatch same model; needs more
     reasoning → re-dispatch a more capable model; too large → split into smaller tasks; the
     plan itself is wrong → escalate to the user. Never force the same model to retry unchanged.
3. **Dispatch a FRESH task reviewer** with: Task N's text, the diff (write `git diff` to a
   uniquely named file and hand over the path so it never enters your context), and the Global
   Constraints copied verbatim as the reviewer's attention lens. It returns a ranked findings
   list plus **two verdicts** — (a) **spec compliance:** every requirement met and nothing
   extra built (flag both under- and over-building); (b) **code quality:** well-built, tests
   genuinely pass, no placeholders. Do NOT tell the reviewer what to ignore or pre-rate a
   finding's severity.
4. **Fix loop:** if the reviewer reports Critical/Important findings or spec not met, dispatch a
   FRESH fix subagent with the complete findings list; it re-runs the tests covering its change
   and reports the command and output; then re-review. After 3 rounds without a clean pass,
   stop and surface the remaining findings to the user. A finding that conflicts with what the
   plan mandates is the user's call — present both and ask which governs.
5. On a clean review (spec ✅ and quality approved), **commit the task** (frequent commits),
   tick its checkbox in `plan.md`, and proceed to Task N+1.

## Final whole-branch review & completion

1. After all tasks pass, dispatch ONE broad reviewer on the most capable model over the whole
   branch diff (`git diff <start-commit> HEAD` written to a file) to catch cross-task issues no
   single task review could see. If it returns findings, dispatch ONE fix subagent with the
   complete list — not one fixer per finding.
2. Run the project's full verification (e.g. `pnpm run check`, or the test/build commands named
   in the plan's Global Constraints) and report the result.

## Resume after interruption

The committed tasks plus `plan.md`'s ticked checkboxes are your recovery map. After a
compaction or a fresh start, trust `git log` and the checked boxes over your own recollection —
do NOT re-dispatch a task already committed/checked; resume at the first unchecked task.

## Rules & red flags

- Fresh context per task — never paste prior-task history or the whole plan into a dispatch.
- Never dispatch implementation subagents in parallel — they conflict on the working tree.
- Never start on `main`/`master` without consent. Commit frequently.
- Never skip the task review, accept a report missing either verdict, or move on with open
  Critical/Important findings.
- Never tell a reviewer what not to flag or pre-rate a finding's severity.
- Let implementer self-review supplement, not replace, the task review — both are needed.
- Invoke no other skill.
