Write a detailed technical specification for the feature described below.

<context>
We are building two new **local agent skills** for the `atelier-axi` repository (the project behind the `lavish-axi` CLI, "Lavish Editor"): a planning skill and an execution skill. Together they define a repeatable **feature-planning-and-implementation workflow** that a coding agent runs when a user wants to plan a new feature, fix, or change — in this repository or, once installed via the project's awesome-ai skills registry, in any other project.

The problem it solves: today, feature planning is not a repeatable pipeline. Deep design questions get hashed out as terminal text — a poor medium for reviewing many edge cases and design options at once — and planning tends to happen in the same agent session as implementation, which risks context overflow and leaves no durable record. The project already owns a superior visual review surface, `lavish-axi`, which renders agent-generated HTML artifacts in a browser and lets the user annotate elements/text, queue prompts, and send feedback back to the agent over a long-polling API. That surface is currently not wired into any planning flow. This skill pair wires it in.

Success looks like: a **planning skill** that (1) lightly interviews the user in the terminal to get a general sense of the feature, (2) surfaces all open questions, edge cases, and design options — including sample UI mockups when the feature is UI-facing — inside a single interactive **lavish** HTML artifact for visual review and annotation *before* any spec is written, (3) writes durable, reviewed **spec + plan files**, (4) records them in **beads** (the project's issue tracker) so a later agent can pick the work off the queue, and (5) hands off cleanly — offering to either start implementation immediately via a separate **execution skill** or defer it to a fresh session that invokes that execution skill later by name.

**Where these skills live and how they are built.** They are two new skills authored at the **project root**, under `skills/lavish-plan/` and `skills/lavish-implement/` — sibling directories to the existing `skills/lavish/` (the product's own installable Agent Skill, generated from `src/skill.js`) — proposed names `lavish-plan` and `lavish-implement`; the spec may refine the names. `skills/lavish-plan/` covers intake through the durable spec/plan/beads records and the hand-back offer. `skills/lavish-implement/` is independently triggerable — it executes an existing `plan.md` (fresh subagent per task, review between tasks, TDD) — so a *fresh session* can resume a deferred plan by invoking it directly, without replaying the whole planning flow. `lavish-plan` invokes `lavish-implement` when the user opts into "implement now" at hand-back. Both are prose-driven (`SKILL.md` plus any supporting reference files/templates each needs) and they **orchestrate the existing `lavish-axi` CLI** — they make **no changes to the product's `src/` code**. Both ship inside the published `lavish-axi` npm package, so `package.json`'s `"files"` allowlist and any relevant build/prepack step must include `skills/lavish-plan` and `skills/lavish-implement` alongside the existing `skills/lavish` entry.

**`.agents/skills/` and `.claude/skills/` (a symlink to the former) are out of scope and irrelevant to this task.** They hold vendored, third-party coding-agent tooling committed to this repo for agents' own convenience while working here (the `obra.superpowers.*` skill set, `local.mind-clear`, `local.beads-workflow`, `local.agentsmd-init`, etc.) — none of it is authored by or specific to atelier-axi, and none of it should influence this design. Concretely: do not read it for design inspiration or structural patterns, do not depend on it, do not invoke any skill under it (via a Skill-tool-style call) at runtime from `skills/lavish-plan/` or `skills/lavish-implement/`, and do not treat retiring or narrowing `local.mind-clear` as part of this work — it is simply irrelevant, not a collision to resolve.

**Both skills must be fully self-contained.** Any capability either needs that resembles something a vendored skill also does — an interview pacing pattern, a spec-review loop, a bite-sized TDD plan structure, a fresh-subagent-per-task execution loop — must be **written from scratch directly into that skill's own `SKILL.md` and reference files**, adapted to this workflow. `lavish-plan` becomes THE planning entrypoint for this project going forward; `lavish-implement` is the execution entrypoint for a plan produced by it.

**Relevant `lavish-axi` CLI behavior the skill orchestrates (do not re-implement; call these):**
- `lavish-axi <file.html>` — opens (or resumes) a review session: spawns a detached local server if needed and opens the artifact in the browser. Artifacts should be created in the current working directory under `.lavish/` unless the user specifies otherwise; sibling assets are referenced with relative paths (never a leading `/`).
- `lavish-axi poll <file.html>` — long-polls and stays silent until the user sends feedback, ends the session, or the browser reports fresh `layout_warnings`. Returns JSON/TOON. It must be left running (run it in the background if the harness limits foreground command time); if it is killed it is safe to re-run because queued feedback is never lost. `layout_warnings` must be fixed before involving the human. An `ended` status carries `ended_by` (`user` or `agent`).
- `lavish-axi export <file.html> [--out <path>]` — writes a portable standalone HTML file with LOCAL assets inlined (remote CDN/font refs are left as links). Used to capture the review artifact for the durable record.
- `lavish-axi end <file.html>` — ends a session.
- `lavish-axi playbook <id>` — focused guidance for building artifacts. Relevant playbooks: `input` (collect decisions/choices/scope/triage — the primary one for the review artifact), `comparison` (options and tradeoffs), `plan` (present a plan), `diagram` (Mermaid flows/architecture/state/sequence), `table`, `code`. The skill MUST open each matching playbook before writing HTML.
- Design-source priority for any artifact (per lavish's own rules): (1) a look/design-system the user named; else (2) the design system of the *subject* project the artifact is about — which may differ from the current working directory — its Tailwind/theme config, CSS tokens, component library, or existing styled pages; else (3) the Lavish-recommended Tailwind v4 + DaisyUI v5 browser-runtime CDN (`lavish-axi design`), default theme `luxury`.

**Relevant beads (`bd`) behavior the skill orchestrates (only when `bd` is available in the target project):**
- `bd create --title="…" --description="…" --type=<type> --priority=<0-4>` — create an issue. Built-in types include: `bug`, `feature`, `chore`, `spike`, `story`, `milestone`, `decision`, `epic`, and the default `task`.
- `bd dep add <issue> <depends-on>` — order child tasks so they become ready in sequence.
- Never use `bd edit` (it opens an interactive editor and blocks agents); set fields inline via `--description`/`--notes`/`--design` or `bd update`.

**Subagents.** The skill runs its review loops and (optionally) its implementation as dispatched **subagents** with fresh, isolated context — using the harness's Agent/subagent mechanism — so reviewers do not inherit the planning session's context.
</context>

<user_stories>
- As a developer, I want a **light** terminal interview at the start — just enough to get the general sense of the feature — so I am not interrogated in text before I have seen anything visual.
- As a developer, I want the agent to surface all open questions, edge cases, and design options — **including sample UI mockups when the feature is UI-facing**, each with a plain-English recommendation and a simple example — inside one interactive lavish artifact, so I can review and annotate them visually BEFORE any spec is written.
  - Acceptance: for a non-UI feature the artifact shows questions/edge-cases/decision-cards and NO mockups; for a UI feature it also shows sample mockups rendered in the subject project's design system.
- As a developer, I want to confirm or revise that draft direction in lavish and loop until I am satisfied, so the spec reflects my actual intent.
  - Acceptance: the skill opens the artifact, polls for feedback, incorporates annotations, and re-opens until the user confirms; browser-reported `layout_warnings` are fixed before the user is asked to review.
- As a developer, I want the agent to **auto-classify the feature as small or large**, state its call in plain English with a one-line reason, and proceed — so small changes skip full spec+plan overhead, while I can override the call.
- As a developer, I want durable `spec.md` + `plan.md` plus an exported `review.html` written into a typed, dated folder, so I can implement later in a fresh agent session without context overflow.
  - Acceptance: a large feature produces all three files; a small feature produces a reduced set (e.g. `plan.md` only, or just a beads issue).
- As a developer, I want beads entries created that point back to the files, so another agent can run `bd ready` and implement the work later.
  - Acceptance: beads is written ONLY when `bd` is available in the target project; a large feature yields one `epic` plus one `bd dep`-ordered child `task` per plan task; a small feature yields a single typed issue; every issue's description ends with the repo-relative folder pointer.
- As a developer, I want open questions I choose to defer during the lavish review captured as `decision` issues, so unresolved calls are not lost.
- As a developer, I want the spec and the plan validated by **independent subagent review loops** — one for spec completeness/edge-case coverage, one for spec↔plan consistency and project fit — so the handoff is trustworthy.
- As a developer, at the end of planning I want to be **offered a choice** — begin implementation now via subagent-driven execution, or stop and hand off for a later/fresh session — so I am neither forced into a new session nor silently dropped into implementation.
- As an implementation agent (possibly in a fresh session), I want a self-contained plan with exact tasks and file pointers, so I can build the feature without the planning session's context.
</user_stories>

<constraints>
- **Deliverables are two skill directories, not product runtime code.** `skills/lavish-plan/` and `skills/lavish-implement/` — each SKILL.md plus optional reference files/HTML templates — as siblings of `skills/lavish/` at the project root. Both ship inside the published npm package: add `"skills/lavish-plan"` and `"skills/lavish-implement"` to `package.json`'s `"files"` allowlist alongside the existing `"skills/lavish"` entry, and cover them in the equivalent of the `prepack`/`build` step. Neither MUST modify `atelier-axi`'s `src/` code, add CLI commands, or add lavish playbooks, and neither MUST be placed under `.agents/skills/` or `.claude/skills/` (vendored coding-agent tooling; out of scope for this task, see `<context>`). The "decision card" (a plain-English problem statement + recommendation + example) is realized as a **prose HTML template inside `skills/lavish-plan/`**, not a new product playbook; promotion to a real playbook is explicitly out of scope for v1.
- **Orchestrate, don't reimplement — and only real CLI tools, never other skills.** All browser review, artifact serving, export, and layout auditing is done by calling the existing `lavish-axi` CLI. All issue tracking is done by calling `bd`. Neither skill may invoke, depend on, or be designed to avoid colliding with any skill under `.agents/skills/` or `.claude/skills/` (including `local.mind-clear`, `obra.superpowers.brainstorming`, `obra.superpowers.writing-plans`, `obra.superpowers.subagent-driven-development`) — those are irrelevant vendored tooling, not dependencies. `skills/lavish-plan/` invoking `skills/lavish-implement/` on opt-in is the one exception — both are first-party deliverables of this spec, not vendored skills. Where either skill needs a structural pattern similar to a vendored one, author it fresh inside the owning skill's own files instead of relying on the vendored version.
- **Portability.** Both skills must be installable into other repositories via the project's awesome-ai skills registry and must work in a target project other than `atelier-axi`. Neither may hard-code paths specific to this repo. Both must degrade gracefully when `lavish-axi` or `bd` is unavailable.
- **File output location:** `docs/atelier-plans/<type>/<YYYY-MM-DD>-<topic>/` where `<type>` is the beads type (`feature`, `bug`, `chore`, `spike`, `story`, `epic`, `decision`), `<YYYY-MM-DD>` is today's date, and `<topic>` is a short kebab-case slug. The folder holds `spec.md`, `plan.md`, and the exported `review.html` (subset for small features). Create parent directories as needed; never clobber an existing same-date+topic folder (confirm or suffix).
- **Review loops use dispatched subagents** with fresh, isolated context — the controller constructs exactly the context each reviewer needs; reviewers do not inherit the planning conversation.
- **Plan format:** the implementation plan follows a bite-sized TDD structure defined fresh inside this skill (not inherited from any other skill) — a header stating goal/architecture/tech-stack/global-constraints, then bite-sized TDD tasks (write failing test → run it fails → minimal implementation → run it passes → commit), with exact file paths and complete code in each step and NO placeholders ("TBD"/"add error handling"/"similar to Task N" are plan failures).
- **Implementation is deferred by default and never auto-started.** It runs only on explicit user opt-in, and never begins on `main`/`master` without consent. When the user opts in, `skills/lavish-plan/` invokes the separate `skills/lavish-implement/` skill, which runs a subagent-driven loop (fresh subagent per plan task + a review between tasks) — that loop's instructions live in `skills/lavish-implement/`, NOT duplicated inside `skills/lavish-plan/`, and NOT a dependency on any vendored external skill.
- **Non-goals:** actually implementing the planned feature as part of the default flow; changing `lavish-axi` `src/`; merging this workflow into `skills/lavish/` itself (it ships as its own sibling directories, `skills/lavish-plan/` and `skills/lavish-implement/`); any dependency on `.agents/skills/` or `.claude/skills/` content (irrelevant vendored tooling, including `local.mind-clear`).
</constraints>

<components>
Each component is an independently understandable phase of the skill. Specify for each: its single responsibility, its interface (inputs it consumes / outputs and side effects it produces), and its dependencies.

1. **Intake & Project Context** — Read the target project (README/AGENTS.md/CLAUDE.md/structure/relevant existing code) and run a LIGHT terminal interview to get the general sense of the feature. Output: an internal understanding of purpose, rough scope, and the subject project's design conventions. Depends on: filesystem read access.

2. **Scope Classifier** — Decide small vs large, state the call and a one-line reason to the user, and proceed (user may override). Output: a `small|large` route. Depends on: Intake.

3. **Draft-Review Artifact Builder** — Generate the lavish HTML artifact containing: open questions, edge cases, and design options, each as a plain-English "decision card" (problem + recommendation + simple example); plus sample UI mockups when the feature is UI-facing, rendered in the subject project's design system. Uses the `input`/`comparison`/`plan`/`diagram` playbooks (open each before writing HTML) and the design-source priority. Output: an `.html` file under `.lavish/`. Depends on: Intake, Scope, `lavish-axi playbook`/`design`.

4. **Lavish Review Loop** — Open the artifact (`lavish-axi <file>`), poll for feedback (`lavish-axi poll <file>`), fix any `layout_warnings` before involving the human, incorporate annotations, and re-open until the user confirms the direction. Output: a confirmed set of decisions (+ any questions the user deferred). Depends on: Draft-Review Artifact, `lavish-axi` CLI.

5. **Spec Writer + Review Loop** — Write `spec.md` from the confirmed decisions and the agent's recommendations; run an edge-case coverage pass; dispatch a **subagent spec reviewer** (completeness, consistency, ambiguity, scope, YAGNI); fix findings; repeat until clean. Output: `spec.md`. (Large route only; small route produces a short design confirmation instead.) Depends on: Lavish Review Loop, subagent dispatch.

6. **Plan Writer + Consistency Loop** — Write a bite-sized TDD `plan.md` (writing-plans structure), then dispatch a **subagent reviewer** that checks spec↔plan consistency and fit with the project's conventions; fix findings; repeat until clean. Output: `plan.md`. Depends on: Spec Writer, subagent dispatch.

7. **Records Writer** — Export the review artifact (`lavish-axi export`) to `review.html`; write all files into `docs/atelier-plans/<type>/<date>-<topic>/`; when `bd` is available, create beads entries mapping to the files (large → `epic` + `bd dep`-ordered child `task`s; small → single typed issue; deferred questions → `decision` issues), each with the repo-relative folder pointer in its description. Output: durable files + beads issues. Depends on: Plan Writer (or Scope for small route), `lavish-axi export`, `bd`.

8. **Hand-back & Execution Offer** (part of `skills/lavish-plan/`) — Present a terminal summary plus a final lavish artifact of the spec+plan; then OFFER: (1) begin implementation now by invoking `skills/lavish-implement/` against the written `plan.md`, or (2) stop and hand off for a fresh session (which can invoke `skills/lavish-implement/` later by name). Never auto-start; never begin on `main`/`master` without consent. Output: either a clean stop or a handoff into `skills/lavish-implement/`. Depends on: Records Writer.

9. **Execution Loop** (the separate `skills/lavish-implement/` skill) — Given a `plan.md` path (passed by `lavish-plan` on opt-in, or supplied directly when a fresh session invokes this skill by name), run a fresh-subagent-per-task loop: one subagent executes each plan task with TDD, a review subagent checks the result before the next task starts, and the loop commits frequently. Confirms the working branch before touching `main`/`master`. Output: a completed (or partially completed, on early stop) implementation branch. Depends on: an existing `plan.md`, subagent dispatch. Independently triggerable — does not require having gone through `lavish-plan` in the same session.

(For the **small** route, components 5–6 collapse: the pipeline runs Intake → Scope → a lighter Draft-Review confirmation → a `plan.md` or a single beads issue → Hand-back, skipping the full spec and the heavy review loops. Component 9 applies identically regardless of route, since both routes end in a `plan.md`.)
</components>

<success_criteria>
- Given a large-feature request, the skill produces exactly `spec.md` + `plan.md` + `review.html` inside the correct `docs/atelier-plans/<type>/<date>-<topic>/` folder; given a small-feature request, it produces the reduced set.
- Beads is written if and only if `bd` is available in the target project; each created issue links its files; a large feature yields an `epic` plus one `bd dep`-ordered child `task` per plan task.
- Both review loops are dispatched as subagents with fresh context, and their findings are incorporated before hand-back.
- Durable records (files + beads) are complete BEFORE the execution choice is offered, so "implement now" and "defer" yield identical handoff artifacts.
- No implementation code is written during the default flow; implementation begins only on explicit user opt-in and never on `main`/`master` without consent.
- The produced `plan.md` is self-contained enough that a fresh agent with no planning context can execute it (exact file paths, complete code per step, no placeholders).
- The skill degrades gracefully: if `lavish-axi` is unavailable it falls back to terminal review and states the degradation; if `bd` is unavailable it writes files only without error.
</success_criteria>

<edge_cases>
- **lavish-axi unavailable or the server fails to start** → fall back to a terminal-based review of the questions/options and state the degradation explicitly.
- **beads not set up in the target project** → write files only; do not error.
- **User ends the lavish session early** (`poll` returns `ended` with `ended_by: user`) → stop gracefully, preserve the draft artifact, and do not reopen uninvited.
- **Scope misclassified** → the user's override re-routes the pipeline (small↔large).
- **Non-UI feature** → the review artifact shows questions/edge-cases/decision-cards only, with no mockups.
- **Subject project differs from the current working directory** → inspect the subject project (the product the feature is for) for design conventions, per the lavish design-source priority.
- **Browser reports `layout_warnings`** → fix them before asking the human to review.
- **`docs/atelier-plans/` or a `<type>/` subfolder is missing** → create it.
- **A same-date + same-topic folder already exists** → do not clobber; confirm with the user or append a disambiguating suffix.
- **User opts into "implement now"** → `skills/lavish-plan/` invokes `skills/lavish-implement/`, which runs its fresh-subagent-per-task loop (review between tasks, TDD, frequent commits); confirm the working branch before touching `main`/`master`.
- **A fresh session invokes `skills/lavish-implement/` directly** (no `skills/lavish-plan/` in this session's history) → read the given `plan.md` path and proceed with the execution loop; it does not require any planning-session context.
</edge_cases>

<examples>
Concrete illustration of the Records Writer output for a hypothetical **large** UI feature "Dark mode toggle" planned on 2026-07-02, in a project where `bd` is available:

Files:
```
docs/atelier-plans/feature/2026-07-02-dark-mode/
    spec.md
    plan.md
    review.html
```

Beads (created because `bd` is present):
```
bd create --title="Dark mode toggle" --type=epic --priority=2 \
  --description="Add a user-facing dark mode toggle. Spec & plan: docs/atelier-plans/feature/2026-07-02-dark-mode/ (spec.md, plan.md, review.html)"
# → epic id e.g. proj-42

bd create --title="Add theme CSS variables" --type=task --priority=2 \
  --description="Plan task 1. See docs/atelier-plans/feature/2026-07-02-dark-mode/plan.md (Task 1)"
# → proj-43
bd create --title="Add toggle component + persistence" --type=task --priority=2 \
  --description="Plan task 2. See docs/atelier-plans/feature/2026-07-02-dark-mode/plan.md (Task 2)"
# → proj-44
bd dep add proj-44 proj-43     # task 2 depends on task 1
bd dep add proj-43 proj-42     # tasks belong under the epic
```

Contrast — a **small** fix "Fix login crash" with no full spec:
```
docs/atelier-plans/bug/2026-07-02-login-crash/plan.md      # plan only, no spec.md
```
```
bd create --title="Fix login crash" --type=bug --priority=1 \
  --description="Null deref on empty session. See docs/atelier-plans/bug/2026-07-02-login-crash/plan.md"
```

Contrast — an open question the user deferred during the lavish review becomes a `decision` issue:
```
bd create --title="Should the toggle persist per-device or per-account?" --type=decision --priority=2 \
  --description="Deferred during planning of docs/atelier-plans/feature/2026-07-02-dark-mode/. Needs a product call before implementation."
```
</examples>

<output_format>
Structure the specification as follows. Reason through each component inside `<thinking>` tags BEFORE writing its section; `<thinking>` is reasoning scaffolding only and must be stripped from the final deliverable.

# Feature: [Name]

## Overview
[2–3 sentences: what this skill does and why it exists.]

## Skill Shape
[Where each skill lives (`skills/lavish-plan/` and `skills/lavish-implement/` at the project root, siblings of `skills/lavish/` — NOT under `.agents/skills/` or `.claude/skills/`), the files each comprises (SKILL.md + any reference templates/scripts), each one's trigger/description, the npm packaging change (`package.json` `"files"` + build step), and how `lavish-plan` hands off to `lavish-implement`. Do not discuss `local.mind-clear` or any other `.agents/`/`.claude/` skill — they are irrelevant vendored tooling, out of scope for this spec.]

## Components

<thinking>
[For each component below, reason first: what it must do, which failure modes it handles, and how its completion is verified. Strip this from the final deliverable.]
</thinking>

### [Component Name]
#### Responsibility
#### Interface
[Inputs consumed; outputs and side effects produced — exact CLI calls made, exact files written, exact beads commands issued.]
#### Success Criteria
#### Edge Cases

## File & Record Layout
[The exact `docs/atelier-plans/<type>/<date>-<topic>/` structure, the small-route subset, and the beads type→entry mapping with file-pointer convention.]

## Small vs. Large Routing
[How the classifier decides, what it tells the user, and how each route flows.]

## Review Loops
[How the spec reviewer and the spec↔plan consistency reviewer are dispatched as subagents, what context each receives, and the fix-and-re-review loop.]

## Hand-back & Execution
[The terminal + lavish summary, the two-option offer from `skills/lavish-plan/`, how it invokes `skills/lavish-implement/` on opt-in (what gets passed, e.g. the `plan.md` path), and `skills/lavish-implement/`'s own fresh-subagent-per-task execution loop — including how it works when invoked independently by a fresh session.]

## Dependencies
[External tools the skill orchestrates: `lavish-axi` CLI, `bd`, subagent dispatch — and graceful-degradation behavior when each is absent.]

## Non-Goals
[Explicitly: no `src/` changes; no new product playbook; not merged into `skills/lavish/` (ships as its own sibling directory instead); implementation not part of the default flow; no dependency on or reference to any `.agents/skills/`/`.claude/skills/` content, including `local.mind-clear`.]

## External Decisions Pending
[List ONLY items requiring a decision from outside this spec. Omit the section entirely if empty.]
</output_format>

<task>
Write a detailed technical specification for the feature described in <context> and <user_stories>: two new local agent skills, `skills/lavish-plan/` and `skills/lavish-implement/`, for the `atelier-axi` repository that together drive a lavish-integrated feature-planning-and-implementation workflow. Honor every item in <constraints>, <components>, <success_criteria>, and <edge_cases>. For each component, first work through your analysis inside `<thinking>` tags — what the component must do, which failure modes it handles, and how its completion will be verified — then write the spec section. Follow <output_format> exactly, and strip all `<thinking>` blocks from the final deliverable. Produce no implementation code and no placeholders; every section must contain concrete, verified specifics.
</task>
