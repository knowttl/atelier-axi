import { POLL_SEND_AND_END_RULE, POLL_WAKE_PATH_RULES, createHomeOutput } from "./cli.js";
import { PLAYBOOK_ROUTER_HELP } from "./playbooks.js";

// Trigger string Claude Code (and other agents) match against to auto-load the skill.
// Kept terse and outcome-focused so it fires on "about to show something visual" intents.
export const SKILL_DESCRIPTION =
  "Turn complex or visual agent responses into rich, reviewable HTML artifacts the user can " +
  "annotate and send feedback on, and drive the feature-planning pipeline end to end, using the " +
  "atelier-axi CLI. Use when about to give a plan, comparison, diagram, table, code diff, or " +
  'report; when the user says "plan this", "let\'s design X", or "write a spec/plan for Y"; when ' +
  'asked to "implement plan.md" or execute a finished plan; or for anything easier to grasp ' +
  "visually than as prose.";

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function playbookList(playbooks) {
  return playbooks.map((p) => `- \`${p.id}\` - ${p.use_when}`).join("\n");
}

function skillCommandText(text) {
  return text.replaceAll("`atelier-axi", "`npx -y atelier-axi");
}

/**
 * Render the installable SKILL.md for the atelier skill. The body mirrors what
 * `atelier-axi` prints with no arguments (minus live session state), while the
 * frontmatter adds discovery metadata for Agent Skills and Hermes Agent.
 *
 * @returns {string} full SKILL.md contents including YAML frontmatter
 */
export function createSkillMarkdown() {
  const home = createHomeOutput({ bin: "atelier-axi", sessions: [], includeSessions: false, agent: "static" });

  return `---
name: atelier
description: ${SKILL_DESCRIPTION}
argument-hint: <what the artifact should show>
author: Kun Chen (kunchenguid)
metadata:
  hermes:
    tags: [html, review, artifacts, visualization]
    category: productivity
---

# Atelier Editor

${skillCommandText(home.description)}

You do not need atelier-axi installed globally - invoke it with \`npx -y atelier-axi <html-file>\`.
If atelier-axi output shows a follow-up command starting with \`atelier-axi\`, run it as \`npx -y atelier-axi ...\` instead.
In restricted subprocess sandboxes, CI, or agent harnesses where \`npx -y\` exits opaquely (for example with status 216), use an already-installed copy directly: \`node "$(npm root)/atelier-axi/dist/cli.mjs" <html-file>\` for a local install, \`node "$(npm root -g)/atelier-axi/dist/cli.mjs" <html-file>\` for a global install, or the bare \`atelier-axi <html-file>\` bin after installing once.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked \`/atelier\` explicitly - build an HTML artifact for that request now, following the workflow below.
If it is empty, infer what to visualize from the conversation.

## When to use

${home.help[home.help.length - 1]}

## Choose your mode

Atelier is one skill that covers three kinds of work. Decide which the request is before writing anything — the planning and implementation modes live in reference files next to this one, loaded on demand:

1. **Quick visual artifact + review** (default) — the user wants to see a comparison, table, diagram, report, code diff, or any explanation as a rich, annotatable page. Follow the **Workflow** below.
2. **Plan a feature, fix, or change before building it** — the user says "plan this", "let's design X", "write a spec/plan for Y", or is about to jump into implementation without a validated plan. **Read \`planning.md\` (next to this file) and follow it:** surface every open question, edge case, and candidate approach as an annotatable review surface, converge on an approved direction, then write durable records under \`docs/atelier/<YYYY-MM-DD>-<type>-<topic>/\` — \`spec.md\` + \`plan.md\` on the large route, \`plan.md\` only on the small route — plus beads issues. Spec/plan output ALWAYS goes under \`docs/atelier/\`, never left in \`.atelier/\`. If the user instead asks for a lightweight, no-browser plan — "quick plan", "plan without UI", "headless plan", "plan in chat", or to save tokens — follow \`planning.md\`'s **Headless mode**: run the same arc as a chat-only question loop (batched questions, approve-the-design gate, spec+plan on the large route, plan only on the small route) with no HTML artifact.
3. **Execute an existing \`plan.md\`** — the user points at a finished plan or opts in to build one just produced. **Read \`implementing.md\` (next to this file) and follow it:** one fresh subagent per task, end-to-end verification against real user-expected behavior, a review between tasks, and a final whole-branch review, all in an isolated worktree.

Planning and implementation are one continuous arc: \`planning.md\` ends by offering to hand its \`plan.md\` to the \`implementing.md\` flow on explicit user opt-in. Both reference files are self-contained — load the one that matches the request.

## Workflow

1. Create the HTML artifact (default location \`.atelier/<name>.html\` in the working directory).
2. Run \`npx -y atelier-axi <html-file>\` to open or resume a review session in the browser.
3. Run \`npx -y atelier-axi poll <html-file>\` to long-poll for the user's annotations and queued prompts.
   On the first poll, prefer \`--agent-reply "<one-line summary of what you built and what to review first>"\` so the conversation panel opens with context.
   Browser-detected layout issues are filed passively in the user's Layout issues inbox and arrive as an ordinary \`layout-warnings\` prompt only when the user selects and queues them. Never edit an issue the user has not queued. The only response that arrives without user action is \`artifact_failures\`, when the review surface itself is unusable.
   The poll stays silent until the user acts or a fatal artifact failure makes the review surface unusable - leave it running, never kill it.
   Cosmetic, intentional, transient, tiny, and uncertain observations remain silent.
${POLL_WAKE_PATH_RULES.map((rule) => `   ${skillCommandText(rule)}`).join("\n")}
4. If poll returns feedback, apply the user's prompts. A \`layout-warnings\` prompt is an explicit repair request; apply every listed fix in one pass before saving, and let Atelier re-check it after a newer artifact load.
5. Apply human feedback, then poll again with \`--agent-reply "<message>"\` to reply in the browser and keep the loop going under the same foreground-or-verified-wake-path rule.
6. ${POLL_SEND_AND_END_RULE} Deliver any remaining updates directly in this conversation.
7. Wrap up when the review is finished - see the wrap-up entry under **Commands & rules** below for the full procedure: \`npx -y atelier-axi end <html-file>\`, then \`npx -y atelier-axi stop\` once no other session is listed, plus the leftovers to check.

## Visual guidance

${bullets(home.visual_guidance)}

## Playbooks

Run \`npx -y atelier-axi playbook <id>\` for focused, detailed guidance on any of these.
${PLAYBOOK_ROUTER_HELP}
For flows, architecture, state, or sequence diagrams, do not hand-build boxes-and-arrows from div/flexbox; open the diagram playbook and use the theme-aware Mermaid snippet from \`npx -y atelier-axi design\` unless SVG is needed for richly annotated nodes.

${playbookList(home.playbooks)}

## Commands & rules

${bullets(home.help.map(skillCommandText))}
`;
}
