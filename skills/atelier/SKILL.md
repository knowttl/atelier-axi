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
In restricted subprocess sandboxes, CI, or agent harnesses where `npx -y` exits opaquely (for example with status 216), use an already-installed copy directly: `node "$(npm root)/atelier-axi/dist/cli.mjs" <html-file>` for a local install, `node "$(npm root -g)/atelier-axi/dist/cli.mjs" <html-file>` for a global install, or the bare `atelier-axi <html-file>` bin after installing once.

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
3. **Execute an existing `plan.md`** — the user points at a finished plan or opts in to build one just produced. **Read `implementing.md` (next to this file) and follow it:** one fresh subagent per task, end-to-end verification against real user-expected behavior, a review between tasks, and a final whole-branch review, all in an isolated worktree.

Planning and implementation are one continuous arc: `planning.md` ends by offering to hand its `plan.md` to the `implementing.md` flow on explicit user opt-in. Both reference files are self-contained — load the one that matches the request.

## Workflow

1. Create the HTML artifact (default location `.atelier/<name>.html` in the working directory).
2. Run `npx -y atelier-axi <html-file>` to open or resume a review session in the browser.
3. Run `npx -y atelier-axi poll <html-file>` to long-poll for the user's annotations and queued prompts.
   On the first poll, prefer `--agent-reply "<one-line summary of what you built and what to review first>"` so the conversation panel opens with context.
   Browser-detected layout issues are filed passively in the user's Layout issues inbox and arrive as an ordinary `layout-warnings` prompt only when the user selects and queues them. Never edit an issue the user has not queued. The only response that arrives without user action is `artifact_failures`, when the review surface itself is unusable.
   The poll stays silent until the user acts or a fatal artifact failure makes the review surface unusable - leave it running, never kill it.
   Cosmetic, intentional, transient, tiny, and uncertain observations remain silent.
   Keep the poll in the foreground by default and let it return the feedback directly to the agent.
   A background poll is allowed only through a harness-native tracked background-job facility whose completion result is guaranteed to resume or notify the same agent.
   Never use `nohup`, shell `&`, `disown`, redirected fire-and-forget processes, or a detached terminal without an explicit verified callback merely to keep polling alive.
   If the harness has no completion-aware background facility, use the foreground poll or first wire a verified wake callback into the surrounding supervisor.
   Do not tell the user the artifact is being monitored until that wake path is live.
   If the poll gets killed or times out anyway, just re-run it - queued feedback is never lost.
   Run at most one poll per artifact: a session delivers each batch of feedback to one owning poll and retires every competing poll with a POLL_SUPERSEDED error rather than splitting feedback between them.
   Every delivered poll response ends with a `prompts_delivered=<N> batch_file=<path>` line: compare `<N>` against the prompts you actually read, and if you read fewer, your own output capture truncated the response - read the whole batch from `batch_file` instead of asking the user to repeat themselves. A `batch_file` value of `-` means the recovery copy could not be written, not that `-` is a filename.
4. If poll returns feedback, apply the user's prompts. A `layout-warnings` prompt is an explicit repair request; apply every listed fix in one pass before saving, and let Atelier re-check it after a newer artifact load.
5. Apply human feedback, then poll again with `--agent-reply "<message>"` to reply in the browser and keep the loop going under the same foreground-or-verified-wake-path rule.
6. `Send & End` ends the session. Its final feedback is still delivered once. After that response, polling stops, and the agent must not reopen the session uninvited. Deliver any remaining updates directly in this conversation.
7. Wrap up when the review is finished - see the wrap-up entry under **Commands & rules** below for the full procedure: `npx -y atelier-axi end <html-file>`, then `npx -y atelier-axi stop` once no other session is listed, plus the leftovers to check.

## Visual guidance

- Use visual hierarchy to make the most important decisions, risks, tradeoffs, and next actions obvious at a glance
- Use visual structure such as sections, cards, tables, diagrams, annotated snippets, and side-by-side comparisons instead of long prose
- Choose typography, spacing, color, and layout deliberately so the artifact has a clear point of view
- Prevent horizontal overflow at every nesting level: nested grid/flex children also need minmax(0, 1fr) tracks and min-width: 0, especially when badges, labels, or status text use wide pixel or monospace fonts; wrap, truncate, or contain long unbreakable text deliberately
- When the artifact would describe existing or current UI or state, show it instead: capture screenshots of the real pages (run the app read-only if needed) and embed them, rather than explaining the current look in prose; reserve prose for what cannot be shown such as rationale, trade-offs, and open questions

## Playbooks

Run `npx -y atelier-axi playbook <id>` for focused, detailed guidance on any of these.
One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
For flows, architecture, state, or sequence diagrams, do not hand-build boxes-and-arrows from div/flexbox; open the diagram playbook and use the theme-aware Mermaid snippet from `npx -y atelier-axi design` unless SVG is needed for richly annotated nodes.

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
- Run `npx -y atelier-axi poll <html-file>` to wait for user feedback. It long-polls and stays silent until the user sends feedback or ends the session, so leave it running - never kill it. Detected layout issues never return this poll: the browser files them in the user's Layout issues inbox in the Atelier top bar, and they arrive as an ordinary tag "layout-warnings" prompt only when the user selects them and queues the fixes. Never edit the artifact to chase a layout issue the user has not queued. The only exception is a fatal artifact_failures response, which means the review surface itself could not be used. Keep the poll in the foreground by default and let it return the feedback directly to the agent. A background poll is allowed only through a harness-native tracked background-job facility whose completion result is guaranteed to resume or notify the same agent. Never use `nohup`, shell `&`, `disown`, redirected fire-and-forget processes, or a detached terminal without an explicit verified callback merely to keep polling alive. If the harness has no completion-aware background facility, use the foreground poll or first wire a verified wake callback into the surrounding supervisor. Do not tell the user the artifact is being monitored until that wake path is live. If the poll gets killed or times out anyway, just re-run it - queued feedback is never lost. Run at most one poll per artifact: a session delivers each batch of feedback to one owning poll and retires every competing poll with a POLL_SUPERSEDED error rather than splitting feedback between them. Every delivered poll response ends with a `prompts_delivered=<N> batch_file=<path>` line: compare `<N>` against the prompts you actually read, and if you read fewer, your own output capture truncated the response - read the whole batch from `batch_file` instead of asking the user to repeat themselves. A `batch_file` value of `-` means the recovery copy could not be written, not that `-` is a filename. `Send & End` ends the session. Its final feedback is still delivered once. After that response, polling stops, and the agent must not reopen the session uninvited.
- Rendered Mermaid diagrams in `.mermaid` containers become embedded, editable Excalidraw whiteboards in the browser (click a diagram to unlock editing; a Fullscreen action opens it over the whole viewport) - flowchart, sequence, class, ER, and state diagrams convert to editable shapes; other types embed as an image to draw on. Scenes autosave locally; when a reload detects a changed Mermaid source, the reviewer explicitly chooses to re-convert and discard saved edits or keep editing the saved scene. Standalone and exported copies still render plain Mermaid. Queue feedback adds a prompt to the Conversation panel; when the user sends it, poll returns a tag "whiteboard" prompt carrying a bounded edit summary plus local scenePath (.excalidraw JSON) and previewPath (PNG) files - read the summary first, open the files only when needed, then apply the edits by updating the Mermaid source in the artifact (never try to write the scene back)
- When a review is finished, wrap up so sessions and the shared server do not linger. Run `npx -y atelier-axi end <html-file>` to end the session as the agent - ending it this way still allows a plain reopen later, while a session the user ended from the browser refuses a plain reopen and needs `--reopen`. Then, once `npx -y atelier-axi` lists no other session, run `npx -y atelier-axi stop` to shut the shared background server down promptly; it also self-stops when idle (default 30 minutes) or as soon as the last session ends with nothing connected, so a manual stop is prompt cleanup rather than a requirement. When `ATELIER_AXI_IDLE_TIMEOUT_MS` is `0` or `off`, a manual stop can be required. If the artifact file was already deleted, `end` fails with ENOENT and the session keeps showing as open even after the server stops - recreate an empty file at that exact path, run `end`, then delete it again. Anything you started alongside the server, such as a LAN port forwarder or SSH tunnel, is a separate process Atelier never stops for you. Leftovers worth clearing once the review is over: the artifacts under `.atelier/` and any `<name>.export.html` beside them, plus whiteboard scene sidecars under `<state-dir>/whiteboards/<key>/` and the last delivered batch copy at `<state-dir>/batches/<key>.json` - `<state-dir>` is `~/.atelier-axi` by default or `ATELIER_AXI_STATE_DIR` when set, and `<key>` is the final segment of that session's URL - which are never removed automatically.
- Run `npx -y atelier-axi export <html-file> [--out <path>]` to write a portable copy of the artifact - one HTML file with its LOCAL assets inlined - so it opens with no Atelier server and no sibling files. Remote CDN/font references are left as links, so it needs network to render those. Users can also export from the browser chrome's overflow menu
- Run `npx -y atelier-axi share <html-file> [--password <pw>] [--token <t>]` to publish the artifact on ht-ml.app (https://ht-ml.app), a third-party hosting service not part of Atelier, and get back a visitable URL. Shares are PUBLIC by default, so anyone with the link can open them. Pass --password to publish a PRIVATE password-protected page; viewers must supply the password to view. Local assets are inlined; remote refs load over the network. It returns the url plus a secret update_key for managing the page later. Use --token or ATELIER_AXI_HTML_APP_TOKEN only when you have an optional bearer token; it is never required. Users can also publish from the browser chrome's overflow menu
- Run `npx -y atelier-axi playbook <playbook_id>` for focused artifact guidance. One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
- To plan a feature or change before building it, run `npx -y atelier-axi playbook plan`: surface the open questions and edge cases as a visual review surface first, converge with the user, then produce a spec and a bite-sized implementation plan.
- Atelier does not auto-inject any design system - artifacts stay portable so they render identically when opened directly without atelier-axi running. Before writing any HTML, decide the design direction in this strict priority order, and only move to the next step when the current one truly yields nothing: (1) if the user asked for a specific look or named design system, use that; (2) otherwise you must first inspect the project the artifact is about - the subject or product whose content or UI it represents, which may differ from your current working directory - and match that project's design system: Tailwind or theme config, shared CSS variables or design tokens, component library, brand assets, or existing styled pages. If the artifact previews, proposes, or mocks a specific app's UI, render it in that app's own design system so it faithfully shows the product, even when you are running in a different repo; (3) only when both steps come up empty, use the Atelier-recommended Tailwind CSS browser runtime v4 + DaisyUI v5, available via CDN - run `npx -y atelier-axi design` for a content-to-playbook router, a copy-pasteable CDN snippet, a Mermaid CDN snippet/init for diagrams, and the DaisyUI component reference, and prefer the Tailwind/DaisyUI CDN snippet over hand-writing styles unless explicitly instructed otherwise by the user. When you deliver the artifact, state which of the three design sources you used and why.
- Use atelier-axi when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop
