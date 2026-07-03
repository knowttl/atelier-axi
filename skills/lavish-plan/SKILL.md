---
name: lavish-plan
description: Plan a feature, fix, or change before building it. Runs a light interview, surfaces every open question and edge case as an annotatable visual review surface in the browser (via lavish-axi), converges with the user, then writes a durable spec.md + plan.md and beads records. Use when the user says "plan this", "let's design X", "write a spec/plan for Y", or is about to jump into implementation without a validated plan.
---

# Lavish Plan — visual feature planner

Drive a feature from a rough idea to a reviewed, durable spec + implementation plan, using
lavish-axi as the visual review surface. You ORCHESTRATE real CLI tools (`lavish-axi`, `bd`).
You do not invoke any other skill except `lavish-implement`, and only in Phase 8 on explicit
user opt-in.

## Operating rules

- **Planning only — never write implementation code in this flow.** Implementation happens
  later, on explicit opt-in, via `lavish-implement`.
- **Light interview first.** Do not interrogate before the user has seen anything visual.
- **Orchestrate, don't reimplement.** All browser review, serving, export, and layout
  auditing is `lavish-axi`; all issue tracking is `bd`. Degrade gracefully when either is
  missing (see Graceful degradation).
- **Self-contained and portable.** Depend on no other skill; use no hard-coded project paths.
- **Subagents get fresh context.** Dispatch review loops (Phases 5-6) as subagents; construct
  exactly the context each needs — they do not inherit this conversation.

## Phase 1 — Intake & project context

1. Read the target project for purpose and conventions: `README`, `AGENTS.md`/`CLAUDE.md`,
   directory structure, and the code the feature touches.
2. Identify the SUBJECT project — the product whose content/UI the artifact represents, which
   may differ from the current working directory — and its design system: Tailwind/theme
   config, CSS variables/design tokens, component library, brand assets, or existing styled
   pages.
3. Run a LIGHT terminal interview, one question at a time, review-sized: just enough to get
   the general sense of the feature (purpose, rough shape, hard constraints). Stop as soon as
   you can build something visual.

## Phase 2 — Scope classification

Classify the change and state the call in plain English with a one-line reason:

- **large** — spans multiple independent components, needs a new architectural/design
  decision, or is likely to touch several files/modules.
- **small** — a single well-understood change (one component, no new architectural decision).

Say e.g. "I'm treating this as a **large** feature — it needs a new theme system and touches
CSS + a component + persistence. Say the word to treat it as small instead." The user may
override; the override wins and re-routes the pipeline.

## Phase 3 — Build the review artifact

1. Open every matching playbook before writing HTML: `lavish-axi playbook plan` (primary),
   plus `lavish-axi playbook input` / `comparison` / `diagram` as the artifact needs them.
2. Choose the design source in priority order: (1) a look/design-system the user named; else
   (2) the subject project's design system; else (3) `lavish-axi design` (Tailwind v4 +
   DaisyUI v5, theme `luxury`). State which you used.
3. Write the artifact to `.lavish/<topic>-review.html` in the current working directory. Copy
   any sibling assets next to it and reference them with relative paths (never a leading `/`).
4. Render EVERY open question, edge case, and design option as its own decision card using the
   `plan` playbook's embedded decision-card template (problem → recommendation → example →
   Accept/Defer control that queues exactly one prompt). For a UI-facing feature, add sample
   UI mockups in the subject project's design system; for a non-UI feature, show cards only —
   no mockups.

## Phase 4 — Lavish review loop

1. Open the session: `lavish-axi <file>`.
2. Poll for feedback: `lavish-axi poll <file>` — run it in the background if your harness
   limits foreground command time; if it is killed, just re-run it (queued feedback is never
   lost). Leave it running; never kill it deliberately.
3. If the poll returns `layout_warnings`, follow the returned `next_step`: fix fresh
   error-severity findings and re-check BEFORE involving the human; proceed with a note only
   when every current warning is persistent or below error severity.
4. Incorporate annotations, update the artifact, and re-open until the user confirms the
   direction. Track each card as accepted or explicitly deferred.
5. If the poll returns `status: "ended"` with `ended_by: "user"`, stop the loop and do not
   reopen uninvited. Export/preserve the draft artifact, summarize in the terminal what was
   confirmed vs. still open, and ask whether to (a) proceed to durable records from what was
   confirmed (marking unresolved cards as deferred) or (b) hold without writing records.

## Phase 5 — Spec + review loop (LARGE route only; small route skips this phase)

1. Write `spec.md` capturing the confirmed decisions, architecture, components, and an
   explicit edge-case pass.
2. Dispatch a **fresh spec-reviewer subagent** with the `spec.md` text + confirmed decisions +
   the Spec rubric from `review-rubrics.md`. Fix its findings.
3. Repeat until a clean pass. Convergence safeguard: after 3 rounds without a clean pass, stop
   and surface the remaining findings to the user for a call.

## Phase 6 — Plan + consistency loop

1. Write `plan.md` following `plan-template.md`: a header (goal / architecture / tech stack /
   global constraints) then bite-sized TDD tasks (write failing test → run it fail → minimal
   implementation → run it pass → commit) with exact file paths and complete code — NO
   placeholders.
2. Dispatch a **fresh plan-reviewer subagent** with `spec.md` (if any) + `plan.md` + the Plan
   rubric from `review-rubrics.md`: spec↔plan coverage, project fit, and a no-placeholder
   scan. Fix its findings.
3. Repeat until clean, with the same 3-round safeguard.

## Phase 7 — Durable records

1. Export the review artifact:
   `lavish-axi export .lavish/<topic>-review.html --out docs/atelier-plans/<type>/<YYYY-MM-DD>-<topic>/review.html`.
2. Write files into `docs/atelier-plans/<type>/<YYYY-MM-DD>-<topic>/` (create parents):
   - **large:** `spec.md` + `plan.md` + `review.html`.
   - **small:** `plan.md` + `review.html` (no `spec.md`); `plan.md` is always written so
     `lavish-implement` has an executable input.
   - Never clobber an existing same-date+topic folder: ask the user whether to reuse/overwrite
     or write a disambiguated `<topic>-2`/`-3` sibling; default to the suffixed sibling when
     the user cannot be asked.
3. If `bd` is available, create beads records (skip entirely if not):
   - **large:** one `epic`, then one `task` per plan task, ordered with `bd dep add`
     (`epic -> task 1 -> task 2 -> …`).
   - **small:** a single issue typed to the change (`bug`/`chore`/etc.).
   - **deferred question:** a `decision` issue.
   - Every `--description` ends with the repo-relative folder or file pointer. Never use
     `bd edit`; set fields inline via `--description`/`--notes`/`--design` or `bd update`.

Example (large, `bd` present):

```bash
bd create --title="Dark mode toggle" --type=epic --priority=2 \
  --description="Add a user-facing dark mode toggle. Spec & plan: docs/atelier-plans/feature/2026-07-02-dark-mode/ (spec.md, plan.md, review.html)"
bd create --title="Add theme CSS variables" --type=task --priority=2 \
  --description="Plan task 1. See docs/atelier-plans/feature/2026-07-02-dark-mode/plan.md (Task 1)"
bd create --title="Add toggle component + persistence" --type=task --priority=2 \
  --description="Plan task 2. See docs/atelier-plans/feature/2026-07-02-dark-mode/plan.md (Task 2)"
bd dep add <task2-id> <task1-id>   # task 2 depends on task 1
bd dep add <task1-id> <epic-id>    # task 1 depends on the epic
```

## Phase 8 — Hand-back & execution offer

1. Give a terminal summary and open a final lavish artifact of the spec + plan.
2. Offer exactly two options: **(1) implement now** — invoke `lavish-implement` against the
   written `plan.md`; or **(2) defer** — stop cleanly (the durable `plan.md` lets any fresh
   session implement later).
3. Durable records (Phase 7) are complete BEFORE this offer, so both options hand off
   identical artifacts. Never auto-start implementation. On opt-in, confirm the working branch
   first — never begin on `main`/`master` without explicit consent.

## Graceful degradation

- **`lavish-axi` unavailable or the server fails to start** → fall back to a terminal-based
  review of the questions/options and STATE the degradation explicitly; still produce the
  durable files.
- **`bd` unavailable** → write files only, with no error and no beads step.
