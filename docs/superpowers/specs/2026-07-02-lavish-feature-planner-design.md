# Feature: Lavish Feature Planner

## Overview

The Lavish Feature Planner turns `lavish-axi` into a repeatable, visual feature-planning
pipeline. It is a **hybrid** of three deliverables: (1) an enrichment of the existing
`plan` playbook in `src/playbooks.js` so any agent that opens `lavish-axi playbook plan`
gets full feature-planner guidance (surface open questions and edge cases as an
annotatable review surface *before* a spec exists, using an embedded decision-card HTML
template, then produce a spec and a bite-sized TDD plan); (2) a prose driver skill
`skills/lavish-plan/` that runs the imperative end-to-end pipeline a declarative playbook
cannot express (light interview → scope classification → build the review artifact → lavish
review loop → durable `spec.md`/`plan.md` → beads records → hand-back offer); and (3) a
prose execution skill `skills/lavish-implement/` that executes an existing `plan.md` with a
fresh-subagent-per-task TDD loop and is independently triggerable from a fresh session.
It exists because feature planning today is not a repeatable pipeline — deep design
questions get argued in terminal text (a poor medium for reviewing many edge cases at
once) and planning happens in the same session as implementation, risking context overflow
and leaving no durable record. `lavish-axi` already owns a superior visual review surface
and composable playbooks; this work wires them into a defined flow without changing any
runtime `src/` behavior.

## Product Changes (`src/`)

All `src/` changes are **guidance data plus one help pointer** — no runtime behavior
(server, poll, export, SDK, CLI commands) changes, no playbook is added or removed, and the
count stays `playbooks[7]`.

### 1. Enrich the `plan` object in `src/playbooks.js`

Replace each field of the existing `plan` playbook (id unchanged, position unchanged) with
the enriched content below. The `code` playbook already embeds a full HTML snippet in its
`design_rules[]`, so embedding the decision-card template here is a precedented pattern.

**`use_when`** — the recommended value from the prompt (adopted verbatim):

```
"Plan a feature, fix, or change before implementation: surface open questions and edge cases for review, then produce a spec and implementation plan"
```

**`choose[]`** — distinguish the full planning arc from a light single-decision plan:

```js
choose: [
  "Use the full planning arc when the change is non-trivial: first surface every open question, edge case, and design option as an annotatable review surface, converge with the user, then produce a spec and a bite-sized implementation plan.",
  "Use a lighter single-decision plan when the change is one well-understood option: show the proposal and its few open questions, confirm, and produce just an implementation plan.",
  "Use the 'comparison' or 'diagram' playbook alone when the artifact is only a single design choice or a relationship map, not a plan that needs a spec.",
]
```

**`structure[]`** — encode the pre-spec review phase, convergence, then spec→plan:

```js
structure: [
  "Open with a light framing: the goal, the current state, and the desired behavior in a few sentences - do not interrogate before the user has seen anything visual.",
  "Before writing any spec, surface EXHAUSTIVELY: every open question, every edge case, and every design option, each as its own decision card the user can accept or defer individually.",
  "Converge on the surfaced decisions first; only after the user confirms the direction do you write the spec, then a bite-sized TDD implementation plan derived from it.",
  "Structure the plan as bite-sized TDD tasks - write a failing test, run it and see it fail, add the minimal implementation, run it and see it pass, commit - with exact file paths and complete code in every step.",
  "End the plan self-contained enough that another developer, or a fresh agent session with no planning context, can implement it without asking a follow-up question.",
]
```

**`design_rules[]`** — verify-claims rule retained; add the embedded decision-card template
and the subject-design-system mockup rule:

```js
design_rules: [
  "Verify each claim against the codebase before presenting it as fact.",
  "Render each open question, edge case, and design option as a self-contained decision card: a plain-English problem statement, a highlighted recommendation, and a short concrete example, plus Accept/Defer controls that queue exactly one prompt for the decision. Restyle the card to the subject project's design system (or DaisyUI via `lavish-axi design`). Reusable template:\n```html\n<!-- Decision card: one open question / edge case / option. Restyle to the subject project's design system. -->\n<form class=\"decision-card\" data-lavish-question=\"theme-scope\"\n      onsubmit=\"event.preventDefault();\n        const f = new FormData(event.currentTarget);\n        const decision = f.get('decision');            // 'accept' | 'defer'\n        const note = (f.get('note') || '').toString().trim();\n        if (!decision) return;\n        window.lavish.queuePrompt(\n          'Decision [Theme scope]: ' + decision + (note ? ' - ' + note : ''),\n          { tag: 'decision', text: 'Theme scope: ' + decision, element: event.currentTarget,\n            data: { question: 'theme-scope', decision, note } });\">\n  <h3 class=\"decision-card__title\">Should the toggle persist per-device or per-account?</h3>\n  <p class=\"decision-card__problem\">Users on multiple devices may expect the theme to follow them, but per-account persistence needs a settings API we do not have yet.</p>\n  <p class=\"decision-card__reco\"><strong>Recommendation:</strong> Start per-device (localStorage) - it ships without a backend change and covers the common single-device case.</p>\n  <pre class=\"decision-card__example\"><code>localStorage.setItem('theme', 'dark')  // per-device, no API</code></pre>\n  <fieldset class=\"decision-card__controls\">\n    <label><input type=\"radio\" name=\"decision\" value=\"accept\"> Accept recommendation</label>\n    <label><input type=\"radio\" name=\"decision\" value=\"defer\"> Defer (needs a product call)</label>\n    <input type=\"text\" name=\"note\" placeholder=\"Optional note or counter-proposal\">\n    <button type=\"submit\">Queue this decision</button>\n  </fieldset>\n</form>\n```",
  "When the feature is UI-facing, add a sample UI mockup alongside the relevant decision cards and render it in the SUBJECT project's design system (its Tailwind/theme config, CSS tokens, component library, or existing styled pages), following the design-source priority. When the feature is NOT UI-facing, show questions, edge cases, and decision cards only - no mockups.",
  "The plan and spec must be self-contained enough that another developer can read them and fully implement the proposal without the planning conversation.",
]
```

**`pitfalls[]`** — the three failure modes the prompt names:

```js
pitfalls: [
  "Do not write the spec before the review surface is confirmed - surface and converge on the open questions and edge cases first.",
  "Do not leave open questions unresolved and unlabeled: every card must end accepted or explicitly deferred, and deferred questions must be captured (as decision records) rather than dropped.",
  "Do not leave placeholders in the plan. 'TBD', 'add error handling', or 'similar to Task N' are plan failures - every task carries exact file paths and complete code.",
  "Do not leave resolved open questions in the artifact. Update the content to reflect the decision and remove the question.",
]
```

**`lavish_notes[]`** — individual annotatability, accept/defer, cross-references:

```js
lavish_notes: [
  "Make each question, edge case, and option an individual annotation target with its own Accept/Defer control, so the user resolves them one at a time in the review loop.",
  "Build the accept/defer and option-selection controls with the 'input' playbook pattern (native controls, one per-question submit that queues a single final prompt); use 'comparison' for option cards with tradeoffs and 'diagram' (Mermaid) for flows, architecture, state, or sequence views.",
  "A deferred card should queue a prompt clear enough to become a standalone decision to resolve before implementation.",
]
```

### 2. Add a SessionStart help pointer in `createHomeOutput()` (`src/cli.js`)

Insert one entry into the `help[]` array returned by `createHomeOutput()` (currently
`src/cli.js:134-146`), placed immediately after the existing `playbook` help line
(`src/cli.js:143`) so it rides along at every SessionStart and in the no-args output:

```
"To plan a feature or change before building it, run `lavish-axi playbook plan`: surface the open questions and edge cases as a visual review surface first, converge with the user, then produce a spec and a bite-sized implementation plan."
```

### 3. Planning note in the design router (`src/design-reference.js`)

Add a one-line `planning` note to the `playbook_router` object returned by
`createDesignOutput()` (`src/design-reference.js:87`), for discoverability from
`lavish-axi design`. This is **in scope, not optional** — the tests assert it unconditionally:

```js
playbook_router: {
  instruction: PLAYBOOK_ROUTER_INSTRUCTION,
  planning: "To plan a feature or change, open the `plan` playbook: surface open questions and edge cases for visual review first, then produce a spec and implementation plan.",
  playbooks: listPlaybooks(),
}
```

### 4. Build & test ripple (must keep `pnpm run check` green)

Broadening the `plan` `use_when` changes the generated `skills/lavish/SKILL.md`
(line 59: `` - `plan` - <use_when> ``), so the ripple is mandatory:

- **Regenerate the skill:** run `pnpm run build:skill` (`scripts/build-skill.js`) and commit
  the regenerated `skills/lavish/SKILL.md`. `pnpm run check` runs
  `node scripts/build-skill.js --check` and fails if the committed file is stale.
- **`test/cli-output.test.js`:**
  - Update the exact-string assertion at **line 262** — replace
    `"Explain a product or technical plan before implementation"` with the new `use_when`.
    (Grep confirms this is the ONLY occurrence of the old string in the test suite.)
  - **Update the existing `"plan playbook detail output has polished guidance copy"` test
    (lines 318-323).** It asserts
    `output.playbook.structure.some((item) => item.includes("Then describe a proposed approach"))`,
    a phrase the enriched `structure[]` removes — left as-is it fails `pnpm run check`. Repoint
    it to a phrase the new `structure[]` contains (e.g. `"bite-sized TDD tasks"`) or fold it
    into the new enriched-plan test below and delete it.
  - Add an assertion in the `createHomeOutput()` test that
    `output.help.some((item) => item.includes("lavish-axi playbook plan"))` (covers the new
    help pointer).
  - Add a new TDD test `createPlaybookOutput(["plan"])` asserting the enriched fields:
    `use_when` equals the new string; `choose` mentions the full planning arc;
    `structure` mentions surfacing open questions/edge cases before the spec and bite-sized
    TDD tasks; `design_rules` includes `decision-card` / `data-lavish-question` /
    `queuePrompt` and the subject-design-system mockup rule; `pitfalls` names placeholders
    (`TBD`) and "before the review surface is confirmed"; `lavish_notes` names Accept/Defer
    and cross-references `input`/`comparison`/`diagram`.
  - The `assert.equal(output.playbooks.length, 7)` / id-order assertions (lines 176, 255-259)
    stay unchanged and must still pass (count and order are preserved).
  - Assert the design-router `planning` note (change 3) exists in the `createDesignOutput()`
    test: `output.playbook_router.planning`.
- **`test/skill.test.js`:** the loop at **line 52** (`md.includes(playbook.use_when)` for
  every playbook) is data-driven and auto-covers the new `use_when` once SKILL.md is
  regenerated. Add one explicit assertion that the regenerated `SKILL.md` includes the
  planning phrase (e.g. `surface open questions and edge cases`). No hardcoded old `plan`
  string exists in this file to update.
- **`package.json`:** add `"skills/lavish-plan"` and `"skills/lavish-implement"` to the
  `"files"` array (currently `package.json:10-16`, alongside `"skills/lavish"`).
- **`test/package-json.test.js`:** re-run; if it asserts *membership* of `skills/lavish`
  it still passes unchanged; if it asserts an *exact* `files` array, extend it to include
  the two new entries.
- **`README.md`:** add a short "Feature planning" note near the playbook table
  (`README.md:184-191`) documenting `lavish-axi playbook plan` → surface open questions and
  edge cases → spec + plan, and mentioning the `lavish-plan` / `lavish-implement` skills.
  The playbook-ID list at line 189 is unchanged (`plan` still present); grep confirms no stale
  `plan` `use_when` wording lives elsewhere in `README.md`.
- **Prettier (`format:check`):** `skills/` is **not** in `.prettierignore` (which lists
  `dist`, `node_modules`, `.agents`, `.lavish`, etc.), so the new hand-authored
  `skills/lavish-plan/*.md` and `skills/lavish-implement/SKILL.md` are format-checked. Run
  `pnpm run format` (or `prettier --write skills/lavish-plan skills/lavish-implement`) before
  `pnpm run check`, or Prettier fails `format:check` on the first unformatted write.

## Skill Shape

Both new skills are **prose skills authored at the project root as siblings of
`skills/lavish/`** — NOT under `.agents/skills/` or `.claude/skills/`. They ship inside the
published npm package via the `files` additions above and are installable in any target
project through the awesome-ai skills registry. Neither skill invokes, depends on, or is
designed to avoid colliding with any vendored `.agents/`/`.claude/` skill; the *only*
allowed inter-skill call is `lavish-plan` invoking `lavish-implement` on user opt-in (both
are first-party deliverables of this spec). Where a structural pattern resembles a vendored
skill, it is authored fresh inside the owning skill. Neither skill hard-codes any
`atelier-axi`-specific path: all paths are relative to the target project (the
`docs/atelier-plans/` output root and the artifact's `.lavish/` directory are created wherever
the skill runs).

### `skills/lavish-plan/` (driver)

- `SKILL.md` — the imperative driver: frontmatter (name `lavish-plan`; description keyed to
  "plan a feature/change/fix," "surface open questions and edge cases visually," "produce a
  spec and implementation plan"), then the ordered pipeline B1→B8 (intake, scope
  classification, build the review artifact, lavish review loop, spec + review, plan +
  consistency review, records writer, hand-back offer), plus the graceful-degradation rules.
- `plan-template.md` — the canonical bite-sized-TDD `plan.md` skeleton (header:
  goal/architecture/tech-stack/global-constraints; then numbered TDD tasks). Authored fresh
  here; `lavish-plan` owns the plan format.
- `review-rubrics.md` — the two subagent review checklists (spec completeness/edge-case
  coverage/ambiguity/scope/YAGNI; and spec↔plan consistency/project-fit/no-placeholders),
  loaded on demand when dispatching reviewers.

### `skills/lavish-implement/` (execution)

- `SKILL.md` — a single self-contained file with frontmatter (name `lavish-implement`;
  description keyed to "execute / implement an existing `plan.md`," "run a written
  implementation plan," "resume a deferred plan" so a fresh session discovers and triggers
  it by name): given a `plan.md` path, run the fresh-subagent-per-task TDD loop with a review
  subagent between tasks and frequent commits; confirm the working branch before touching
  `main`/`master`. Independently triggerable — a fresh session invokes it by name with just a
  `plan.md` path.

### Hand-off

At B8, `lavish-plan` offers two choices. On "implement now" it invokes
`skills/lavish-implement/`, passing the repo-relative **`plan.md` path** (the durable record
already written in B7). On "defer" it stops cleanly; the same `plan.md` lets any later/fresh
session invoke `lavish-implement` directly. Because durable records are complete before the
offer, both branches hand off identical artifacts.

## Components

### A1 — `plan` Playbook Enrichment

#### Responsibility
Encode the full feature-planner arc in the existing `plan` playbook object so
`lavish-axi playbook plan` returns it, in this repo and any project with `lavish-axi`
installed, with no separate skill required.

#### Interface
- **Edits:** `src/playbooks.js` — the `plan` object's `use_when`, `choose[]`, `structure[]`,
  `design_rules[]` (embedding the decision-card HTML template), `pitfalls[]`, `lavish_notes[]`
  per "Product Changes §1." Id and array position unchanged.
- **Outputs:** enriched guidance surfaced through `findPlaybook("plan")` /
  `createPlaybookOutput(["plan"])` and (id + use_when only) `listPlaybooks()`.

#### Success Criteria
`createPlaybookOutput(["plan"]).playbook` exposes the new `use_when`, the decision-card
template string, edge-case-exhaustiveness language, and the spec→plan convention; the other
six playbooks are byte-identical and the count stays 7.

#### Edge Cases
- Embedded HTML in a `design_rules[]` string must keep valid JS string escaping (backticks
  and `${}` inside the template are escaped or the template avoids them) — the `code`
  playbook precedent shows the pattern.
- Changing `use_when` (not internals) is what ripples SKILL.md; A2 handles the regen.

### A2 — Guidance Surfacing, Regen, Tests & Packaging

#### Responsibility
Make the flow discoverable at SessionStart, keep the generated skill in sync, cover the new
guidance with tests, and package the two new skills.

#### Interface
- **Edits:** `createHomeOutput()` `help[]` pointer (`src/cli.js`); optional `playbook_router`
  `planning` note (`src/design-reference.js`); `package.json` `files`; `test/cli-output.test.js`,
  `test/skill.test.js`, `test/package-json.test.js`; `README.md`.
- **Commands:** `pnpm run build:skill` (regenerate `skills/lavish/SKILL.md`);
  `pnpm run check` to verify.

#### Success Criteria
`pnpm run check` passes (build + lint + format:check + typecheck + test + `build-skill.js
--check`); `createHomeOutput().help` includes the `lavish-axi playbook plan` pointer, asserted
in `test/cli-output.test.js`; `package.json` `files` includes both new skill dirs.

#### Edge Cases
- Forgetting `pnpm run build:skill` → `build-skill.js --check` fails the build (intended
  guardrail).
- `test/package-json.test.js` asserting an exact array (not membership) → extend it.

### B1 — Intake & Project Context

#### Responsibility
Understand the feature and the **subject** project's design conventions with a *light*
terminal interview — just enough to proceed to a visual surface.

#### Interface
- **Inputs (read-only):** target project `README`/`AGENTS.md`/`CLAUDE.md`, directory
  structure, relevant existing code, and (for UI features) design system (Tailwind/theme
  config, CSS tokens, component library, styled pages) — the subject project may differ from
  the current working directory.
- **Interview:** phased, one question at a time, review-sized — enough to get the general
  sense; do not interrogate before anything visual exists.
- **Output:** internal understanding of purpose, rough scope, and design conventions.

#### Success Criteria
Proceeds to B2 with a stated purpose and identified design source, having asked only a light
set of questions.

#### Edge Cases
- Subject project ≠ cwd → inspect the subject project for conventions (design-source priority).
- No design system found anywhere → fall back to `lavish-axi design` (Tailwind v4 + DaisyUI
  v5, `luxury`) and say so.

### B2 — Scope Classifier

#### Responsibility
Auto-classify the feature `small` or `large`, state the call in plain English with a one-line
reason, and proceed — user may override.

#### Interface
- **Heuristic:** **large** if the change spans multiple independent components, requires a new
  architectural/design decision, or is likely to touch several files/modules; **small** if it
  is a single well-understood change (one component, no new architectural decision).
- **Output:** a route (`small` | `large`) plus the one-line reason, shown to the user with an
  override affordance.

#### Success Criteria
The call and reason are stated; a user override re-routes the pipeline (small↔large).

#### Edge Cases
- Misclassification → user override wins, no re-derivation.

### B3 — Draft-Review Artifact Builder

#### Responsibility
Build the pre-spec lavish HTML review artifact: every open question, edge case, and design
option as decision cards (from A1's embedded template), plus sample UI mockups when UI-facing.

#### Interface
- **Commands:** `lavish-axi playbook plan` (primary) and `lavish-axi playbook input`
  / `comparison` / `diagram` as the artifact draws on each — MUST open every matching playbook
  before writing HTML; `lavish-axi design` only if no design system was found.
- **Design source:** the priority order (user-named → subject project → Lavish CDN fallback).
- **Output:** an `.html` under the cwd's `.lavish/` (assets copied siblings, referenced with
  relative paths, never a leading `/`).

#### Success Criteria
Non-UI feature → cards only, no mockups. UI feature → cards **and** sample mockups in the
subject project's design system. Each card is an individual annotation target with Accept/Defer.

#### Edge Cases
- `lavish-axi` unavailable → B4 degradation (terminal review) applies; still produce the
  question/edge-case/option list in text.

### B4 — Lavish Review Loop

#### Responsibility
Drive the visual review to convergence.

#### Interface
- **Commands:** `lavish-axi <file>` (open/resume), `lavish-axi poll <file>` (long-poll; run in
  background if the harness limits foreground time; safe to re-run — queued feedback is never
  lost). Fix browser-reported `layout_warnings` (error-severity, fresh) **before** asking the
  human; re-open after incorporating annotations; loop until the user confirms.
- **Output:** confirmed decisions and the set of deferred questions.

#### Success Criteria
Annotations are incorporated and the artifact re-opened until confirmation; layout warnings
are resolved before human review.

#### Edge Cases
- `poll` returns `ended` with `ended_by: user` → stop the review loop gracefully and do not
  reopen uninvited. Export/preserve the draft review artifact, then summarize in the terminal
  which decisions were confirmed vs. still open and ask the user whether to (a) proceed to
  durable records from what was confirmed, marking every unresolved card as deferred (→
  `decision` issues), or (b) hold without writing records. Never presume completion from a
  partial review.
- `lavish-axi` unavailable / server fails to start → fall back to a terminal-based review of
  the questions/options and **state the degradation explicitly**.

### B5 — Spec Writer + Review Loop (large route)

#### Responsibility
Write `spec.md` and validate it via an independent subagent reviewer.

#### Interface
- **Writes:** `spec.md` in the target folder (see File & Record Layout).
- **Subagent:** dispatch a **spec-reviewer subagent** (fresh, isolated context constructed by
  the controller from `review-rubrics.md`): completeness, consistency, ambiguity, scope, YAGNI,
  edge-case coverage. Fix findings; repeat until clean.
- **Small route:** **B5 is skipped entirely.** The lighter B3/B4 pass owns the confirmation —
  small still builds and opens a lavish artifact (fewer decision cards, no UI mockups unless the
  change is UI-facing), just without a `spec.md` or the spec-reviewer loop.

#### Success Criteria
Large route yields a `spec.md` whose reviewer pass is clean; reviewer runs as a subagent that
does not inherit the planning conversation.

#### Edge Cases
- Reviewer keeps finding gaps → iterate; the loop is fix-and-re-review, bounded by a clean
  pass. After 3 rounds without a clean pass, stop and surface the remaining findings to the
  user rather than looping indefinitely.

### B6 — Plan Writer + Consistency Loop

#### Responsibility
Write the bite-sized TDD `plan.md` and validate spec↔plan consistency + project fit.

#### Interface
- **Writes:** `plan.md` from `plan-template.md` — header (goal/architecture/tech-stack/global
  constraints) then numbered TDD tasks (failing test → run fail → minimal impl → run pass →
  commit) with **exact file paths and complete code, no placeholders**.
- **Subagent:** dispatch a **plan-reviewer subagent** (fresh context) for spec↔plan consistency,
  project fit, and a no-placeholder scan. Fix findings; repeat until clean.

#### Success Criteria
`plan.md` is self-contained enough for a fresh `lavish-implement` session; the consistency
reviewer pass is clean; `TBD`/"add error handling"/"similar to Task N" appear nowhere.

#### Edge Cases
- Plan drifts from spec → reviewer flags; fix before proceeding. After 3 rounds without a
  clean pass, surface remaining findings to the user instead of looping.

### B7 — Records Writer

#### Responsibility
Produce the durable record: exported review artifact, spec/plan files in the typed dated
folder, and beads entries when `bd` is available.

#### Interface
- **Commands:** `lavish-axi export <file> --out docs/atelier-plans/<type>/<date>-<topic>/review.html`.
- **Writes:** `spec.md` (large only) + `plan.md` into
  `docs/atelier-plans/<type>/<YYYY-MM-DD>-<topic>/`, creating parent dirs; never clobber an
  existing same-date+topic folder (ask to reuse/overwrite, else write a `<topic>-2`/`-3`
  sibling — see Edge Cases).
- **Beads (only if `bd` present):** large → one `epic` + one `bd dep`-ordered child `task` per
  plan task; small → a single typed issue; each deferred question → a `decision` issue. Every
  issue's `--description` ends with the repo-relative folder pointer. Never `bd edit`.

#### Success Criteria
Large → `spec.md` + `plan.md` + `review.html` in the correct folder; small → the reduced set.
Beads written iff `bd` present; each issue links its files; large yields epic + dep-ordered
child tasks.

#### Edge Cases
- `docs/atelier-plans/` or `<type>/` missing → create it (parents too).
- Same-date+topic folder exists → never clobber; ask the user whether to reuse/overwrite that
  folder or write a disambiguated sibling (`<topic>-2`, `-3`); default to the suffixed sibling
  when the user cannot be asked.
- Records requested after an early user-end (B4 case a) → write from confirmed decisions only,
  emitting each unresolved card as a `decision` issue.
- `bd` absent → write files only, no error.

### B8 — Hand-back & Execution Offer

#### Responsibility
Summarize and offer the execution choice without ever auto-starting implementation.

#### Interface
- **Outputs:** a terminal summary plus a final lavish artifact of spec+plan; then an OFFER of
  exactly two options: (1) invoke `skills/lavish-implement/` against the written `plan.md`, or
  (2) stop and hand off for a fresh session.
- **On opt-in:** invoke `lavish-implement` with the `plan.md` path; confirm the working branch —
  never begin on `main`/`master` without consent.

#### Success Criteria
Durable records exist **before** the offer, so both options yield identical handoff artifacts;
implementation never auto-starts.

#### Edge Cases
- User picks "defer" → clean stop; `plan.md` remains executable later.
- User picks "implement now" on `main`/`master` → require explicit branch consent first.

### C1 — Execution Loop (`skills/lavish-implement/`)

#### Responsibility
Execute an existing `plan.md` with a fresh-subagent-per-task TDD loop, independently of any
planning context.

#### Interface
- **Input:** a `plan.md` path (from `lavish-plan` on opt-in, or supplied directly by a fresh
  session invoking this skill by name).
- **Loop:** per task, dispatch an implementer subagent (TDD: failing test → impl → passing
  test), then a review subagent before the next task; commit frequently. Confirm the working
  branch before touching `main`/`master`.
- **Output:** a completed or partially completed implementation branch.

#### Success Criteria
Runs identically whether invoked by `lavish-plan` or by a fresh session with no planning
history; requires no planning-session context beyond the `plan.md`.

#### Edge Cases
- Fresh session, no `lavish-plan` history → read the given `plan.md` and proceed.
- On `main`/`master` without consent → stop and ask before writing code.

## File & Record Layout

Output folder: `docs/atelier-plans/<type>/<YYYY-MM-DD>-<topic>/` where `<type>` is the beads
type (`feature`, `bug`, `chore`, `spike`, `story`, `epic`, `decision`), `<YYYY-MM-DD>` is
today's date, `<topic>` a short kebab-case slug. Create parents as needed; never clobber a
same-date+topic folder (ask to reuse/overwrite, else write a `<topic>-2`/`-3` sibling).

**Large route:**
```
docs/atelier-plans/feature/2026-07-02-dark-mode/
    spec.md
    plan.md
    review.html
```
```
bd create --title="Dark mode toggle" --type=epic --priority=2 \
  --description="Add a user-facing dark mode toggle. Spec & plan: docs/atelier-plans/feature/2026-07-02-dark-mode/ (spec.md, plan.md, review.html)"        # -> proj-42
bd create --title="Add theme CSS variables" --type=task --priority=2 \
  --description="Plan task 1. See docs/atelier-plans/feature/2026-07-02-dark-mode/plan.md (Task 1)"   # -> proj-43
bd create --title="Add toggle component + persistence" --type=task --priority=2 \
  --description="Plan task 2. See docs/atelier-plans/feature/2026-07-02-dark-mode/plan.md (Task 2)"   # -> proj-44
bd dep add proj-44 proj-43     # task 2 depends on task 1
bd dep add proj-43 proj-42     # task 1 depends on the epic (chain: epic -> task 1 -> task 2)
```

**Small route (reduced set — the adopted default):** `plan.md` only (no `spec.md`, no
`review.html`) + one typed issue when `bd` is present. Always write `plan.md` so
`lavish-implement` has an executable input; "just a beads issue, no `plan.md`" applies only to
a trivial one-liner where the beads description *is* the plan.
```
docs/atelier-plans/bug/2026-07-02-login-crash/plan.md
```
```
bd create --title="Fix login crash" --type=bug --priority=1 \
  --description="Null deref on empty session. See docs/atelier-plans/bug/2026-07-02-login-crash/plan.md"
```

**Deferred question → `decision` issue:**
```
bd create --title="Should the toggle persist per-device or per-account?" --type=decision --priority=2 \
  --description="Deferred during planning of docs/atelier-plans/feature/2026-07-02-dark-mode/. Needs a product call before implementation."
```

**Beads type → entry mapping:** large → `epic` + `bd dep`-ordered child `task`s (one per plan
task); small → single issue typed to the change (`bug`/`chore`/etc.); deferred question →
`decision`. Every `--description` ends with the repo-relative folder or file pointer. Beads is
written **iff** `bd` is available; otherwise files only, no error.

## Small vs. Large Routing

**Heuristic (component/file-count based):** **large** if the feature spans multiple independent
components, requires a new architectural/design decision, or is likely to touch several
files/modules; **small** if it is a single well-understood change (one component, no new
architectural decision).

**What the classifier tells the user:** "I'm treating this as a **large** feature — it needs a
new architectural decision (the theme system) and touches CSS + a new component + persistence.
Say the word if you'd rather I treat it as small." The call is stated with its one-line reason;
the user can override to re-route.

**Large flow:** B1 → B2(large) → B3 (full review surface) → B4 (review loop) → B5 (spec +
reviewer) → B6 (plan + reviewer) → B7 (`spec.md` + `plan.md` + `review.html` + epic/tasks) → B8.

**Small flow:** B1 → B2(small) → a lighter B3/B4 pass that **still builds and opens a lavish
artifact** (the few decision cards; UI mockups only if the change is UI-facing) and confirms →
**skip B5 entirely** → B6-style `plan.md` (no `spec.md`, no spec-review loop) → B7 (`plan.md` +
single issue) → B8. C1 applies identically to both routes since both end in a `plan.md`.

## Review Loops

Both review passes run as **dispatched subagents with fresh, isolated context** — the B5/B6
controller constructs exactly the context each reviewer needs (from `review-rubrics.md`), so
reviewers never inherit the planning conversation.

- **Spec reviewer (B5, large route):** receives the `spec.md` text and the confirmed decisions;
  checks completeness, internal consistency, ambiguity, scope/decomposition, YAGNI, and
  edge-case coverage; returns findings. The controller fixes them and re-dispatches until a
  clean pass.
- **Spec↔plan consistency reviewer (B6):** receives `spec.md` + `plan.md`; checks that every
  spec requirement maps to plan tasks, that the plan fits the project's conventions, and that no
  placeholders remain (`TBD`/"add error handling"/"similar to Task N"); returns findings. The
  controller fixes them and re-dispatches until clean.

The loop is fix-and-re-review, bounded by a clean pass rather than a fixed iteration count.
**Convergence safeguard:** if a reviewer still returns findings after 3 rounds, stop looping
and surface the remaining findings to the user for a call rather than looping indefinitely.

## Hand-back & Execution

At B8, `lavish-plan` presents a terminal summary and a final lavish artifact of the spec+plan,
then offers exactly two options:

1. **Implement now** — `lavish-plan` invokes `skills/lavish-implement/`, passing the
   repo-relative **`plan.md` path**. `lavish-implement` confirms the working branch (never
   begins on `main`/`master` without consent), then runs its fresh-subagent-per-task loop: for
   each plan task, an implementer subagent executes it with TDD (write failing test → run it
   fail → minimal implementation → run it pass), a review subagent checks the task before the
   next one, and commits happen frequently.
2. **Defer** — clean stop. The durable `plan.md` (written in B7 before the offer) lets any
   later or fresh session invoke `skills/lavish-implement/` directly with the `plan.md` path and
   build the feature with no planning-session context. Because records are complete before the
   offer, "implement now" and "defer" produce identical handoff artifacts.

Implementation is **deferred by default and never auto-started**; it runs only on explicit
opt-in.

## Dependencies

External tools orchestrated (never re-implemented):
- **`lavish-axi` CLI** — all browser review, artifact serving, `poll`, `export`, `end`, and
  layout auditing. **Graceful degradation:** if unavailable or the server fails to start, the
  driver falls back to a terminal-based review of the questions/options and states the
  degradation explicitly.
- **`bd` (beads)** — all issue tracking. **Graceful degradation:** if unavailable, write files
  only without error; skip all beads steps.
- **Subagent dispatch** — the harness's Agent/subagent mechanism runs the B5/B6 review loops and
  the C1 per-task implementation with fresh, isolated context.

**No `.agents/skills/` or `.claude/skills/` vendored skill is a dependency.** Neither new skill
nor the enriched playbook invokes, depends on, or is designed to avoid colliding with any
vendored skill (`obra.superpowers.brainstorming`, `obra.superpowers.writing-plans`,
`obra.superpowers.subagent-driven-development`, `local.mind-clear`, etc.). Those are vendored,
will not exist in other target projects, and are not runtime dependencies; their patterns are
authored fresh inside the owning deliverable. The single allowed inter-skill call is
`lavish-plan` → `lavish-implement` on opt-in.

## Non-Goals

- No runtime `src/` behavior changes: server, session, `poll`, `export`, SDK, or CLI commands
  are untouched. `src/` edits are guidance data plus one `help[]` pointer (and an optional
  design-router note).
- No second playbook; no removal or reordering of the existing seven; the count stays
  `playbooks[7]`.
- No hand-editing the generated `skills/lavish/SKILL.md` — it is regenerated via
  `pnpm run build:skill`.
- Implementing the planned feature is **not** part of the default flow; it happens only on
  explicit user opt-in and never on `main`/`master` without consent.
- No runtime dependency on any `.agents/skills/` or `.claude/skills/` content.
