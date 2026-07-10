export const PLAYBOOK_ROUTER_INSTRUCTION =
  "MUST open each matching playbook before writing HTML. Match against the use_when trigger; one artifact often combines several playbooks.";

export const PLAYBOOK_ROUTER_HELP =
  "One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.";

export const PLAYBOOKS = [
  {
    id: "diagram",
    use_when: "Map relationships, flows, state, and architecture",
    choose: [
      "Use Mermaid when automatic node placement and edge routing matter more than rich card content.",
      "Use CSS grid, SVG, or positioned HTML when each item needs prose, code, controls, or detailed annotations.",
      "Use a hybrid shape for large systems: a small overview diagram followed by detailed module cards.",
    ],
    structure: [
      "Lead with the question the diagram answers, not with the implementation detail that produced it.",
      "Keep the first visual to the core relationship, then put dense evidence or file references below it.",
      "For complex systems, separate topology from detail so the overview stays readable.",
    ],
    design_rules: [
      "Use page-scoped class names and avoid generic names like .node that can collide with diagram libraries.",
      "Prefer top-down flow for multi-step diagrams unless the flow is genuinely linear and short.",
      "Quote labels that contain punctuation or code-like names, and use explicit line breaks where the renderer supports them.",
      "Initialize Mermaid to match the page theme and re-render when the theme changes: pick the Mermaid theme from the effective page appearance (light or dark) at render time, and use the theme-aware `atelier-axi design` Mermaid snippet rather than hardcoding a single theme, since Mermaid does not restyle an already-rendered SVG when the viewer toggles the page theme.",
    ],
    pitfalls: [
      "Do not cram every file or function into one diagram when a layered explanation would be clearer.",
      "Do not hand-build boxes-and-arrows from div/flexbox for a flow: it does not auto-route edges and reads worse than Mermaid; reach for Mermaid or SVG for richly annotated nodes.",
      "Do not let default diagram colors clash with the page palette or dark mode.",
      "Do not present unverified architecture claims as facts. Cite the files or commands that support them.",
    ],
    atelier_notes: [
      "A Atelier diagram should invite precise annotation: make modules, edges, and captions easy to click and discuss.",
      "When a relationship is uncertain, label it as a question so the user can resolve it in the review loop.",
    ],
  },
  {
    id: "table",
    use_when: "Turn dense records into scan-friendly review surfaces",
    choose: [
      "Use a table when rows share the same fields and the user needs to compare evidence quickly.",
      "Use cards when each record has a different shape or needs a long explanation.",
      "Use summaries above the table when counts, risk levels, or statuses change how the table should be read.",
    ],
    structure: [
      "Start with a short summary of what the rows prove or require.",
      "Group columns by the decision they support: identity, evidence, status, action.",
      "Keep raw details available, but make the primary status visible without reading every cell.",
    ],
    design_rules: [
      "Use semantic table markup when the data is tabular.",
      "Protect long paths, code symbols, URLs, and prose from overflowing on narrow screens.",
      "Use restrained color for status and severity so the table remains readable when printed or skimmed.",
    ],
    pitfalls: [
      "Do not paste a terminal table into HTML and call it done.",
      "Do not hide the important conclusion below a large undifferentiated grid.",
      "Do not use color as the only status signal.",
    ],
    atelier_notes: [
      "A Atelier table should make individual rows easy annotation targets.",
      "If a row implies a follow-up change, include an action control that queues a specific prompt.",
    ],
  },
  {
    id: "comparison",
    use_when: "Show options, tradeoffs, and current vs target behavior",
    choose: [
      "Use before and after when the same system is changing over time.",
      "Use option cards when the user needs to choose between mutually exclusive directions.",
      "Use a scorecard only when the criteria are explicit and comparable.",
    ],
    structure: [
      "Name the decision at the top of the artifact.",
      "Show the concrete behavior or artifact shape for each side, not just abstract pros and cons.",
      "End with a recommendation only when the evidence actually supports one.",
    ],
    design_rules: [
      "Keep corresponding details aligned so differences are visible without hunting.",
      "Use visual hierarchy to separate primary tradeoffs from secondary notes.",
      "Make the cost of each option as visible as the benefit.",
    ],
    pitfalls: [
      "Do not make every option look equally recommended if one is clearly preferred.",
      "Do not compare vague summaries when concrete examples are available.",
      "Do not bury assumptions that would change the recommendation.",
    ],
    atelier_notes: [
      "A Atelier comparison should let the user annotate the exact option or tradeoff they want changed.",
      "If the goal is selection, provide controls that queue the chosen option with rationale.",
    ],
  },
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
      "Open with a light framing, then surface the clarifying questions - purpose, constraints, success criteria, and scope - as input cards in the review surface so the user answers them all at once, instead of interrogating in text before anything visual exists.",
      "If the request spans multiple independent subsystems, decompose it into sub-projects first and plan the first one; do not plan an oversized scope as a single unit.",
      "Before writing any spec, surface EXHAUSTIVELY every open question, edge case, and design option as its own accept/defer decision card, and once the intake questions are answered propose 2-3 candidate approaches with tradeoffs and a clear recommendation for the user to choose.",
      "Converge on an explicitly approved direction first - do not write the spec or plan until the user approves, however simple the change looks - then write the spec and a bite-sized E2E-verification implementation plan derived from it.",
      "Structure the plan as bite-sized E2E-verification tasks - implement the change, then run the real product end-to-end the way a user would and confirm the observed behavior matches what the user expects, commit - with exact file paths and complete code in every step.",
      "Map the files each task creates or modifies before decomposing, and end the plan self-contained enough that another developer, or a fresh agent session with no planning context, can implement it without asking a follow-up question.",
      "Write the durable spec and plan under docs/atelier/<YYYY-MM-DD>-<type>-<topic>/ relative to the target project root (spec.md + plan.md on the large route, plan.md only on the small route) - never leave them in .atelier/ or scattered elsewhere.",
    ],
    design_rules: [
      "Verify each claim against the codebase before presenting it as fact.",
      `Render each open question, edge case, and design option as a self-contained decision card: a plain-English problem statement, a highlighted recommendation, and a short concrete example, plus Accept/Defer controls that queue exactly one prompt for the decision. Restyle the card to the subject project's design system (or DaisyUI via \`atelier-axi design\`). Reusable template:
\`\`\`html
<!-- Decision card: ONE open question / edge case / option. Give each card a UNIQUE data-atelier-question (a kebab slug of its question); cards sharing a key overwrite each other's queued prompt. Restyle to the subject project's design system. -->
<form class="decision-card" data-atelier-question="theme-scope"
      onsubmit="event.preventDefault();
        const f = new FormData(event.currentTarget);
        const decision = f.get('decision');            // 'accept' | 'defer'
        const note = (f.get('note') || '').toString().trim();
        if (!decision) return;
        window.atelier.queuePrompt(
          'Decision [Theme scope]: ' + decision + (note ? ' - ' + note : ''),
          { tag: 'decision', text: 'Theme scope: ' + decision, element: event.currentTarget,
            data: { question: 'theme-scope', decision, note } });">
  <h3 class="decision-card__title">Should the toggle persist per-device or per-account?</h3>
  <p class="decision-card__problem">Users on multiple devices may expect the theme to follow them, but per-account persistence needs a settings API we do not have yet.</p>
  <p class="decision-card__reco"><strong>Recommendation:</strong> Start per-device (localStorage) - it ships without a backend change and covers the common single-device case.</p>
  <pre class="decision-card__example" style="overflow-x:auto"><code>localStorage.setItem('theme', 'dark')  // per-device, no API</code></pre>
  <fieldset class="decision-card__controls">
    <label><input type="radio" name="decision" value="accept"> Accept recommendation</label>
    <label><input type="radio" name="decision" value="defer"> Defer (needs a product call)</label>
    <input type="text" name="note" placeholder="Optional note or counter-proposal">
    <button type="submit">Queue this decision</button>
  </fieldset>
</form>
\`\`\``,
      "Keep each decision card overflow-safe: give the example pre block overflow-x: auto and, when the controls sit in a flex row, min-width: 0 on the flex children, so a long note field or option label cannot force horizontal page overflow (the in-browser layout audit flags it otherwise).",
      "When the feature is UI-facing, add a sample UI mockup alongside the relevant decision cards and render it in the SUBJECT project's design system (its Tailwind/theme config, CSS tokens, component library, or existing styled pages), following the design-source priority. When the feature is NOT UI-facing, show questions, edge cases, and decision cards only - no mockups.",
      "Write the plan and spec for an engineer with zero context for the codebase and questionable taste: exact file paths, complete code in every step, and exact commands with their expected output - never 'TBD', 'add error handling', or 'similar to Task N'. Size each task as the smallest unit that carries its own test cycle and is worth a fresh reviewer's gate.",
      "The plan and spec must be self-contained enough that another developer can read them and fully implement the proposal without the planning conversation.",
    ],
    pitfalls: [
      "Do not write the spec before the review surface is confirmed - surface and converge on the open questions and edge cases first.",
      "Do not leave open questions unresolved and unlabeled: every card must end accepted or explicitly deferred, and deferred questions must be captured (as decision records) rather than dropped.",
      "Do not leave placeholders in the plan. 'TBD', 'add error handling', or 'similar to Task N' are plan failures - every task carries exact file paths and complete code.",
      "Do not present a single foregone approach or start writing the spec or plan before the user approves a direction. Offer 2-3 candidate approaches with a recommendation and converge on an approved one first.",
      "Do not reuse one data-atelier-question across cards. Give every decision card a UNIQUE data-atelier-question (a kebab slug of its question); two cards that share the key silently overwrite each other's queued prompt in the browser, so an earlier decision is lost with no error.",
      "Do not leave resolved open questions in the artifact. Update the content to reflect the decision and remove the question.",
    ],
    atelier_notes: [
      "Make each question, edge case, and option an individual annotation target with its own Accept/Defer control, so the user resolves them one at a time in the review loop.",
      "Build the accept/defer and option-selection controls with the 'input' playbook pattern (native controls, one per-question submit that queues a single final prompt); use 'comparison' for option cards with tradeoffs and 'diagram' (Mermaid) for flows, architecture, state, or sequence views.",
      "A deferred card should queue a prompt clear enough to become a standalone decision to resolve before implementation.",
      "Surface the intake questions as input cards answered all at once, then reuse the same artifact across rounds to propose 2-3 approaches with a recommendation and to resolve the open decisions.",
    ],
  },
  {
    id: "code",
    use_when: "Render source code, code files, patches, PR diffs, and before/after code inside Atelier artifacts",
    choose: [
      "Use this whenever an artifact shows source code: a snippet, full file, patch, PR diff, local change set, or before/after code.",
      "Use File for one code file, FileDiff for old/new versions or parsed patch metadata, and CodeView only when several files or diffs need coordinated navigation.",
      "Choose split layout for careful side-by-side review when width allows; choose unified layout when space is tight, changes are mostly additive, or mobile readability matters.",
    ],
    structure: [
      "Place the path, language, and reason to inspect the code immediately before each rendered file or diff.",
      "Keep evidence close to each claim with file paths, line references, or annotations next to the relevant code.",
      "For multi-file changes, group files by user-facing area or task instead of dumping a raw patch in repository order.",
    ],
    design_rules: [
      `Rendering MUST use @pierre/diffs, not hand-rolled <pre> blocks or another diff library. This verified no-build standalone HTML snippet renders one file and one split diff from esm.sh:
\`\`\`html
<div id="file"></div>
<div id="diff"></div>
<script type="module">
  import { File, FileDiff } from "https://esm.sh/@pierre/diffs@1.2.10?bundle";

  const theme = { light: "github-light", dark: "github-dark" };
  const options = { theme, themeType: "dark", overflow: "wrap" };
  const oldFile = {
    name: "src/greeting.ts",
    contents: "export function greet(name: string) {\\n  return \\"Hello \\" + name;\\n}\\n\\nconsole.log(greet(\\"Atelier\\"));\\n",
  };
  const newFile = {
    name: "src/greeting.ts",
    contents: "export function greet(name: string) {\\n  return \\"Hello, \\" + name + \\"!\\";\\n}\\n\\nconsole.log(greet(\\"Atelier\\"));\\n",
  };

  new File(options).render({
    containerWrapper: document.querySelector("#file"),
    file: newFile,
  });

  new FileDiff({ ...options, diffStyle: "split" }).render({
    containerWrapper: document.querySelector("#diff"),
    oldFile,
    newFile,
  });

</script>
\`\`\``,
      "Pick a Shiki theme pair that matches the artifact's DaisyUI or Tailwind direction and light or dark mode; replace the GitHub pair above when the page is not GitHub-like.",
      'Use FileDiff diffStyle: "split" for side-by-side review and diffStyle: "unified" for stacked reading; keep overflow: "wrap" unless horizontal alignment is essential.',
      "Use @pierre/diffs line annotations, selections, and headers when calling out specific lines so notes stay attached to code.",
    ],
    pitfalls: [
      "Do not render code as static screenshots, plain <pre> blocks, or markdown pasted into HTML.",
      "Do not choose an arbitrary default Shiki theme that clashes with the page palette or dark mode.",
      "Do not show huge unrelated files when a focused render range, parsed patch file, or grouped summary would be clearer.",
      "Do not separate a claim from the code lines that prove it.",
    ],
    atelier_notes: [
      "A Atelier code artifact should make each file, hunk, and relevant line easy to annotate precisely.",
      "When a user action should trigger a fix, queue prompts that name the file path, line range, and desired change.",
      "If the artifact combines code with a plan, table, or comparison, read those playbooks too and keep @pierre/diffs responsible for the code surface.",
    ],
  },
  {
    id: "input",
    use_when:
      "Must be used when the agent needs to collect user input on decisions, choices, preferences, triage, scope, or other structured feedback from within the artifact",
    choose: [
      "Use this when the user needs to select, tune, triage, annotate, or edit a structured choice.",
      "Use controls for decisions the user can make faster visually than by writing a prompt.",
      "Use plain annotations when the artifact only needs open-ended feedback.",
    ],
    structure: [
      "Make each decision surface visible: what is being chosen, what the options mean, and what happens next.",
      "Keep reversible selection state local in the artifact until the user explicitly submits that question.",
      "Pair each question with a Submit or Queue answer control that sends exactly one prompt for the final answer.",
      "Show selected state separately from queued state so the user trusts what will be sent back.",
      "Track three states per decision - selected, queued, and sent - and flip a decision to a completed 'sent' state only after the agent confirms delivery, never merely when it is queued.",
    ],
    design_rules: [
      "Native controls - radios, checkboxes, text inputs, selects, textareas, buttons, options, labels, disclosure summaries, and contenteditable regions - are interactive automatically: clicks toggle, focus, and type instead of annotating, so they do not need data-atelier-action. Build choice and option UIs from these whenever you can.",
      "For reversible choices, do not call window.atelier.queuePrompt() from radio change handlers or option click handlers. Those handlers should only update local selected state.",
      "Use a per-question form submit or explicit Queue answer button to read the current values and call window.atelier.queuePrompt() exactly once for the final answer.",
      "Put data-atelier-action only on custom (non-native) elements that should act like a feedback control - typically a styled div or span you made clickable - so Atelier does not annotate it and shows a pointer cursor instead.",
      "Use data-atelier-question on a question wrapper or pass queueKey when multiple pre-send updates should replace the prior unsent answer for the same question.",
      "Pass options such as tag, text, selector, target, data, queueKey, or element when they help the agent understand exactly what the user chose.",
      "Call window.atelier.sendQueuedPrompts() only when the control should immediately send committed feedback instead of waiting for the user to press Send to Agent.",
      'For a multi-question form, end it with ONE batch control - `<button type="button" data-atelier-action onclick="window.atelier.queueAll()">Queue all answers</button>` - so the user answers every card and queues them in a single click instead of pressing each card\'s own Queue button; keep the per-question submit handlers, since queueAll() triggers each one (unanswered/guarded questions simply skip). Use window.atelier.queueAll({ send: true }) for a \'Queue all & send\' one-click.',
      "Make queued prompts specific enough that the agent can act without asking a follow-up question.",
      "Reflect delivered answers: after any successful send (the artifact's own send control or the chrome's Send to Agent button), the SDK marks each answered question's origin element with a data-atelier-sent attribute and fires a bubbling atelier:sent CustomEvent on it, plus a window-level atelier:sent carrying the whole batch as detail.prompts of { uid, queueKey, tag }. Style [data-atelier-sent] (or a parent via :has([data-atelier-sent])) to show a clear completed state and lock that control so the decision reads as done.",
      "For the sent mark to target the right card, pass the question element as queuePrompt's options.element (the form or card wrapper) and give each question a stable identity - an explicit queueKey or data-atelier-question - so batched and re-sent answers map back to their card.",
      "Handle batched sends: the user may answer and send some decisions now and the rest later, so flip only the decisions in each atelier:sent batch and leave the others pending; re-queuing a changed answer clears its sent mark until it is delivered again.",
      "Keep native browser controls accessible and readable on mobile.",
    ],
    pitfalls: [
      "Do not queue one prompt per radio change, checkbox toggle, dropdown change, or choice-button click when the user can still change their mind.",
      "Do not create controls whose queued prompt is unclear or too vague to execute.",
      "Do not hide the difference between selected locally and queued for the agent.",
      "Do not mark a decision completed the moment it is queued - it is only truly done once the atelier:sent confirmation arrives, and the user may still edit it or send the rest in a later batch.",
      "Do not require interaction for content the user only needs to read.",
    ],
    atelier_notes: [
      "Atelier is strongest when the artifact becomes a focused review surface and not just a static page.",
      'A native single-choice question should submit the final value: `<form data-atelier-question="plan" onsubmit="event.preventDefault(); const choice = new FormData(event.currentTarget).get(\'plan\'); if (choice) window.atelier.queuePrompt(\'Use the \' + choice + \' plan\', { tag: \'choice\', text: \'Plan: \' + choice, element: event.currentTarget, data: { question: \'plan\', answer: choice } });"><label><input type="radio" name="plan" value="Starter"> Starter</label><label><input type="radio" name="plan" value="Pro"> Pro</label><button type="submit">Queue this answer</button></form>`.',
      "A custom choice UI should make option buttons update local state, then use a separate Queue answer button with data-atelier-action to queue the final selected value. To include it in a queueAll() batch, also queue that final value when the card receives an `atelier:submit` event (queueAll dispatches `atelier:submit` on every non-form [data-atelier-question] element).",
      "Use window.atelier.queuePrompt for user intent, not internal analytics or UI-only state changes.",
      'To show completed decisions, style the sent state in CSS - e.g. `[data-atelier-sent] { opacity: .6 } [data-atelier-sent] button { pointer-events: none }` and a `[data-atelier-sent] .status::after { content: " - Sent" }` badge - and/or listen once with `window.addEventListener("atelier:sent", (e) => { for (const p of e.detail.prompts) markDone(p.queueKey); })`; for a single card the bubbling atelier:sent event (event.target is the answered question element) is the simplest hook.',
      "End input paths with an obvious way for the user to send feedback back to the agent.",
    ],
  },
  {
    id: "slides",
    use_when: "Create a deliberate presentation when slides are requested",
    choose: [
      "Use slides only when the user asks for a deck, presentation, talk, or paced walkthrough.",
      "Use a scroll page when the user needs reference material, detailed review, or dense evidence.",
      "Use one idea per slide when the artifact has a narrative arc.",
    ],
    structure: [
      "Plan the story before writing the slide markup.",
      "Open with the point, build context, show evidence, and close with the decision or next action.",
      "Vary slide composition so the deck does not feel like repeated cards.",
    ],
    design_rules: [
      "Keep slide text sparse and let visuals carry the explanation.",
      "Use large type, strong alignment, and deliberate whitespace rather than dense paragraphs.",
      "Make navigation and screen-size assumptions explicit in the artifact.",
    ],
    pitfalls: [
      "Do not turn every explainer into slides by default.",
      "Do not paste a scroll-page outline into fixed-size frames without rewriting the narrative.",
      "Do not make consecutive slides with the same spatial composition unless repetition is the point.",
    ],
    atelier_notes: [
      "A Atelier slide deck can still collect feedback, but each prompt should refer to a slide or decision.",
      "Use slides for persuasion or presentation, not for dense code review.",
    ],
  },
];

export function listPlaybooks() {
  return PLAYBOOKS.map(({ id, use_when }) => ({ id, use_when }));
}

export function findPlaybook(id) {
  return PLAYBOOKS.find((playbook) => playbook.id === id) || null;
}

export function playbookIds() {
  return PLAYBOOKS.map((playbook) => playbook.id);
}
