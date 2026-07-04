# Planning mode — visual feature planner

> Reference file for the **atelier** skill. Read and follow this when the request is to plan a
> feature, fix, or change before building it (mode 2 in `SKILL.md`). It is self-contained: you
> need only this file and the real CLI tools it orchestrates.

Drive a feature from a rough idea to a reviewed, durable spec + implementation plan, using
atelier-axi as the visual review surface. You ORCHESTRATE real CLI tools (`atelier-axi`, `bd`).
Implementation happens later, on explicit user opt-in, by following `implementing.md` (its
sibling) — never in this flow.

## Operating rules

- **Planning only — never write implementation code in this flow.** Implementation happens
  later, on explicit opt-in, via `implementing.md`.
- **Surface questions in the UI, not the terminal.** Do NOT run a one-question-at-a-time
  terminal interview. Put every clarifying question into the browser review surface so the
  user reviews and answers them all together. Keep the terminal to a one-line framing before
  the first artifact opens.
- **Propose before you converge.** Once the user has answered the intake questions, present
  2-3 candidate approaches with tradeoffs and a clear recommendation in the UI before writing
  any spec or plan. Lead with the recommended option and say why.
- **Approve-the-design gate.** Do not write a spec or plan until the user has approved a
  direction in the review loop — no matter how simple the change looks. "Simple" changes are
  where unexamined assumptions cost the most.
- **Orchestrate, don't reimplement.** All browser review, serving, export, and layout
  auditing is `atelier-axi`; all issue tracking is `bd`. Degrade gracefully when either is
  missing (see Graceful degradation).
- **Self-contained and portable.** Use no hard-coded project paths.
- **Subagents get fresh context.** Dispatch review loops (Phases 5-6) as subagents; construct
  exactly the context each needs — they do not inherit this conversation.
- **Engineering principles the plan must encode.** The `plan.md` you produce — and the
  implementation the `implementing.md` flow drives from it — obey four non-negotiables:
  **test-driven** (every behavior gets a failing test first, then the minimal code to pass);
  **systematic over ad-hoc** (a written, reviewable process, not guess-and-check); **complexity
  reduction** (simplicity is the goal — DRY, YAGNI, build only what the approved scope needs);
  and **evidence over claims** (verify with real command output before declaring anything done).
  Write every task so these hold; the `implementing.md` flow enforces them at execution time.

## Phase 1 — Intake & project context

1. Read the target project for purpose and conventions: `README`, `AGENTS.md`/`CLAUDE.md`,
   directory structure, and the code the feature touches.
2. Identify the SUBJECT project — the product whose content/UI the artifact represents, which
   may differ from the current working directory — and its design system: Tailwind/theme
   config, CSS variables/design tokens, component library, brand assets, or existing styled
   pages.
3. From that context and the user's request, ENUMERATE the clarifying questions you need
   answered — purpose, constraints, success criteria, scope, and any UI/behavior specifics.
   Do NOT ask them one at a time in the terminal; you surface them all together in the browser
   in Phase 3. Keep terminal output to at most a one-line framing of what you are about to show.

## Phase 2 — Scope check, decomposition & classification

1. **Oversized check.** If the request spans multiple independent subsystems (e.g. "a platform
   with chat + file storage + billing + analytics"), flag it immediately and help the user
   decompose into sub-projects: what the independent pieces are, how they relate, and what
   order to build them. Then plan the FIRST sub-project through the normal flow — each
   sub-project gets its own spec → plan → implement cycle. Do not spend the review surface
   refining details of a project that needs decomposition first.
2. **Classify** the (sub-)project and state the call in plain English with a one-line reason:
   - **large** — spans multiple independent components, needs a new architectural/design
     decision, or is likely to touch several files/modules.
   - **small** — a single well-understood change (one component, no new architectural decision).

   Say e.g. "I'm treating this as a **large** feature — it needs a new theme system and touches
   CSS + a component + persistence. Say the word to treat it as small instead." The user may
   override; the override wins and re-routes the pipeline.

## Phase 3 — Build the intake review artifact

1. Open every matching playbook before writing HTML: `atelier-axi playbook plan` (primary),
   plus `atelier-axi playbook input` / `comparison` / `diagram` as the artifact needs them.
2. Choose the design source in priority order: (1) a look/design-system the user named; else
   (2) the subject project's design system; else (3) `atelier-axi design` (Tailwind v4 +
   DaisyUI v5, theme `luxury`). State which you used.
3. Write the artifact to `.atelier/<topic>-review.html` in the current working directory. Copy
   any sibling assets next to it and reference them with relative paths (never a leading `/`).
4. Surface EVERY clarifying question from Phase 1 as its own input card, using the `input`
   playbook pattern: native controls with one per-question submit that queues a single final
   answer, and `data-atelier-question` so a re-answer replaces the earlier one in the queue.
   Group the cards (purpose, constraints, success criteria, scope) so the user reviews and
   answers them ALL at once in the browser rather than in a terminal back-and-forth. For a
   UI-facing feature, include sample UI mockups in the subject project's design system to make
   the questions concrete; for a non-UI feature, show questions only — no mockups.

## Phase 4 — Atelier review loop (answers → approaches → decisions → approval)

1. Open the session: `atelier-axi <file>`. Poll for feedback: `atelier-axi poll <file>` — run it
   in the background if your harness limits foreground command time; if it is killed, just
   re-run it (queued feedback is never lost). Leave it running; never kill it deliberately.
2. If the poll returns `layout_warnings`, follow the returned `next_step`: fix fresh
   error-severity findings and re-check BEFORE involving the human; proceed with a note only
   when every current warning is persistent or below error severity.
3. **Collect the user's answers** to the intake questions.
4. **Propose approaches.** Once the questions are answered, update the artifact to present 2-3
   candidate approaches with tradeoffs and your recommendation, using the `comparison` playbook
   (option cards; lead with the recommended one and say why). Revisit decomposition here if the
   answers reveal the scope is larger than it first looked. Let the user pick or annotate an
   approach.
5. **Surface decisions.** On the chosen approach, render every remaining open question, edge
   case, and design option as its own decision card using the `plan` playbook's embedded
   decision-card template (problem → recommendation → example → Accept/Defer control that
   queues exactly one prompt). Add or refresh UI mockups for UI-facing features.
6. Incorporate annotations, update the artifact, and re-open until the user EXPLICITLY approves
   a direction — the approve-the-design gate; do not proceed to a spec or plan without it.
   Track each card as accepted or explicitly deferred.
7. If the poll returns `status: "ended"` with `ended_by: "user"`, stop the loop and do not
   reopen uninvited. Export/preserve the draft artifact, summarize in the terminal what was
   confirmed vs. still open, and ask whether to (a) proceed to durable records from what was
   confirmed (marking unresolved cards as deferred) or (b) hold without writing records.

## Phase 5 — Spec + review loop (LARGE route only; small route skips this phase)

1. Write `spec.md` capturing the confirmed decisions, architecture, components, and an
   explicit edge-case pass.
2. **Self-review first** (your own pass, not a subagent): scan for placeholders/`TBD`, internal
   contradictions, requirements ambiguous enough to build the wrong thing, and whether the
   scope is focused enough for one plan. Fix inline.
3. Dispatch a **fresh spec-reviewer subagent** with the `spec.md` text + confirmed decisions +
   the Spec rubric from `review-rubrics.md` (calibration + output format included). Fix its
   findings.
4. Repeat until a clean pass. Convergence safeguard: after 3 rounds without a clean pass, stop
   and surface the remaining findings to the user for a call.

## Phase 6 — Plan + consistency loop

1. Write `plan.md` following `plan-template.md`: the agentic-worker header, goal / architecture
   / tech stack / global constraints, a **Decisions resolved during review** section (so the
   review's conclusions survive even when the small route keeps no `review.html`), a **File
   Structure** map of every file each task touches, then bite-sized TDD tasks (write failing test
   → run it fail → minimal implementation → run it pass → commit) with exact file paths and
   complete code — written for an engineer with zero context, NO placeholders.
2. **Self-review first** (your own checklist, not a subagent): (a) spec coverage — every spec
   requirement maps to a task; (b) placeholder scan — no `TBD`/"add error handling"/"similar to
   Task N"; (c) type/signature consistency — names used in later tasks match earlier
   definitions. Fix inline.
3. Dispatch a **fresh plan-reviewer subagent** with `spec.md` (if any) + `plan.md` + the Plan
   rubric from `review-rubrics.md` (spec↔plan coverage, project fit, buildability, no
   placeholders). Fix its findings.
4. Repeat until clean, with the same 3-round safeguard.

## Phase 7 — Durable records

Always write durable records under `docs/atelier/<YYYY-MM-DD>-<type>-<topic>/`, relative to the
target project root (create parents). This is the required home for spec/plan output — do not
leave them in `.atelier/` or scattered elsewhere.

1. Export the review artifact — **large route only**:
   `atelier-axi export .atelier/<topic>-review.html --out docs/atelier/<YYYY-MM-DD>-<type>-<topic>/review.html`.
   The small route keeps a reduced record set and skips this export.
2. Write files into `docs/atelier/<YYYY-MM-DD>-<type>-<topic>/` (create parents):
   - **large:** `spec.md` + `plan.md` + `review.html`.
   - **small:** `plan.md` only (no `spec.md`, no `review.html`); `plan.md` is always written so
     the `implementing.md` flow has an executable input.
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
  --description="Add a user-facing dark mode toggle. Spec & plan: docs/atelier/2026-07-02-feature-dark-mode/ (spec.md, plan.md, review.html)"
bd create --title="Add theme CSS variables" --type=task --priority=2 \
  --description="Plan task 1. See docs/atelier/2026-07-02-feature-dark-mode/plan.md (Task 1)"
bd create --title="Add toggle component + persistence" --type=task --priority=2 \
  --description="Plan task 2. See docs/atelier/2026-07-02-feature-dark-mode/plan.md (Task 2)"
bd dep add <task2-id> <task1-id>   # task 2 depends on task 1
bd dep add <task1-id> <epic-id>    # task 1 depends on the epic
```

4. **Commit the finished documents properly.** Once the records are fully written — both routes
   (`plan.md` always; plus `spec.md`/`review.html` on the large route) — commit them as ONE clean
   commit, never half-written drafts. On a feature branch (never `main`/`master` without consent),
   stage exactly the `docs/atelier/<...>/` files and use a clear conventional message — e.g.
   `git switch -c plan/<topic> && git add docs/atelier/<...> && git commit -m "docs(plan): <topic> spec + plan"`.
   Note the branch; the `implementing.md` flow bases the dev worktree on this commit so `plan.md`
   is present. (Records are docs, not implementation code, so committing them here does not violate
   "planning only".)

## Phase 8 — Hand-back & execution offer

1. Give a terminal summary and open a final atelier artifact of the spec + plan.
2. Offer exactly two options: **(1) implement now** — follow `implementing.md` against the
   written `plan.md`; or **(2) defer** — stop cleanly (the durable `plan.md` lets any fresh
   session implement later).
3. Durable records (Phase 7) are complete and committed BEFORE this offer, so both options hand
   off identical artifacts. Never auto-start implementation. On opt-in, the `implementing.md` flow
   sets up an isolated dev worktree (treehouse when available, else a `git worktree`, else a
   feature branch) based on the records commit — it never begins on `main`/`master` without
   explicit consent.

## Session teardown (once planning is complete)

When the user is done — after they defer, or once implementation is under way — tear the review
down cleanly so nothing is left running:

1. **End every atelier session you opened** with `atelier-axi end <file>` — the intake review
   artifact and the final spec+plan artifact. Do this only once the user has confirmed they are
   done, never mid-review, and do not reopen an ended session uninvited.
2. **Stop the server** if you want the port freed immediately: `atelier-axi stop`. (It also
   self-stops once no browser and no poll have been connected for a while, so this is optional.)
3. **Leave no poll running** for an ended session — a finished or killed `poll` is fine; just do
   not start a fresh one after teardown.
4. The dev worktree, if the `implementing.md` flow created one, is torn down there
   (`treehouse return` / `git worktree remove`); planning itself owns no worktree.

## Graceful degradation

- **`atelier-axi` unavailable or the server fails to start** → fall back to a terminal-based
  review of the questions/options and STATE the degradation explicitly; still produce the
  durable files.
- **`bd` unavailable** → write files only, with no error and no beads step.
