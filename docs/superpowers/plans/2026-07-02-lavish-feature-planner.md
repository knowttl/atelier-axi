# Lavish Feature Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `lavish-axi` into a repeatable visual feature-planner by enriching the existing `plan` playbook and shipping two sibling prose skills (`skills/lavish-plan/`, `skills/lavish-implement/`).

**Architecture:** Group A edits guidance **data** in `src/` (the `plan` playbook object, one `createHomeOutput()` help pointer, one design-router note) plus the build/test ripple that keeps the generated `skills/lavish/SKILL.md` in sync. Groups B and C author self-contained prose skills at the project root that orchestrate the `lavish-axi` and `bd` CLIs. No runtime `src/` behavior (server, poll, export, SDK, CLI commands) changes.

**Tech Stack:** Node 22+, ESM-only JavaScript (`"type": "module"`, `.js` validated by TS `checkJs`), `node:test` runner, ESLint, Prettier, `lavish-axi` CLI, `bd` (beads) CLI. Skills are Markdown.

## Global Constraints

Every task's requirements implicitly include this section. Values copied verbatim from the spec.

- **Node 22+, ESM-only JavaScript.** No TypeScript source; `.js` files are checkJs-validated.
- **`PLAYBOOKS` stays exactly 7, ids and order unchanged:** `diagram, table, comparison, plan, code, input, slides`. Only the `plan` object's fields change; no playbook added, removed, or reordered.
- **Never hand-edit `skills/lavish/SKILL.md`.** It is generated; regenerate with `pnpm run build:skill` and commit the result. `node scripts/build-skill.js --check` (part of `pnpm run check`) fails on drift, and `test/package-json.test.js` asserts `committed === createSkillMarkdown()`.
- **Never hand-edit `CHANGELOG.md` or `.release-please-manifest.json`.**
- **`pnpm run check` MUST pass** = `npm run build && npm run lint && npm run format:check && npm run typecheck && npm test && node scripts/build-skill.js --check`.
- **Prettier checks `skills/**/*.md`** — `skills/` is NOT in `.prettierignore`. Run `pnpm run format` (or `prettier --write <files>`) on every touched/created file before `format:check`.
- **New skills are self-contained.** `skills/lavish-plan/` and `skills/lavish-implement/` must NOT invoke, depend on, or be designed around any vendored `.agents/skills/` or `.claude/skills/` skill. The ONLY allowed inter-skill call is `lavish-plan` invoking `lavish-implement` at hand-back.
- **Portability:** no hard-coded `atelier-axi` paths in skill runtime behavior; all paths relative to the target project. Skills must degrade gracefully when `lavish-axi` or `bd` is absent.
- **Skills live at the project root `skills/`** as siblings of `skills/lavish/` — NOT under `.agents/skills/` or `.claude/skills/`.
- **Durable output folder:** `docs/atelier/<YYYY-MM-DD>-<type>-<topic>/` where `<type>` is the beads type.
- **Run a single test file:** `node --test test/<file>.test.js`. **Regenerate the skill:** `pnpm run build:skill`.

---

## Task 1: Enrich the `plan` playbook (guidance data + tests + regenerated skill)

**Files:**
- Modify: `src/playbooks.js:93-117` (the `plan` object)
- Modify: `test/cli-output.test.js:262` (old `use_when` assertion), `:318-323` (stale-structure test), and add a new enriched-plan test after line 323
- Regenerate: `skills/lavish/SKILL.md` (via `pnpm run build:skill`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the enriched `plan` playbook, surfaced by `findPlaybook("plan")` / `createPlaybookOutput(["plan"])` and (id + `use_when`) `listPlaybooks()`. The new `use_when` string — `"Plan a feature, fix, or change before implementation: surface open questions and edge cases for review, then produce a spec and implementation plan"` — is consumed verbatim by Task 2's SKILL.md regen and by the tests.

- [ ] **Step 1: Update the tests to express the enriched playbook**

In `test/cli-output.test.js`, change the `plan` `use_when` assertion (currently line 262) from `"Explain a product or technical plan before implementation"` to the new value:

```js
  assert.equal(
    output.playbooks.find((playbook) => playbook.id === "plan")?.use_when,
    "Plan a feature, fix, or change before implementation: surface open questions and edge cases for review, then produce a spec and implementation plan",
  );
```

Delete the now-obsolete `"plan playbook detail output has polished guidance copy"` test (currently lines 318-323) — it asserts on the removed phrase `"Then describe a proposed approach"`; the new test below supersedes it. Add this new test immediately after the `code` playbook detail test (after line 316):

```js
test("plan playbook detail output encodes the feature-planner arc", () => {
  const output = createPlaybookOutput(["plan"]);

  assert.equal(output.playbook.id, "plan");
  assert.equal(
    output.playbook.use_when,
    "Plan a feature, fix, or change before implementation: surface open questions and edge cases for review, then produce a spec and implementation plan",
  );
  assert.ok(output.playbook.choose.some((item) => item.includes("full planning arc")));
  assert.ok(output.playbook.structure.some((item) => item.includes("Before writing any spec")));
  assert.ok(output.playbook.structure.some((item) => item.includes("bite-sized TDD tasks")));
  assert.ok(output.playbook.design_rules.some((item) => item.includes("decision-card")));
  assert.ok(output.playbook.design_rules.some((item) => item.includes("data-lavish-question")));
  assert.ok(output.playbook.design_rules.some((item) => item.includes("window.lavish.queuePrompt")));
  assert.ok(output.playbook.design_rules.some((item) => item.includes("subject project's design system")));
  assert.ok(output.playbook.pitfalls.some((item) => item.includes("before the review surface is confirmed")));
  assert.ok(output.playbook.pitfalls.some((item) => item.includes("TBD")));
  assert.ok(output.playbook.lavish_notes.some((item) => item.includes("Accept/Defer")));
  assert.ok(output.playbook.lavish_notes.some((item) => item.includes("comparison") && item.includes("diagram")));
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test test/cli-output.test.js`
Expected: FAIL — the `use_when` equality and the new `createPlaybookOutput(["plan"])` assertions fail because `src/playbooks.js` still has the old `plan` object.

- [ ] **Step 3: Replace the `plan` object in `src/playbooks.js`**

Replace lines 93-117 (the entire `plan` object, from the opening `{` before `id: "plan"` through its closing `},`) with:

~~~js
  {
    id: "plan",
    use_when:
      "Plan a feature, fix, or change before implementation: surface open questions and edge cases for review, then produce a spec and implementation plan",
    choose: [
      "Use the full planning arc when the change is non-trivial: first surface every open question, edge case, and design option as an annotatable review surface, converge with the user, then produce a spec and a bite-sized implementation plan.",
      "Use a lighter single-decision plan when the change is one well-understood option: show the proposal and its few open questions, confirm, and produce just an implementation plan.",
      "Use the 'comparison' or 'diagram' playbook alone when the artifact is only a single design choice or a relationship map, not a plan that needs a spec.",
    ],
    structure: [
      "Open with a light framing: the goal, the current state, and the desired behavior in a few sentences - do not interrogate before the user has seen anything visual.",
      "Before writing any spec, surface EXHAUSTIVELY: every open question, every edge case, and every design option, each as its own decision card the user can accept or defer individually.",
      "Converge on the surfaced decisions first; only after the user confirms the direction do you write the spec, then a bite-sized TDD implementation plan derived from it.",
      "Structure the plan as bite-sized TDD tasks - write a failing test, run it and see it fail, add the minimal implementation, run it and see it pass, commit - with exact file paths and complete code in every step.",
      "End the plan self-contained enough that another developer, or a fresh agent session with no planning context, can implement it without asking a follow-up question.",
    ],
    design_rules: [
      "Verify each claim against the codebase before presenting it as fact.",
      `Render each open question, edge case, and design option as a self-contained decision card: a plain-English problem statement, a highlighted recommendation, and a short concrete example, plus Accept/Defer controls that queue exactly one prompt for the decision. Restyle the card to the subject project's design system (or DaisyUI via \`lavish-axi design\`). Reusable template:
\`\`\`html
<!-- Decision card: one open question / edge case / option. Restyle to the subject project's design system. -->
<form class="decision-card" data-lavish-question="theme-scope"
      onsubmit="event.preventDefault();
        const f = new FormData(event.currentTarget);
        const decision = f.get('decision');            // 'accept' | 'defer'
        const note = (f.get('note') || '').toString().trim();
        if (!decision) return;
        window.lavish.queuePrompt(
          'Decision [Theme scope]: ' + decision + (note ? ' - ' + note : ''),
          { tag: 'decision', text: 'Theme scope: ' + decision, element: event.currentTarget,
            data: { question: 'theme-scope', decision, note } });">
  <h3 class="decision-card__title">Should the toggle persist per-device or per-account?</h3>
  <p class="decision-card__problem">Users on multiple devices may expect the theme to follow them, but per-account persistence needs a settings API we do not have yet.</p>
  <p class="decision-card__reco"><strong>Recommendation:</strong> Start per-device (localStorage) - it ships without a backend change and covers the common single-device case.</p>
  <pre class="decision-card__example"><code>localStorage.setItem('theme', 'dark')  // per-device, no API</code></pre>
  <fieldset class="decision-card__controls">
    <label><input type="radio" name="decision" value="accept"> Accept recommendation</label>
    <label><input type="radio" name="decision" value="defer"> Defer (needs a product call)</label>
    <input type="text" name="note" placeholder="Optional note or counter-proposal">
    <button type="submit">Queue this decision</button>
  </fieldset>
</form>
\`\`\``,
      "When the feature is UI-facing, add a sample UI mockup alongside the relevant decision cards and render it in the SUBJECT project's design system (its Tailwind/theme config, CSS tokens, component library, or existing styled pages), following the design-source priority. When the feature is NOT UI-facing, show questions, edge cases, and decision cards only - no mockups.",
      "The plan and spec must be self-contained enough that another developer can read them and fully implement the proposal without the planning conversation.",
    ],
    pitfalls: [
      "Do not write the spec before the review surface is confirmed - surface and converge on the open questions and edge cases first.",
      "Do not leave open questions unresolved and unlabeled: every card must end accepted or explicitly deferred, and deferred questions must be captured (as decision records) rather than dropped.",
      "Do not leave placeholders in the plan. 'TBD', 'add error handling', or 'similar to Task N' are plan failures - every task carries exact file paths and complete code.",
      "Do not leave resolved open questions in the artifact. Update the content to reflect the decision and remove the question.",
    ],
    lavish_notes: [
      "Make each question, edge case, and option an individual annotation target with its own Accept/Defer control, so the user resolves them one at a time in the review loop.",
      "Build the accept/defer and option-selection controls with the 'input' playbook pattern (native controls, one per-question submit that queues a single final prompt); use 'comparison' for option cards with tradeoffs and 'diagram' (Mermaid) for flows, architecture, state, or sequence views.",
      "A deferred card should queue a prompt clear enough to become a standalone decision to resolve before implementation.",
    ],
  },
~~~

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test test/cli-output.test.js`
Expected: PASS — all `plan` assertions (old and new) pass. The `assert.equal(output.playbooks.length, 7)` / id-order assertions (lines 176, 255-259) still pass because the count and order are unchanged.

- [ ] **Step 5: Regenerate the skill and verify the sync guards**

The `plan` `use_when` feeds `playbookList(home.playbooks)` in `createSkillMarkdown()`, so `skills/lavish/SKILL.md` drifts.

Run: `pnpm run build:skill`
Then verify no drift and the sync guard:
Run: `node scripts/build-skill.js --check` — Expected: exit 0 (no drift).
Run: `node --test test/skill.test.js` — Expected: PASS. (This suite is data-driven: the `"mirrors the no-args home output"` test loops over `home.playbooks` asserting each `use_when` is in the regenerated markdown, so it auto-covers the new string — no edit needed.)
Run: `node --test test/package-json.test.js` — Expected: PASS (the `installable skill stays in sync` test now sees the regenerated file).

- [ ] **Step 6: Format the touched files**

Run: `prettier --write src/playbooks.js test/cli-output.test.js skills/lavish/SKILL.md`
Then: `pnpm run format:check` — Expected: no complaints for these files.

- [ ] **Step 7: Commit**

```bash
git add src/playbooks.js test/cli-output.test.js skills/lavish/SKILL.md
git commit -m "feat(playbook): enrich plan playbook into a feature-planner"
```

---

## Task 2: Surface the planning flow (home help pointer + design router + README)

**Files:**
- Modify: `src/cli.js` (insert one entry in the `createHomeOutput()` `help[]` array, after the playbook help line at `:143`)
- Modify: `src/design-reference.js:87-90` (add a `planning` key to `playbook_router`)
- Modify: `test/cli-output.test.js` (add a help assertion in the `"home output teaches agents…"` test at `:59`; add a `planning` assertion in the `"design output prints copy-pasteable CDN URLs…"` test at `:172`)
- Modify: `README.md` (add a "Feature planning" note near the playbook table at `:184-191`)
- Regenerate: `skills/lavish/SKILL.md`

**Interfaces:**
- Consumes: the new `use_when` (Task 1) is already in place.
- Produces: `createHomeOutput().help` now contains the planning pointer (rendered into `SKILL.md`'s "Commands & rules"); `createDesignOutput().playbook_router.planning` exists.

- [ ] **Step 1: Write the failing assertions**

In `test/cli-output.test.js`, inside `test("home output teaches agents when and how to use Lavish Editor", …)` (starts line 59), add:

```js
  assert.ok(output.help.some((item) => item.includes("lavish-axi playbook plan")));
```

Inside `test("design output prints copy-pasteable CDN URLs so agents can opt in to DaisyUI", …)` (starts line 172), add:

```js
  assert.match(output.playbook_router.planning, /surface open questions and edge cases/);
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test test/cli-output.test.js`
Expected: FAIL — `output.help` has no planning pointer yet and `output.playbook_router.planning` is `undefined` (so `assert.match` throws).

- [ ] **Step 3: Add the help pointer and the design-router note**

In `src/cli.js`, in the `help` array returned by `createHomeOutput()`, insert this entry immediately after the `` `Run \`lavish-axi playbook <playbook_id>\` for focused artifact guidance. ${PLAYBOOK_ROUTER_HELP}` `` line (line 143) and before `DESIGN_SYSTEM_HINT`:

```js
      "To plan a feature or change before building it, run `lavish-axi playbook plan`: surface the open questions and edge cases as a visual review surface first, converge with the user, then produce a spec and a bite-sized implementation plan.",
```

In `src/design-reference.js`, change the `playbook_router` object (lines 87-90) to:

```js
    playbook_router: {
      instruction: PLAYBOOK_ROUTER_INSTRUCTION,
      planning:
        "To plan a feature or change, open the `plan` playbook: surface open questions and edge cases for visual review first, then produce a spec and implementation plan.",
      playbooks: listPlaybooks(),
    },
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test test/cli-output.test.js`
Expected: PASS. (Existing home-help assertions use `.some(...)`, so the extra entry does not break them; the design test only asserted `.instruction`, `.playbooks.length`, and the diagram `use_when`, so the added key is safe.)

- [ ] **Step 5: Add the README note**

In `README.md`, immediately after the playbook-ID list paragraph (line 190-191, the "One artifact often combines several playbooks…" paragraph), add:

```markdown
**Feature planning.** Run `lavish-axi playbook plan` to plan a feature or change before building it: the agent surfaces every open question and edge case as an annotatable visual review surface first, converges with you, then writes a durable spec and a bite-sized implementation plan. The companion skills `lavish-plan` (drive planning) and `lavish-implement` (execute a finished `plan.md` with a fresh subagent per task) ship in the package for agents that want the full end-to-end pipeline.
```

- [ ] **Step 6: Regenerate the skill and verify sync**

The new help entry feeds `bullets(home.help.map(skillCommandText))` in `createSkillMarkdown()`, so `SKILL.md` drifts.

Run: `pnpm run build:skill`
Run: `node scripts/build-skill.js --check` — Expected: exit 0.
Run: `node --test test/skill.test.js` — Expected: PASS (the data-driven `home.help` loop auto-covers the new entry; the `doesNotMatch(md, /Run \`lavish-axi/)` guard still holds because the pointer uses lowercase "run" and is rewritten to `npx -y lavish-axi`).
Run: `node --test test/package-json.test.js` — Expected: PASS.

- [ ] **Step 7: Format and commit**

Run: `prettier --write src/cli.js src/design-reference.js test/cli-output.test.js README.md skills/lavish/SKILL.md`
Then:

```bash
git add src/cli.js src/design-reference.js test/cli-output.test.js README.md skills/lavish/SKILL.md
git commit -m "feat(cli): surface the plan-playbook planning flow at SessionStart"
```

---

## Task 3: Author `skills/lavish-plan/SKILL.md` (the driver)

**Files:**
- Create: `skills/lavish-plan/SKILL.md`

**Interfaces:**
- Consumes: the enriched `plan` playbook (Task 1), opened at runtime via `lavish-axi playbook plan`.
- Produces: the driver skill invoked by name (`lavish-plan`) or by planning-intent phrases; references sibling files `plan-template.md` and `review-rubrics.md` (created in Task 4) and hands off to `lavish-implement` (Task 5).

- [ ] **Step 1: Write the file**

Create `skills/lavish-plan/SKILL.md` with exactly this content:

~~~markdown
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

1. Export the review artifact — **large route only**:
   `lavish-axi export .lavish/<topic>-review.html --out docs/atelier/<YYYY-MM-DD>-<type>-<topic>/review.html`.
   The small route keeps a reduced record set and skips this export.
2. Write files into `docs/atelier/<YYYY-MM-DD>-<type>-<topic>/` (create parents):
   - **large:** `spec.md` + `plan.md` + `review.html`.
   - **small:** `plan.md` only (no `spec.md`, no `review.html`); `plan.md` is always written so
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
  --description="Add a user-facing dark mode toggle. Spec & plan: docs/atelier/2026-07-02-feature-dark-mode/ (spec.md, plan.md, review.html)"
bd create --title="Add theme CSS variables" --type=task --priority=2 \
  --description="Plan task 1. See docs/atelier/2026-07-02-feature-dark-mode/plan.md (Task 1)"
bd create --title="Add toggle component + persistence" --type=task --priority=2 \
  --description="Plan task 2. See docs/atelier/2026-07-02-feature-dark-mode/plan.md (Task 2)"
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
~~~

- [ ] **Step 2: Verify structure and content anchors**

Run:
```bash
prettier --check skills/lavish-plan/SKILL.md
grep -q "name: lavish-plan" skills/lavish-plan/SKILL.md && \
grep -q "lavish-axi playbook plan" skills/lavish-plan/SKILL.md && \
grep -q "Phase 8 — Hand-back" skills/lavish-plan/SKILL.md && \
grep -q "lavish-implement" skills/lavish-plan/SKILL.md && \
echo "anchors OK"
```
Expected: `prettier --check` passes (run `prettier --write skills/lavish-plan/SKILL.md` first if it reports formatting) and `anchors OK` prints.

- [ ] **Step 3: Commit**

```bash
git add skills/lavish-plan/SKILL.md
git commit -m "feat(skill): add lavish-plan driver skill"
```

---

## Task 4: Author `skills/lavish-plan/` reference files (plan template + review rubrics)

**Files:**
- Create: `skills/lavish-plan/plan-template.md`
- Create: `skills/lavish-plan/review-rubrics.md`

**Interfaces:**
- Consumes: referenced by `SKILL.md` Phases 5-6.
- Produces: the canonical `plan.md` skeleton and the two subagent review rubrics.

- [ ] **Step 1: Write `skills/lavish-plan/plan-template.md`**

~~~markdown
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
~~~

- [ ] **Step 2: Write `skills/lavish-plan/review-rubrics.md`**

~~~markdown
# Review rubrics for lavish-plan subagent reviewers

Dispatch each reviewer as a FRESH subagent. Give it only the inputs listed and instruct it to
return findings as a ranked list — `[blocker|major|minor] <location> — <issue> — Fix: <fix>` —
plus a one-line verdict. Fix findings, then re-dispatch. After 3 rounds without a clean pass,
stop and surface the remaining findings to the user.

## Spec rubric (Phase 5, large route)

Inputs to pass: the `spec.md` text and the confirmed decisions from the lavish review.
Check:
1. **Completeness** — every confirmed decision and component is specified; no gap between the
   review surface and the spec.
2. **Internal consistency** — sections do not contradict each other; architecture matches the
   component descriptions.
3. **Ambiguity** — no requirement can be read two ways; each is concrete.
4. **Scope / decomposition** — focused enough for one implementation plan; flag if it should
   be split.
5. **YAGNI** — nothing specified beyond what the feature needs.
6. **Edge-case coverage** — failure modes, empty/error states, and the degradation paths are
   all addressed.

## Plan rubric (Phase 6)

Inputs to pass: the `spec.md` (if any) and the `plan.md`.
Check:
1. **Spec↔plan coverage** — every spec requirement maps to at least one plan task; list gaps.
2. **Project fit** — tasks follow the target project's conventions, commands, and file layout.
3. **No placeholders** — no "TBD", "add error handling", "similar to Task N", or code steps
   missing their code.
4. **Type/signature consistency** — names and signatures used in later tasks match earlier
   definitions.
5. **Bite-sized TDD structure** — each task is failing test → run fail → minimal impl → run
   pass → commit, with exact paths and complete code.
6. **Independently testable** — each task ends with a deliverable a fresh reviewer could gate.
~~~

- [ ] **Step 3: Verify and commit**

Run:
```bash
prettier --check skills/lavish-plan/plan-template.md skills/lavish-plan/review-rubrics.md
grep -q "NO placeholders" skills/lavish-plan/plan-template.md && \
grep -q "Spec rubric" skills/lavish-plan/review-rubrics.md && \
grep -q "Plan rubric" skills/lavish-plan/review-rubrics.md && echo "anchors OK"
```
Expected: `prettier --check` passes (run `prettier --write` first if needed) and `anchors OK` prints.

```bash
git add skills/lavish-plan/plan-template.md skills/lavish-plan/review-rubrics.md
git commit -m "feat(skill): add lavish-plan plan template and review rubrics"
```

---

## Task 5: Author `skills/lavish-implement/SKILL.md` (the executor)

**Files:**
- Create: `skills/lavish-implement/SKILL.md`

**Interfaces:**
- Consumes: a `plan.md` path (from `lavish-plan` Phase 8, or supplied directly by a fresh
  session).
- Produces: the execution skill, independently triggerable by name.

- [ ] **Step 1: Write the file**

Create `skills/lavish-implement/SKILL.md` with exactly this content:

~~~markdown
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
~~~

- [ ] **Step 2: Verify and commit**

Run:
```bash
prettier --check skills/lavish-implement/SKILL.md
grep -q "name: lavish-implement" skills/lavish-implement/SKILL.md && \
grep -q "FRESH implementer subagent" skills/lavish-implement/SKILL.md && \
grep -q "Branch safety" skills/lavish-implement/SKILL.md && echo "anchors OK"
```
Expected: `prettier --check` passes (run `prettier --write` first if needed) and `anchors OK` prints.

```bash
git add skills/lavish-implement/SKILL.md
git commit -m "feat(skill): add lavish-implement execution skill"
```

---

## Task 6: Package the skills and guard them (package.json + test + full check)

**Files:**
- Modify: `package.json:10-16` (the `files` array)
- Create: `test/skills-packaging.test.js`

**Interfaces:**
- Consumes: the four skill files created in Tasks 3-5.
- Produces: the two new skill directories in the published `files` allowlist, guarded by a test.

- [ ] **Step 1: Write the failing test**

Create `test/skills-packaging.test.js`:

```js
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("published package includes the planning and execution skills", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));

  assert.ok(packageJson.files.includes("skills/lavish-plan"), "ships skills/lavish-plan");
  assert.ok(packageJson.files.includes("skills/lavish-implement"), "ships skills/lavish-implement");
});

test("lavish-plan skill exists with its reference files and driver anchors", async () => {
  assert.ok(existsSync(new URL("skills/lavish-plan/SKILL.md", root)));
  assert.ok(existsSync(new URL("skills/lavish-plan/plan-template.md", root)));
  assert.ok(existsSync(new URL("skills/lavish-plan/review-rubrics.md", root)));

  const skill = await readFile(new URL("skills/lavish-plan/SKILL.md", root), "utf8");
  assert.match(skill, /^name: lavish-plan$/m);
  assert.ok(skill.includes("lavish-axi playbook plan"), "opens the enriched plan playbook");
  assert.ok(skill.includes("lavish-implement"), "hands off to the execution skill");
});

test("lavish-implement skill exists and is independently triggerable", async () => {
  assert.ok(existsSync(new URL("skills/lavish-implement/SKILL.md", root)));

  const skill = await readFile(new URL("skills/lavish-implement/SKILL.md", root), "utf8");
  assert.match(skill, /^name: lavish-implement$/m);
  assert.ok(skill.includes("plan.md"), "executes a plan.md");
  assert.ok(skill.includes("fresh subagent per task") || skill.includes("FRESH implementer subagent"));
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test test/skills-packaging.test.js`
Expected: FAIL on the first test — `package.json` `files` does not yet include the two skill dirs. (The existence assertions already pass because Tasks 3-5 created the files.)

- [ ] **Step 3: Add the skill directories to `package.json` `files`**

In `package.json`, extend the `files` array (lines 10-16) to:

```json
  "files": [
    "dist",
    "skills/lavish",
    "skills/lavish-plan",
    "skills/lavish-implement",
    "lavish-editor-marketing/renders/lavish-editor-marketing.gif",
    "LICENSE",
    "README.md"
  ],
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node --test test/skills-packaging.test.js`
Expected: PASS. Also run `node --test test/package-json.test.js` — Expected: PASS (its `files.includes("skills/lavish")` membership assertion is unaffected).

- [ ] **Step 5: Run the full check**

Run: `pnpm run format` then `pnpm run check`
Expected: PASS — build, lint, `format:check` (including all new `skills/**/*.md`), typecheck, all tests, and `build-skill.js --check` are green.

- [ ] **Step 6: Commit**

```bash
git add package.json test/skills-packaging.test.js
git commit -m "chore(pkg): ship and guard lavish-plan and lavish-implement skills"
```

---

## Self-Review

**1. Spec coverage.**
- Product Changes §1 (enrich `plan` playbook, all six fields + decision-card template) → Task 1.
- §2 (home `help` pointer) → Task 2. §3 (design-router `planning` note, now in scope) → Task 2.
- §4 ripple: `build:skill` regen → Tasks 1 & 2 Step 5/6; `cli-output.test.js` use_when + stale-test + home-help + design-planning + enriched-plan test → Tasks 1-2; `skill.test.js` is data-driven (no edit needed, noted); `package.json` files → Task 6; `package-json.test.js` membership unaffected (verified); README note → Task 2; Prettier on skills → each skill task + Task 6.
- Skill Shape (lavish-plan = SKILL.md + plan-template.md + review-rubrics.md; lavish-implement = single SKILL.md; frontmatter/triggers for both; portability; hand-off) → Tasks 3, 4, 5.
- Components B1-B8 → `lavish-plan/SKILL.md` Phases 1-8 (Task 3). C1 → `lavish-implement/SKILL.md` (Task 5). Review loops + rubrics → Task 4 + Phases 5-6. File & record layout + small/large routing + graceful degradation + early-end + never-clobber → Task 3 Phases 4/7 and the Global Constraints.
- Packaging → Task 6.

**2. Placeholder scan.** No plan-level placeholders. The strings `"TBD"`, `"add error handling"`, `"similar to Task N"` appear only as quoted anti-patterns inside skill/playbook content (intended). Every code and content step shows complete content.

**3. Type/consistency.** The `use_when` string is identical in Task 1's `src/playbooks.js`, Task 1's test, and the enriched-plan test. The decision-card class/attribute names (`decision-card`, `data-lavish-question`, `window.lavish.queuePrompt`, `subject project's design system`) match between the `playbooks.js` template and the test assertions. Skill file names referenced in `lavish-plan/SKILL.md` (`plan-template.md`, `review-rubrics.md`) match the files created in Task 4 and the anchors asserted in Task 6.
