---
name: atelier
description: Turn complex or visual agent responses into rich, reviewable HTML artifacts the user can annotate and send feedback on, and drive the feature-planning pipeline end to end, using the atelier-axi CLI. Use when about to give a plan, comparison, diagram, table, code diff, or report; when the user says "plan this", "let's design X", or "write a spec/plan for Y"; when asked to "implement plan.md" or execute a finished plan; or for anything easier to grasp visually than as prose.
argument-hint: <what the artifact should show>
author: Kun Chen (kunchenguid)
metadata:
  hermes:
    tags: [html, review, artifacts, visualization]
    category: productivity
---

# Atelier Editor

Atelier Editor helps agents turn rich HTML artifacts into collaborative human review surfaces. Whenever you are about to give user a complex response that will be easier to understand via a rich / interactive page, consider using Atelier Editor. First generate an interactive HTML artifact according to user request, then run `npx -y atelier-axi <html-file>` so the user can visually review it, annotate elements or selected text, queue prompts, and send feedback back through `npx -y atelier-axi poll`.

You do not need atelier-axi installed globally - invoke it with `npx -y atelier-axi <html-file>`.
If atelier-axi output shows a follow-up command starting with `atelier-axi`, run it as `npx -y atelier-axi ...` instead.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked `/atelier` explicitly - build an HTML artifact for that request now, following the workflow below.
If it is empty, infer what to visualize from the conversation.

## When to use

Use atelier-axi when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop

## Choose your mode

Atelier is one skill that covers three kinds of work. Decide which the request is before writing anything — the planning and implementation modes live in reference files next to this one, loaded on demand:

1. **Quick visual artifact + review** (default) — the user wants to see a comparison, table, diagram, report, code diff, or any explanation as a rich, annotatable page. Follow the **Workflow** below.
2. **Plan a feature, fix, or change before building it** — the user says "plan this", "let's design X", "write a spec/plan for Y", or is about to jump into implementation without a validated plan. **Read `planning.md` (next to this file) and follow it:** surface every open question, edge case, and candidate approach as an annotatable review surface, converge on an approved direction, then write durable records under `docs/atelier/<YYYY-MM-DD>-<type>-<topic>/` — `spec.md` + `plan.md` on the large route, `plan.md` only on the small route — plus beads issues. Spec/plan output ALWAYS goes under `docs/atelier/`, never left in `.atelier/`. If the user instead asks for a lightweight, no-browser plan — "quick plan", "plan without UI", "headless plan", "plan in chat", or to save tokens — follow `planning.md`'s **Headless mode**: run the same arc as a chat-only question loop (batched questions, approve-the-design gate, spec+plan on the large route, plan only on the small route) with no HTML artifact.
3. **Execute an existing `plan.md`** — the user points at a finished plan or opts in to build one just produced. **Read `implementing.md` (next to this file) and follow it:** one fresh subagent per task, TDD, a review between tasks, and a final whole-branch review, all in an isolated worktree.

Planning and implementation are one continuous arc: `planning.md` ends by offering to hand its `plan.md` to the `implementing.md` flow on explicit user opt-in. Both reference files are self-contained — load the one that matches the request.

## Workflow

1. Create the HTML artifact (default location `.atelier/<name>.html` in the working directory).
2. Run `npx -y atelier-axi <html-file>` to open or resume a review session in the browser.
3. Run `npx -y atelier-axi poll <html-file>` to long-poll for the user's annotations, queued prompts, and browser-reported `layout_warnings`.
   The poll stays silent until the user acts or the real browser reports fresh layout warnings - leave it running, never kill it.
   If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost.
4. If poll returns `layout_warnings`, follow the returned `next_step`: fix and re-check fresh error-severity findings, but proceed with a note instead of looping when every current warning is persistent or low-severity.
5. Apply human feedback, then poll again with `--agent-reply "<message>"` to reply in the browser and keep the loop going.
6. Run `npx -y atelier-axi end <html-file>` when the review is finished.
7. If the user ends the session from the browser instead, `npx -y atelier-axi <html-file>` refuses to reopen it and says so - only pass `--reopen` when the user asks for further review or something genuinely important needs their visual attention. Otherwise deliver remaining updates directly in this conversation.

## Visual guidance

- Use visual hierarchy to make the most important decisions, risks, tradeoffs, and next actions obvious at a glance
- Use visual structure such as sections, cards, tables, diagrams, annotated snippets, and side-by-side comparisons instead of long prose
- Choose typography, spacing, color, and layout deliberately so the artifact has a clear point of view
- Prevent horizontal overflow at every nesting level: nested grid/flex children also need minmax(0, 1fr) tracks and min-width: 0, especially when badges, labels, or status text use wide pixel or monospace fonts; wrap, truncate, or contain long unbreakable text deliberately
- When the artifact would describe existing or current UI or state, show it instead: capture screenshots of the real pages (run the app read-only if needed) and embed them, rather than explaining the current look in prose; reserve prose for what cannot be shown such as rationale, trade-offs, and open questions

## Playbooks

Run `npx -y atelier-axi playbook <id>` for focused, detailed guidance on any of these.
One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
For flows, architecture, state, or sequence diagrams, do not hand-build boxes-and-arrows from div/flexbox; open the diagram playbook and use Mermaid unless SVG is needed for richly annotated nodes.

- `diagram` - Map relationships, flows, state, and architecture
- `table` - Turn dense records into scan-friendly review surfaces
- `comparison` - Show options, tradeoffs, and current vs target behavior
- `plan` - Plan a feature, fix, or change before implementation: surface open questions and edge cases for review, then produce a spec and implementation plan
- `code` - Render source code, code files, patches, PR diffs, and before/after code inside Atelier artifacts
- `input` - Must be used when the agent needs to collect user input on decisions, choices, preferences, triage, scope, or other structured feedback from within the artifact
- `slides` - Create a deliberate presentation when slides are requested

## Commands & rules

- Run `npx -y atelier-axi <html-file>` to open or resume a Atelier Editor session. If the user explicitly ended the session from the browser, this refuses to reopen it and explains why instead of reopening uninvited - pass `--reopen` only when the user asks for further review or something important needs their visual attention
- Unless the user specifies another location, create HTML artifacts in the current working directory under `.atelier/`
- Atelier serves the html file through a local express.js server. If your html needs to reference other filesystem assets such as images, CSS, fonts, and local scripts, copy them into the same directory as the HTML file, then reference them with relative paths from that directory. Never prepend `/` to those asset paths - root paths won't work
- Run `npx -y atelier-axi poll <html-file>` to wait for user feedback or browser-reported layout_warnings. It long-polls and stays silent until the user sends feedback, ends the session, or the real browser reports fresh layout_warnings, so leave it running - never kill it. Fix and re-check fresh error-severity layout_warnings before involving the human; if the poll says every current warning is persistent or low-severity, proceed with a note instead of looping. If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost. When it reports the session ended, stop polling and do not reopen it uninvited - deliver remaining updates in this conversation instead
- Run `npx -y atelier-axi end <html-file>` to end a session as the agent - ending it this way still allows a plain reopen later. When the user ends it from the browser instead, a later `npx -y atelier-axi <html-file>` refuses to reopen it without `--reopen`
- Run `npx -y atelier-axi export <html-file> [--out <path>]` to write a portable copy of the artifact - one HTML file with its LOCAL assets inlined - so it opens with no Atelier server and no sibling files. Remote CDN/font references are left as links, so it needs network to render those. Users can also export from the browser chrome's overflow menu
- Run `npx -y atelier-axi share <html-file> [--password <pw>] [--token <t>]` to publish the artifact on ht-ml.app (https://ht-ml.app), a third-party hosting service not part of Atelier, and get back a visitable URL. Shares are PUBLIC by default, so anyone with the link can open them. Pass --password to publish a PRIVATE password-protected page; viewers must supply the password to view. Local assets are inlined; remote refs load over the network. It returns the url plus a secret update_key for managing the page later. Use --token or ATELIER_AXI_HTML_APP_TOKEN only when you have an optional bearer token; it is never required. Users can also publish from the browser chrome's overflow menu
- Run `npx -y atelier-axi stop` to shut down the background server (it also self-stops when idle or after the last session ends with nothing connected)
- Run `npx -y atelier-axi playbook <playbook_id>` for focused artifact guidance. One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
- To plan a feature or change before building it, run `npx -y atelier-axi playbook plan`: surface the open questions and edge cases as a visual review surface first, converge with the user, then produce a spec and a bite-sized implementation plan.
- Atelier does not auto-inject any design system - artifacts stay portable so they render identically when opened directly without atelier-axi running. Before writing any HTML, decide the design direction in this strict priority order, and only move to the next step when the current one truly yields nothing: (1) if the user asked for a specific look or named design system, use that; (2) otherwise you must first inspect the project the artifact is about - the subject or product whose content or UI it represents, which may differ from your current working directory - and match that project's design system: Tailwind or theme config, shared CSS variables or design tokens, component library, brand assets, or existing styled pages. If the artifact previews, proposes, or mocks a specific app's UI, render it in that app's own design system so it faithfully shows the product, even when you are running in a different repo; (3) only when both steps come up empty, use the Atelier-recommended Tailwind CSS browser runtime v4 + DaisyUI v5, available via CDN - run `npx -y atelier-axi design` for a content-to-playbook router, a copy-pasteable CDN snippet, a Mermaid CDN snippet/init for diagrams, and the DaisyUI component reference, and prefer the Tailwind/DaisyUI CDN snippet over hand-writing styles unless explicitly instructed otherwise by the user. When you deliver the artifact, state which of the three design sources you used and why.
- Use atelier-axi when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop
