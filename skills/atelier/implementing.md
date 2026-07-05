# Implementing mode — execute a plan.md

> Reference file for the **atelier** skill. Read and follow this when the request is to execute
> an existing `plan.md` (mode 3 in `SKILL.md`) — either a plan the planning flow just produced,
> or a finished `plan.md` from an earlier session. It is self-contained: you need only the
> `plan.md`, not the planning session's context.

Given a `plan.md` path, implement it task by task by dispatching a fresh implementer subagent
per task, a task review (spec compliance + code quality) after each, and a broad whole-branch
review at the end. You orchestrate subagents.

**Why subagents:** each task runs in isolated context you construct precisely, so subagents
stay focused and your own context stays free for coordination. A subagent never inherits your
session history — you hand it exactly what it needs.

## Engineering principles (non-negotiable)

Hold every task and every subagent to these:

- **End-to-end verification — the Iron Law: no task is done until it's exercised like a real
  user.** Implement the change, then run the actual product the way a user would (the real CLI
  command, the real flow, the real browser interaction) and observe the actual outcome against
  what the user expects. A passing unit test or a clean type-check is not a substitute for that
  observation. If the observed behavior doesn't match user expectation, the task isn't done —
  fix it and re-verify. Exceptions — throwaway prototypes, generated code, pure config/docs —
  need the user's explicit OK.
- **Systematic over ad-hoc.** Follow the plan and this loop; when something breaks, form a
  hypothesis and test it — never guess-and-check or patch blindly.
- **Complexity reduction.** Build only what the task needs (YAGNI); prefer the simplest design
  that passes. A task that is hard to verify end-to-end is a design smell — simplify the
  interface rather than paper over it with mocks.
- **Evidence over claims.** Never report a task done or the build green without the actual
  command/flow you ran and the real output/behavior you observed. "It should work" is not
  evidence.

## Preconditions

1. Locate the `plan.md` — from the argument, the planning hand-off, or by asking the user.
2. Read it in full: goal, architecture, global constraints, file structure, and every task.
3. **Isolated dev worktree.** Do all work on a feature branch in its own worktree, so parallel
   work stays isolated and never touches `main`/`master` or the user's current checkout without
   consent. Whichever mechanism you use, check out (or branch from) the commit that holds
   `plan.md` so the plan is present, and record the branch's start commit
   (`git merge-base main HEAD`) for the final review. Acquire the worktree in this order of
   preference and STATE which you used:
   - **treehouse** (preferred — a pool built for parallel agents): `WT=$(treehouse get --lease --lease-holder "atelier-implement:<topic>")`
     reserves a worktree and prints its path to stdout (banners go to stderr); do all work in
     `$WT`. If `treehouse` is not installed or has no pool for this repo, fall through.
   - else **git worktree:** `git worktree add ../<topic>-impl -b <feature-branch>`.
   - else a **feature branch** in the current checkout: `git switch -c <feature-branch>`.
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
   the Iron Law exactly: implement the task's change, then verify it end-to-end against the
   real, running product — run the actual CLI command/flow a user would run and observe the
   actual outcome — and confirm it matches what the user expects, report the exact command/flow
   and the observed output as evidence, self-review its diff for simplicity (nothing beyond the
   task), and STOP before committing.
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
   extra built (flag both under- and over-building); (b) **code quality:** well-built, the
   end-to-end verification was genuinely run and its output/behavior genuinely observed, no
   placeholders. Do NOT tell the reviewer what to ignore or pre-rate a finding's severity.
4. **Fix loop:** if the reviewer reports Critical/Important findings or spec not met, dispatch a
   FRESH fix subagent with the complete findings list; it re-runs the end-to-end verification
   covering its change and reports the command/flow and observed output; then re-review. After 3
   rounds without a clean pass,
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
   in the plan's Global Constraints) and report the result **with the actual output** — evidence
   over claims; never declare the branch green without it.
3. **Hand back the worktree.** Report the branch name and worktree path, and leave the branch for
   the user to review and merge — never merge to `main`/`master` yourself without consent. When
   the user is done, release a treehouse worktree with `treehouse return <path>` (or remove a
   plain one with `git worktree remove <path>`); a leased treehouse worktree is held until you
   return it.

## Resume after interruption

The committed tasks plus `plan.md`'s ticked checkboxes are your recovery map. After a
compaction or a fresh start, trust `git log` and the checked boxes over your own recollection —
do NOT re-dispatch a task already committed/checked; resume at the first unchecked task.

## Rules & red flags

- Fresh context per task — never paste prior-task history or the whole plan into a dispatch.
- Never dispatch implementation subagents in parallel — they conflict on the working tree.
- Never start on `main`/`master` without consent; work in an isolated worktree/branch (treehouse
  when available, else `git worktree`, else a feature branch) and hand it back for review rather
  than self-merging. Commit frequently.
- Iron Law: no task is done without running the real product end-to-end and observing that the
  behavior matches what the user expects; if a task was marked done without that, go verify it
  now.
- Evidence over claims: paste the real command/flow and the actual observed output or behavior;
  never declare a task or build green without it.
- Never skip the task review, accept a report missing either verdict, or move on with open
  Critical/Important findings.
- Never tell a reviewer what not to flag or pre-rate a finding's severity.
- Let implementer self-review supplement, not replace, the task review — both are needed.
