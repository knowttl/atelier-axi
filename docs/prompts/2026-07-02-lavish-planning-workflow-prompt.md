Write a detailed technical specification for the feature described below.

<context>
We are turning `lavish-axi` ("Lavish Editor" — the CLI + local HTTP server behind the `atelier-axi` repository) into a **feature planner**: a repeatable workflow that helps a user understand a feature or change they want to make, review its open questions and edge cases visually *before* any spec exists, and then produce a reviewed spec + implementation plan. The workflow must work in `atelier-axi` itself and, once `lavish-axi` is installed in any other project, there too.

The problem it solves: today, feature planning is not a repeatable pipeline. Deep design questions get hashed out as terminal text — a poor medium for reviewing many edge cases and design options at once — and planning tends to happen in the same agent session as implementation, which risks context overflow and leaves no durable record. `lavish-axi` already owns a superior visual review surface (it renders agent-generated HTML artifacts in a browser and lets the user annotate elements/text, queue prompts, and send feedback over a long-polling API), and it already ships **playbooks** — composable guidance packs the agent opens before building an artifact — but none of that is wired into a defined planning flow. This work wires it in.

**This is a HYBRID design with three deliverables. Understand the existing guidance architecture before specifying changes.**

`lavish-axi` delivers agent guidance through four layered surfaces, all generated from `src/`:
- **Playbooks** — `src/playbooks.js` exports `PLAYBOOKS`, an array of 7 composable guidance packs (`diagram`, `table`, `comparison`, **`plan`**, `code`, `input`, `slides`). Each is a plain-data object with `id`, `use_when`, `choose[]`, `structure[]`, `design_rules[]`, `pitfalls[]`, `lavish_notes[]`. The agent opens one with `lavish-axi playbook <id>`. The `code` playbook demonstrates that a `design_rules[]` entry may embed a complete copy-pasteable HTML snippet (it embeds the `@pierre/diffs` render snippet). `src/playbooks.js` also exports `PLAYBOOK_ROUTER_INSTRUCTION` / `PLAYBOOK_ROUTER_HELP` and helpers `listPlaybooks()` / `findPlaybook()` / `playbookIds()`.
- **Home / SessionStart payload** — `src/cli.js` `createHomeOutput()` returns the object printed for a no-argument `lavish-axi` invocation and injected into the agent's `SessionStart` hook: `visual_guidance[]`, `playbooks` (from `listPlaybooks()`), and `help[]`.
- **Installable skill** — `src/skill.js` `createSkillMarkdown()` renders `skills/lavish/SKILL.md` from the home output. It is **generated, not hand-edited**: `pnpm run build:skill` (`scripts/build-skill.js`) writes it, and `pnpm run check` fails if the committed file drifts. The rendered SKILL.md lists each playbook's `id` + `use_when` only (the detailed body is fetched at runtime via `playbook <id>`), so changing a playbook's *internals* does not change SKILL.md, but changing its **`use_when`** does and forces a rebuild.
- **Design fallback** — `src/design-reference.js` `createDesignOutput()` / `DESIGN_SYSTEM_HINT` back the `lavish-axi design` command: the Tailwind v4 + DaisyUI v5 CDN snippet, Mermaid tooling, layout-safety CSS, a content-to-playbook router (`playbook_router`), and the DaisyUI component reference.

**Key realization that shapes this design:** the existing **`plan` playbook already is a proto-feature-planner.** Its current `use_when` is *"Explain a product or technical plan before implementation"*; its `structure[]` already says *"list any risks you see, and open questions you have, and follow the 'comparison' playbook to provide options for the user to choose from"*; its `design_rules[]` already require the plan to be *"self-contained enough that another developer can read it and fully implement the proposal"*. So the feature-planner is largely an **enrichment of guidance that already exists**, not a greenfield playbook.

**Deliverable 1 — Product enrichment (`src/` changes, in scope).** Enrich the existing **`plan` playbook in `src/playbooks.js`** so it fully encodes the feature-planning arc: a light framing pass, exhaustive surfacing of open questions and edge cases as an annotatable review surface *before* the spec is written, an embedded **decision-card HTML template** (a `design_rules[]` snippet, mirroring how the `code` playbook embeds its snippet: a plain-English problem statement + recommendation + simple example, plus optional UI mockups for UI-facing features), and an explicit spec→plan output convention. Broaden its `use_when` so the playbook router recognizes feature-planning intent (this is a deliberate `use_when` change; see the ripple list in Constraints). Do **not** add a second playbook and do **not** remove or renumber the other playbooks (they must stay `playbooks[7]`). Regenerate `skills/lavish/SKILL.md` with `pnpm run build:skill` and keep `pnpm run check` green.

**Deliverable 2 — Planning driver skill (`skills/lavish-plan/`).** A prose skill authored at the **project root**, a sibling of `skills/lavish/`, that drives the imperative end-to-end pipeline a playbook cannot express as declarative data: the light terminal interview, scope classification, building the review artifact (by opening the enriched `plan` playbook plus `input`/`comparison`/`diagram` and following the design-source priority), the lavish review loop, writing the durable `spec.md` + `plan.md`, creating beads records, and the hand-back offer. It **orchestrates the `lavish-axi` CLI and `bd`** and makes no further `src/` changes of its own.

**Deliverable 3 — Execution skill (`skills/lavish-implement/`).** A separate prose skill, also a sibling of `skills/lavish/`, that executes an existing `plan.md` with a fresh-subagent-per-task TDD loop (review between tasks, frequent commits). It is **independently triggerable** — a fresh session can resume a deferred plan by invoking it directly with a `plan.md` path, without replaying the planning flow. `lavish-plan` invokes it when the user opts into "implement now" at hand-back.

**Packaging.** Both `skills/lavish-plan/` and `skills/lavish-implement/` ship inside the published `lavish-axi` npm package: add `"skills/lavish-plan"` and `"skills/lavish-implement"` to `package.json`'s `"files"` allowlist alongside the existing `"skills/lavish"` entry (`test/package-json.test.js` asserts on `files`), and confirm the `prepack`/`build` path carries them.

**Incorporating proven workflow patterns (no runtime dependency).** The repo currently has vendored coding-agent skills under `.agents/skills/` (symlinked as `.claude/skills/`) — the `obra.superpowers.*` set (`brainstorming`, `writing-plans`, `subagent-driven-development`, etc.) and assorted `local.*` skills. **These will NOT be installed in other projects that use `lavish-axi`, so nothing this spec produces may depend on them at runtime, invoke them, or be designed around avoiding a trigger collision with them.** Instead, incorporate the *patterns* those skills embody — a phased, one-question-at-a-time interview that presents the design in review-sized sections; a bite-sized TDD plan structure (write failing test → run it fails → minimal implementation → run it passes → commit) with exact file paths and complete code and no placeholders; a fresh-subagent-per-task execution loop with review between tasks — by **authoring them fresh** into the enriched `plan` playbook and the two new skills. Do not read those vendored skills as a build-time dependency; treat their patterns as well-known techniques to reproduce self-containedly.

**Relevant `lavish-axi` CLI behavior the skills orchestrate (do not re-implement; call these):**
- `lavish-axi <file.html>` — opens (or resumes) a review session: spawns a detached local server if needed and opens the artifact in the browser. Artifacts go in the current working directory under `.lavish/` unless the user specifies otherwise; sibling assets are referenced with relative paths (never a leading `/`).
- `lavish-axi poll <file.html>` — long-polls and stays silent until the user sends feedback, ends the session, or the browser reports fresh `layout_warnings`. Returns JSON/TOON. Leave it running (run it in the background if the harness limits foreground command time); if killed it is safe to re-run because queued feedback is never lost. `layout_warnings` must be fixed before involving the human. An `ended` status carries `ended_by` (`user` or `agent`).
- `lavish-axi export <file.html> [--out <path>]` — writes a portable standalone HTML file with LOCAL assets inlined (remote CDN/font refs left as links). Used to capture the review artifact for the durable record.
- `lavish-axi end <file.html>` — ends a session.
- `lavish-axi playbook <id>` — focused guidance for building artifacts. The primary playbook for this workflow is the **enriched `plan`**; the review artifact also draws on `input` (collect decisions/choices/scope/triage), `comparison` (options and tradeoffs), and `diagram` (Mermaid flows/architecture/state/sequence). The driver skill MUST open each matching playbook before writing HTML.
- Design-source priority for any artifact (per lavish's own rules): (1) a look/design-system the user named; else (2) the design system of the *subject* project the artifact is about — which may differ from the current working directory — its Tailwind/theme config, CSS tokens, component library, or existing styled pages; else (3) the Lavish-recommended Tailwind v4 + DaisyUI v5 browser-runtime CDN (`lavish-axi design`), default theme `luxury`.

**Relevant beads (`bd`) behavior the driver skill orchestrates (only when `bd` is available in the target project):**
- `bd create --title="…" --description="…" --type=<type> --priority=<0-4>` — create an issue. Built-in types include: `bug`, `feature`, `chore`, `spike`, `story`, `milestone`, `decision`, `epic`, and the default `task`.
- `bd dep add <issue> <depends-on>` — order child tasks so they become ready in sequence.
- Never use `bd edit` (it opens an interactive editor and blocks agents); set fields inline via `--description`/`--notes`/`--design` or `bd update`.

**Subagents.** The driver skill runs its review loops, and the execution skill runs its per-task implementation, as dispatched **subagents** with fresh, isolated context (the harness's Agent/subagent mechanism) so reviewers and implementers do not inherit the planning session's context.
</context>

<user_stories>
- As a developer, I want a **light** terminal interview at the start — just enough to get the general sense of the feature — so I am not interrogated in text before I have seen anything visual.
- As a developer, I want the agent to surface all open questions, edge cases, and design options — **including sample UI mockups when the feature is UI-facing**, each with a plain-English recommendation and a simple example — inside one interactive lavish artifact, so I can review and annotate them visually BEFORE any spec is written.
  - Acceptance: for a non-UI feature the artifact shows questions/edge-cases/decision-cards and NO mockups; for a UI feature it also shows sample mockups rendered in the subject project's design system.
- As a developer, I want lavish-axi's own `plan` playbook to encode this feature-planning behavior, so any agent that opens `lavish-axi playbook plan` — in this repo or any project with lavish-axi installed — gets the same planner guidance without needing a separate skill.
  - Acceptance: `lavish-axi playbook plan` returns guidance that names the pre-spec review surface, the decision-card template, edge-case exhaustiveness, and the spec→plan output convention; `skills/lavish/SKILL.md` is regenerated and `pnpm run check` passes.
- As a developer, I want to confirm or revise that draft direction in lavish and loop until I am satisfied, so the spec reflects my actual intent.
  - Acceptance: the driver skill opens the artifact, polls for feedback, incorporates annotations, and re-opens until the user confirms; browser-reported `layout_warnings` are fixed before the user is asked to review.
- As a developer, I want the agent to **auto-classify the feature as small or large**, state its call in plain English with a one-line reason, and proceed — so small changes skip full spec+plan overhead, while I can override the call.
  - Acceptance: the classifier's call is based on a component/file-count heuristic (large if it spans multiple independent components, needs a new architectural decision, or is likely to touch several files/modules; small otherwise), stated with a one-line reason, and the user can override to re-route.
- As a developer, I want durable `spec.md` + `plan.md` plus an exported `review.html` written into a typed, dated folder, so I can implement later in a fresh agent session without context overflow.
  - Acceptance: a large feature produces all three files; a small feature produces a reduced set (e.g. `plan.md` only, or just a beads issue).
- As a developer, I want beads entries created that point back to the files, so another agent can run `bd ready` and implement the work later.
  - Acceptance: beads is written ONLY when `bd` is available in the target project; a large feature yields one `epic` plus one `bd dep`-ordered child `task` per plan task; a small feature yields a single typed issue; every issue's description ends with the repo-relative folder pointer.
- As a developer, I want open questions I choose to defer during the lavish review captured as `decision` issues, so unresolved calls are not lost.
- As a developer, I want the spec and the plan validated by **independent subagent review loops** — one for spec completeness/edge-case coverage, one for spec↔plan consistency and project fit — so the handoff is trustworthy.
- As a developer, at the end of planning I want to be **offered a choice** — begin implementation now via the execution skill, or stop and hand off for a later/fresh session — so I am neither forced into a new session nor silently dropped into implementation.
- As an implementation agent (possibly in a fresh session), I want to invoke `skills/lavish-implement/` with just a self-contained `plan.md` and build the feature without the planning session's context.
</user_stories>

<constraints>
- **Three deliverables, one hybrid design.** (1) Enrich the existing `plan` playbook in `src/playbooks.js` (product change, in scope); (2) `skills/lavish-plan/` driver skill; (3) `skills/lavish-implement/` execution skill. Skills (2) and (3) are prose (`SKILL.md` + optional reference files/templates) authored at the project root as siblings of `skills/lavish/` — NOT under `.agents/skills/` or `.claude/skills/`.
- **`src/` changes are limited to guidance data, not runtime behavior.** Enrich the `plan` playbook's `use_when`/`choose`/`structure`/`design_rules`/`pitfalls`/`lavish_notes`, and **add a `help` pointer in `createHomeOutput()` (`src/cli.js`)** that surfaces the feature-planning flow (`lavish-axi playbook plan` → surface open questions and edge cases for visual review, then produce a spec and implementation plan) so it appears at every SessionStart; optionally add a planning note to `design-reference.js`'s `playbook_router`. Do NOT add new CLI commands, change server/session/poll/export behavior, add new playbooks, remove or reorder existing playbooks, or alter the artifact SDK. The decision-card is realized as a prose HTML template **embedded in the `plan` playbook's `design_rules[]`** (like the `code` playbook's snippet) and referenced by the driver skill — it is NOT a new playbook.
- **Keep the build green and the generated skill in sync.** Broadening the `plan` playbook's `use_when` changes `skills/lavish/SKILL.md`, so the spec MUST call out this ripple and require: run `pnpm run build:skill` and commit the regenerated `skills/lavish/SKILL.md`; update `test/cli-output.test.js` (it asserts the exact `plan` `use_when` string in `createPlaybookOutput` and `createDesignOutput`, and asserts `playbooks[7]`/`length === 7`); update `test/skill.test.js` (SKILL.md content assertions); confirm `test/package-json.test.js` still passes after the `files` additions; update the playbook list in `README.md`. New `plan`-playbook guidance content added must be covered by TDD tests (assert the enriched `plan` playbook exposes the new fields/phrases). `pnpm run check` (build + lint + format:check + typecheck + test + `build-skill.js --check`) MUST pass.
- **Orchestrate, don't reimplement — and only real CLI tools, never other skills.** All browser review, artifact serving, export, and layout auditing is done by calling `lavish-axi`. All issue tracking is done by calling `bd`. Neither skill nor the playbook may invoke, depend on, or be designed to avoid colliding with any skill under `.agents/skills/` or `.claude/skills/` (including `obra.superpowers.brainstorming`, `obra.superpowers.writing-plans`, `obra.superpowers.subagent-driven-development`, `local.mind-clear`) — those are vendored, will not exist in other target projects, and are not dependencies. `skills/lavish-plan/` invoking `skills/lavish-implement/` on opt-in is the one allowed inter-skill call — both are first-party deliverables of this spec. Where a structural pattern resembles a vendored skill's, author it fresh inside the owning deliverable.
- **Portability.** Both skills and the enriched playbook must work in a target project other than `atelier-axi`, installable via the awesome-ai skills registry / the npm package. No hard-coded `atelier-axi` paths. Degrade gracefully when `lavish-axi` or `bd` is unavailable.
- **File output location:** `docs/atelier/<YYYY-MM-DD>-<type>-<topic>/` where `<YYYY-MM-DD>` is today's date, `<type>` is the beads type (`feature`, `bug`, `chore`, `spike`, `story`, `epic`, `decision`), and `<topic>` is a short kebab-case slug. The folder holds `spec.md`, `plan.md`, and the exported `review.html` (subset for small features). Create parent directories as needed; never clobber an existing same-date+topic folder (confirm or suffix).
- **Review loops use dispatched subagents** with fresh, isolated context — the controller constructs exactly the context each reviewer needs; reviewers do not inherit the planning conversation.
- **Plan format:** the implementation plan follows a bite-sized TDD structure authored fresh inside `skills/lavish-plan/` (not inherited from any other skill) — a header stating goal/architecture/tech-stack/global-constraints, then bite-sized TDD tasks (write failing test → run it fails → minimal implementation → run it passes → commit), with exact file paths and complete code in each step and NO placeholders ("TBD"/"add error handling"/"similar to Task N" are plan failures).
- **Implementation is deferred by default and never auto-started.** It runs only on explicit user opt-in, and never begins on `main`/`master` without consent. On opt-in, `skills/lavish-plan/` invokes `skills/lavish-implement/`, whose fresh-subagent-per-task loop instructions live in `skills/lavish-implement/` (not duplicated in `lavish-plan`, not a dependency on any vendored skill).
- **Scope classifier heuristic:** component/file-count based — large if the feature spans multiple independent components, requires a new architectural/design decision, or is likely to touch several files/modules; small if it is a single well-understood change (one component, no new architectural decision).
- **Non-goals:** actually implementing the planned feature as part of the default flow; changing `lavish-axi`'s runtime `src/` behavior (server, poll, export, SDK, CLI commands); adding a second playbook or removing existing ones; hand-editing the generated `skills/lavish/SKILL.md` instead of regenerating it; any runtime dependency on `.agents/skills/` or `.claude/skills/` content.
</constraints>

<components>
Specify each component with its single responsibility, its interface (inputs consumed / outputs and side effects produced — exact CLI calls, exact files written/edited, exact beads commands), and its dependencies.

**Group A — Product enrichment (`src/`):**

A1. **`plan` Playbook Enrichment** — Enrich the existing `plan` object in `src/playbooks.js` so `lavish-axi playbook plan` returns feature-planner guidance: a broadened `use_when`; `choose[]` entries distinguishing the full planning arc from a light single-decision plan; `structure[]` entries for the pre-spec review phase (surface ALL open questions + edge cases + design options as an annotatable decision surface, converge, then produce spec→plan) ; a `design_rules[]` entry embedding the **decision-card HTML template** (problem + recommendation + example; optional UI mockups for UI features) and one requiring mockups be rendered in the subject project's design system; `pitfalls[]` for writing the spec before review is confirmed, leaving open questions unresolved, and plan placeholders; `lavish_notes[]` making each question/edge-case/option individually annotatable with accept/defer controls (cross-referencing `input`/`comparison`/`diagram`). Output/side effects: edited `src/playbooks.js`. Depends on: existing playbook structure.

A2. **Guidance Surfacing, Regen, Tests & Packaging** — Add a `help` pointer in `createHomeOutput()` (`src/cli.js`) that surfaces the feature-planning flow (`lavish-axi playbook plan`) at every SessionStart, and optionally a planning note in `createDesignOutput()`'s `playbook_router` (`src/design-reference.js`); regenerate `skills/lavish/SKILL.md` via `pnpm run build:skill`; update `test/cli-output.test.js` (including a new assertion for the added `help` pointer), `test/skill.test.js`, `README.md`; add `"skills/lavish-plan"`/`"skills/lavish-implement"` to `package.json` `"files"` and confirm `test/package-json.test.js`; add TDD tests asserting the enriched `plan` guidance. Output/side effects: edited `createHomeOutput()`, regenerated SKILL.md, edited tests/docs/package.json. Depends on: A1. Verified by `pnpm run check`.

**Group B — Planning driver skill (`skills/lavish-plan/`):**

B1. **Intake & Project Context** — Read the target project (README/AGENTS.md/CLAUDE.md/structure/relevant existing code) and run a LIGHT terminal interview. Output: internal understanding of purpose, rough scope, and the subject project's design conventions. Depends on: filesystem read access.

B2. **Scope Classifier** — Apply the component/file-count heuristic, state the `small|large` call and a one-line reason, and proceed (user may override). Output: a route. Depends on: B1.

B3. **Draft-Review Artifact Builder** — Open the enriched `plan` playbook (`lavish-axi playbook plan`) plus `input`/`comparison`/`diagram`, follow the design-source priority, and generate the lavish HTML artifact: open questions, edge cases, and design options as decision cards (from the playbook's embedded template); sample UI mockups when UI-facing. Output: an `.html` under `.lavish/`. Depends on: B1, B2, A1 (the enriched playbook), `lavish-axi playbook`/`design`.

B4. **Lavish Review Loop** — `lavish-axi <file>`, `lavish-axi poll <file>`, fix `layout_warnings` before involving the human, incorporate annotations, re-open until the user confirms. Output: confirmed decisions (+ deferred questions). Depends on: B3, `lavish-axi` CLI.

B5. **Spec Writer + Review Loop** (large route) — Write `spec.md`; run an edge-case coverage pass; dispatch a **subagent spec reviewer** (completeness, consistency, ambiguity, scope, YAGNI); fix findings; repeat until clean. Small route: a short design confirmation instead. Output: `spec.md`. Depends on: B4, subagent dispatch.

B6. **Plan Writer + Consistency Loop** — Write the bite-sized TDD `plan.md`; dispatch a **subagent reviewer** for spec↔plan consistency and project fit; fix findings; repeat until clean. Output: `plan.md`. Depends on: B5, subagent dispatch.

B7. **Records Writer** — `lavish-axi export` → `review.html`; write files into `docs/atelier/<date>-<type>-<topic>/`; when `bd` is available, create beads entries (large → `epic` + `bd dep`-ordered child `task`s; small → single typed issue; deferred questions → `decision` issues), each with the repo-relative folder pointer. Output: durable files + beads issues. Depends on: B6 (or B2 for small route), `lavish-axi export`, `bd`.

B8. **Hand-back & Execution Offer** — Terminal summary + a final lavish artifact of spec+plan; OFFER: (1) invoke `skills/lavish-implement/` against the written `plan.md`, or (2) stop and hand off for a fresh session. Never auto-start; never begin on `main`/`master` without consent. Output: clean stop or handoff into the execution skill. Depends on: B7.

**Group C — Execution skill (`skills/lavish-implement/`):**

C1. **Execution Loop** — Given a `plan.md` path (from `lavish-plan` on opt-in, or supplied directly by a fresh session invoking this skill by name), run a fresh-subagent-per-task loop: a subagent executes each task with TDD, a review subagent checks it before the next task, commit frequently. Confirm the working branch before touching `main`/`master`. Output: a completed (or partially completed) implementation branch. Depends on: an existing `plan.md`, subagent dispatch. Independently triggerable.

(For the **small** route, B5–B6 collapse: Intake → Scope → a lighter Draft-Review confirmation → a `plan.md` or a single beads issue → Hand-back, skipping the full spec and heavy review loops. C1 applies identically to both routes, since both end in a `plan.md`.)
</components>

<success_criteria>
- `lavish-axi playbook plan` returns enriched feature-planner guidance (names the pre-spec review surface, the embedded decision-card template, edge-case exhaustiveness, and the spec→plan convention), `skills/lavish/SKILL.md` is regenerated to match, and `pnpm run check` passes (including `build-skill.js --check`, lint, format, typecheck, and all tests).
- `createHomeOutput()`'s `help[]` (the no-args output and the SessionStart payload) includes a pointer to the feature-planning flow via `lavish-axi playbook plan`, covered by a `test/cli-output.test.js` assertion.
- The other 6 playbooks are unchanged and the playbook count stays 7; `package.json` `"files"` includes `skills/lavish-plan` and `skills/lavish-implement`.
- Given a large-feature request, the driver skill produces exactly `spec.md` + `plan.md` + `review.html` in the correct `docs/atelier/<date>-<type>-<topic>/` folder; a small-feature request produces the reduced set.
- Beads is written if and only if `bd` is available; each issue links its files; a large feature yields an `epic` plus one `bd dep`-ordered child `task` per plan task.
- Both review loops are dispatched as subagents with fresh context, and their findings are incorporated before hand-back.
- Durable records (files + beads) are complete BEFORE the execution choice is offered, so "implement now" and "defer" yield identical handoff artifacts.
- No implementation code is written during the default flow; implementation begins only on explicit user opt-in and never on `main`/`master` without consent.
- The produced `plan.md` is self-contained enough that a fresh session invoking `skills/lavish-implement/` with no planning context can execute it (exact file paths, complete code per step, no placeholders).
- Graceful degradation: if `lavish-axi` is unavailable the driver skill falls back to terminal review and states the degradation; if `bd` is unavailable it writes files only without error.
- Neither new skill nor the enriched playbook references or depends on any `.agents/skills/`/`.claude/skills/` content at runtime.
</success_criteria>

<edge_cases>
- **`use_when` change ripples the build** → the spec MUST require regenerating `skills/lavish/SKILL.md` (`pnpm run build:skill`) and updating the exact-string assertions in `test/cli-output.test.js` and `test/skill.test.js`, or `pnpm run check` fails.
- **lavish-axi unavailable or the server fails to start** → the driver skill falls back to a terminal-based review of the questions/options and states the degradation explicitly.
- **beads not set up in the target project** → write files only; do not error.
- **User ends the lavish session early** (`poll` returns `ended` with `ended_by: user`) → stop gracefully, preserve the draft artifact, do not reopen uninvited.
- **Scope misclassified** → the user's override re-routes the pipeline (small↔large).
- **Non-UI feature** → the review artifact shows questions/edge-cases/decision-cards only, no mockups.
- **Subject project differs from the current working directory** → inspect the subject project for design conventions, per the lavish design-source priority.
- **Browser reports `layout_warnings`** → fix them before asking the human to review.
- **`docs/atelier/` or the `<YYYY-MM-DD>-<type>-<topic>/` subfolder is missing** → create it.
- **A same-date + same-topic folder already exists** → do not clobber; confirm with the user or append a disambiguating suffix.
- **User opts into "implement now"** → `skills/lavish-plan/` invokes `skills/lavish-implement/`, which runs its fresh-subagent-per-task loop (review between tasks, TDD, frequent commits); confirm the working branch before touching `main`/`master`.
- **A fresh session invokes `skills/lavish-implement/` directly** (no `lavish-plan` in this session's history) → read the given `plan.md` path and proceed; it requires no planning-session context.
</edge_cases>

<examples>
Concrete illustration of the Records Writer output for a hypothetical **large** UI feature "Dark mode toggle" planned on 2026-07-02, in a project where `bd` is available:

Files:
```
docs/atelier/2026-07-02-feature-dark-mode/
    spec.md
    plan.md
    review.html
```

Beads (created because `bd` is present):
```
bd create --title="Dark mode toggle" --type=epic --priority=2 \
  --description="Add a user-facing dark mode toggle. Spec & plan: docs/atelier/2026-07-02-feature-dark-mode/ (spec.md, plan.md, review.html)"
# → epic id e.g. proj-42

bd create --title="Add theme CSS variables" --type=task --priority=2 \
  --description="Plan task 1. See docs/atelier/2026-07-02-feature-dark-mode/plan.md (Task 1)"
# → proj-43
bd create --title="Add toggle component + persistence" --type=task --priority=2 \
  --description="Plan task 2. See docs/atelier/2026-07-02-feature-dark-mode/plan.md (Task 2)"
# → proj-44
bd dep add proj-44 proj-43     # task 2 depends on task 1
bd dep add proj-43 proj-42     # tasks belong under the epic
```

Contrast — a **small** fix "Fix login crash" with no full spec:
```
docs/atelier/2026-07-02-bug-login-crash/plan.md      # plan only, no spec.md
```
```
bd create --title="Fix login crash" --type=bug --priority=1 \
  --description="Null deref on empty session. See docs/atelier/2026-07-02-bug-login-crash/plan.md"
```

Contrast — an open question the user deferred during the lavish review becomes a `decision` issue:
```
bd create --title="Should the toggle persist per-device or per-account?" --type=decision --priority=2 \
  --description="Deferred during planning of docs/atelier/2026-07-02-feature-dark-mode/. Needs a product call before implementation."
```

Illustration of the enriched `plan` playbook shape in `src/playbooks.js` (the `code` playbook already embeds an HTML snippet in `design_rules[]`, so this pattern is precedented):
```js
{
  id: "plan",
  use_when: "Plan a feature, fix, or change before implementation: surface open questions and edge cases for review, then produce a spec and implementation plan",
  choose: [ /* full planning arc vs. a light single-decision plan … */ ],
  structure: [ /* pre-spec review surface → converge → spec → bite-sized TDD plan … */ ],
  design_rules: [
    "Render each open question, edge case, and design option as a decision card … <the embedded decision-card HTML template snippet> …",
    /* render UI mockups in the subject project's design system … */
  ],
  pitfalls: [ /* writing the spec before review is confirmed; unresolved open questions; plan placeholders … */ ],
  lavish_notes: [ /* make each card individually annotatable; accept/defer controls; cross-ref input/comparison/diagram … */ ],
}
```
</examples>

<output_format>
Structure the specification as follows. Reason through each component inside `<thinking>` tags BEFORE writing its section; `<thinking>` is reasoning scaffolding only and must be stripped from the final deliverable.

# Feature: [Name]

## Overview
[2–3 sentences: what this hybrid feature-planner is (enriched `plan` playbook + driver skill + execution skill) and why it exists.]

## Product Changes (`src/`)
[The exact edits to the `plan` playbook in `src/playbooks.js` (each field), the embedded decision-card template, the required `createHomeOutput()` help pointer plus any optional `design-reference.js` surfacing, and the new `use_when` string (use the recommended value in <constraints>/<examples> unless a concrete discoverability reason justifies refining it), and the full ripple: `pnpm run build:skill` + the specific test files and README/package.json edits required to keep `pnpm run check` green.]

## Skill Shape
[Where each skill lives (`skills/lavish-plan/` and `skills/lavish-implement/` at the project root, siblings of `skills/lavish/` — NOT under `.agents/skills/` or `.claude/skills/`), the files each comprises (SKILL.md + any reference templates/scripts), each one's trigger/description, the npm packaging change, and how `lavish-plan` hands off to `lavish-implement`. Do not discuss vendored `.agents/`/`.claude/` skills except to state the no-runtime-dependency rule.]

## Components

<thinking>
[For each component below, reason first: what it must do, which failure modes it handles, and how its completion is verified. Strip this from the final deliverable.]
</thinking>

### [Component Name]
#### Responsibility
#### Interface
[Inputs consumed; outputs and side effects produced — exact CLI calls made, exact files written/edited, exact beads commands issued.]
#### Success Criteria
#### Edge Cases

## File & Record Layout
[The exact `docs/atelier/<date>-<type>-<topic>/` structure, the small-route subset, and the beads type→entry mapping with file-pointer convention.]

## Small vs. Large Routing
[The component/file-count heuristic, what the classifier tells the user, and how each route flows.]

## Review Loops
[How the spec reviewer and the spec↔plan consistency reviewer are dispatched as subagents, what context each receives, and the fix-and-re-review loop.]

## Hand-back & Execution
[The terminal + lavish summary, the two-option offer from `skills/lavish-plan/`, how it invokes `skills/lavish-implement/` on opt-in (what is passed, e.g. the `plan.md` path), and the execution skill's own fresh-subagent-per-task loop — including how it works when invoked independently by a fresh session.]

## Dependencies
[External tools orchestrated: `lavish-axi` CLI, `bd`, subagent dispatch — and graceful-degradation behavior when each is absent. State explicitly that no `.agents/`/`.claude/` vendored skill is a dependency.]

## Non-Goals
[Explicitly: no runtime `src/` behavior changes (server/poll/export/SDK/CLI commands); no second playbook and no removal/reordering of existing ones; no hand-editing the generated `skills/lavish/SKILL.md`; implementation not part of the default flow; no runtime dependency on any `.agents/skills/`/`.claude/skills/` content.]

## External Decisions Pending
[List ONLY items requiring a decision from outside this spec. Omit the section entirely if empty.]
</output_format>

<task>
Write a detailed technical specification for the feature described in <context> and <user_stories>: a hybrid feature-planner for `lavish-axi` comprising (1) an enrichment of the existing `plan` playbook in `src/playbooks.js` with the required build/test/packaging ripple, (2) a `skills/lavish-plan/` driver skill, and (3) a `skills/lavish-implement/` execution skill. Honor every item in <constraints>, <components>, <success_criteria>, and <edge_cases>. For each component, first work through your analysis inside `<thinking>` tags — what it must do, which failure modes it handles, and how its completion will be verified — then write the spec section. Follow <output_format> exactly, and strip all `<thinking>` blocks from the final deliverable. Produce no implementation code and no placeholders; every section must contain concrete, verified specifics.
</task>
