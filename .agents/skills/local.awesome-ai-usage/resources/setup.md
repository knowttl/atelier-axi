# Setup Workflow

> **Orchestration resource for the `awesome-ai-usage` skill.** The skill loads this file when the user asks to install or set up skills (e.g. `/awesome-ai-usage install`, "set up skills for this project", "onboard this project"). Follow it as an interactive, step-by-step workflow.
>
> **If the skill already discovered `REGISTRY_PATH` and `PROJECT_PATH`** (via its Registry Discovery step), reuse those values and skip the corresponding detection in Steps 1b/1c — do not re-clone or re-search.

## What This Does

This prompt guides you through an interactive setup process with your AI coding assistant:

1. **Environment detection** — auto-detects your AI assistant, project path, registry location, and existing installations, then confirms with you
2. **Registry discovery** — reads the skills-registry to find available skills
3. **Skill selection** — presents compatible skills grouped by source, lets you pick
4. **Installation** — runs the CLI commands to install selected skills into your project
5. **User profile AGENTS.md** — optionally installs baseline behavioral guidelines to `~/AGENTS.md` for use across all projects
6. **Project AGENTS.md** — uses the agentsmd-init skill to generate or update a project-specific `AGENTS.md`
7. **Taste setup (optional)** — optionally installs the Taste Developer opt-in prompt for adaptive preference learning
8. **Beads (issue tracking + memory)** — optionally sets up beads (`bd`) so your AI tracks features/bugs as a dependency graph and learns from past mistakes via `bd remember`
9. **OpenSrc source context (optional)** — optionally adds guidance for using `opensrc` to inspect dependency internals
10. **Summary** — confirms what was installed and provides maintenance commands

No manual CLI knowledge required — the AI detects your environment and handles everything based on your choices.

## Idempotent by Design

This setup is a **verification pass**, not a one-time install. Each step checks current state first and skips what's already done. Steps 5–9 always verify and report status (never silently skipped). If setup is interrupted, re-run the prompt — completed steps are detected and skipped cleanly. Re-run anytime to catch missing or new items.

## Sub-Agent Discipline

Your role is **orchestration, not execution.** To keep your context lean, **delegate each step's implementation to a sub-agent.** You handle only:

- Running lightweight detection commands (file existence checks, `pwd`)
- Presenting findings and prompts to the user
- Collecting user input
- Passing structured instructions to sub-agents
- Reporting final results

Each step below specifies what the sub-agent must do and what it must return. Launch sub-agents as the step dictates and wait for their results before presenting the next step to the user.

### Sub-Agent Output Format

Every sub-agent MUST return output in this structure:

```
**Step N: [step name]**
- **Success:** true/false (or a list of per-item results)
- **Added:** [what was created/installed]
- **Skipped:** [what was already present]
- **Errors:** [any failures with specific error messages, or "none"]
- **Details:** [additional context if needed]
```

This ensures the host agent can build accurate Step 10 summaries.

### Repeated Patterns

**Root instruction file resolution** (used in Steps 7b and 8b): resolve the first existing file among `AGENTS.md`, `.github/copilot-instructions.md`, `CLAUDE.md`. If none exist, create `<PROJECT_PATH>/AGENTS.md`.

**Error handling**: If a sub-agent reports failure on any operation, present the error to the user and ask whether to retry, skip that item, or abort setup. Never silently continue past a failure.

---

You are helping me set up AI coding skills and behavioral guidelines for my project. Guide me through this interactively, one step at a time. Do NOT proceed to the next step until I respond. Present each step clearly and wait for my input.

**Principle: Detect first, confirm second.** For every piece of information you need, attempt to auto-detect it from the filesystem before asking me. Present your findings and ask me to confirm or correct — do not make me manually provide information you can discover yourself.

## Context You Need

The **skills-registry** (https://github.com/knowttl/awesome-ai) is a CLI tool + content monorepo for managing reusable AI coding skills. It has a zero-dependency CLI (pure Bash + PowerShell) that installs skill files into project-local directories for multiple AI coding assistants.

You will clone this registry, read it to understand how it works, discover available skills dynamically, and guide me through installation.

**Prerequisite:** You must have the ability to run shell commands and read files to follow this prompt. If you cannot execute commands or access the filesystem, stop and tell me.

## Agent Name Reference

Map user-facing agent names to `--agent` flag values:

| When user says | Use `--agent` |
|---|---|
| Claude Code | `claude-code` |
| GitHub Copilot | `github-copilot` |
| Cursor | `cursor` |
| Cline | `cline` |
| OpenCode | `opencode` |
| Codex | `codex` |
| Windsurf | `windsurf` |
| Roo Code | `roo` |

**Shorthand**: throughout this prompt, `<CLI>` means `"<REGISTRY_PATH>/bin/skill"`.

---

## Step 1: Environment Detection

**Detect first, then confirm.** Do NOT ask me questions you can answer yourself. Run detection commands, present your findings, and ask me to confirm or correct.

### 1a: Detect the AI assistant

You already know which AI assistant you are. State it:
> "I've detected that I'm running as **[assistant name]**."

If you support multiple assistant modes or the user might use others alongside you, ask: "Are there other AI assistants you also use for this project?"

### 1b: Detect the project directory

Run `pwd` (or equivalent) to determine the current working directory. Then verify it looks like a project root:

```bash
# Check for common project root indicators
PROJECT_INDICATORS=0
for f in .git package.json Cargo.toml go.mod pyproject.toml Makefile README.md src; do
  [[ -e "$f" ]] && ((PROJECT_INDICATORS++))
done
echo "Found $PROJECT_INDICATORS project indicators in $(pwd)"
```

Present your finding:
> "Your current directory is `<path>`. This appears to be a project root (found `.git/`, `package.json`, etc.)."

If `PROJECT_INDICATORS` is 0, say: "Your current directory is `<path>`. I didn't find common project indicators. Is this still the project you want to set up?"

Ask: "Is this the project you want to set up skills for, or is it a different path?"

### 1c: Detect the skills-registry

Search for an existing skills-registry clone by checking these locations in order:

```bash
# Check common clone locations + current directory
REGISTRY_FOUND=""
for dir in ~/skills-registry ~ ~/awesome-ai /tmp/skills-registry; do
  if [[ -f "$dir/bin/skill" ]] && [[ -f "$dir/registry.json" ]]; then
    REGISTRY_FOUND="$dir"
    break
  fi
done
if [[ -z "$REGISTRY_FOUND" ]] && [[ -f "./bin/skill" ]] && [[ -f "./registry.json" ]]; then
  REGISTRY_FOUND="$PWD"
fi
if [[ -n "$REGISTRY_FOUND" ]]; then
  echo "Found: $REGISTRY_FOUND"
else
  echo "Not found"
fi
```

If the output is "Not found", proceed to the "If NOT found" branch below.
If "Found: <path>", proceed to the "If found" branch.

**If found**, confirm and delegate the refresh to a sub-agent:
> "I found the skills-registry at `<path>`."
>
> Run a sub-agent with these instructions:
>
> > Refresh the skills-registry at `<REGISTRY_PATH>`:
> > ```bash
> > cd "<REGISTRY_PATH>" && git pull && bin/skill sync
> > ```
> > "Already up to date" is NOT a failure — `bin/skill sync` MUST still run. If `git pull` fails (network error, upstream changed), report the specific error. Return success/failure and the sync output.
> If the sub-agent reports a `git pull` failure (no network, upstream changed), ask me whether to continue with the current version or abort.
>
> When successful, confirm: "Registry refreshed to latest version."

**If NOT found**, tell me and explicitly ask where to clone it. Do NOT pick a location yourself — present both options and wait for my choice:
> "I couldn't find the skills-registry locally. I'll clone it from **https://github.com/knowttl/awesome-ai**. Where would you like me to put it? Please pick one:"
> - **Option A — Persistent (recommended):** `~/skills-registry` — kept on disk, reusable across projects and sessions, easy to `bin/skill update` later.
> - **Option B — Temporary:** `/tmp/skills-registry` — wiped on reboot, fine for a one-off trial install but you will have to re-clone next time.
> - **Option C — Custom path:** tell me a path and I will clone there instead.
>
> "Which would you like (A, B, or a custom path)?"

Wait for my explicit answer before running `git clone https://github.com/knowttl/awesome-ai`. Do not assume the recommended option.

After cloning, run `bin/skill sync` in the new clone to ensure the registry index is current:
```bash
cd "<REGISTRY_PATH>" && bin/skill sync
```

### 1d: Detect existing installations

If `PROJECT_PATH` has been confirmed, immediately scan for existing skill installations:

```bash
# Check for lock file
[[ -f "<PROJECT_PATH>/.skills-lock.json" ]] && echo "Lock file found"

# Check for common agent skill directories
for dir in .claude/skills .github/skills .agents/skills .windsurf/skills .roo/skills; do
  [[ -d "<PROJECT_PATH>/$dir" ]] && ls "<PROJECT_PATH>/$dir"
done

# Check for AGENTS.md or equivalents
for f in AGENTS.md .github/copilot-instructions.md CLAUDE.md .cursorrules .windsurfrules .clinerules opencode.json; do
  [[ -f "<PROJECT_PATH>/$f" ]] && echo "Found: $f"
done
# Also check for .cursor/rules/ directory
[[ -d "<PROJECT_PATH>/.cursor/rules" ]] && echo "Found: .cursor/rules/"

# Check for beads
[[ -d "<PROJECT_PATH>/.beads" ]] && echo "Beads database found"
command -v bd >/dev/null 2>&1 && echo "bd CLI available on PATH"
```

Present a summary of findings:
> **Environment detected:**
> - Assistant: GitHub Copilot
> - Project: `/home/user/my-project` (Node.js project)
> - Registry: `~/skills-registry`
> - Installed skills: 5 items (from `.skills-lock.json`)
> - AGENTS.md: found
> - Beads: not installed
>
> "Does this look right? Anything to correct?"

Wait for my confirmation before proceeding.

Store confirmed values:
- `AGENT_NAMES` = one or more agent identifiers (user-facing names like "Roo Code", "Claude Code")
- `AGENT_FLAGS` = the corresponding `--agent` flag values (use the Agent Name Reference table to map: "Roo Code" → `roo`, "Claude Code" → `claude-code`, etc.)
- `PROJECT_PATH` = my project root
- `REGISTRY_PATH` = path to the skills-registry clone

---

## Step 2: Discover the Registry

**Delegate this entire step to a sub-agent.** Run the sub-agent with these instructions:

> You are discovering the skills-registry for setup. The user's agents are: `<AGENT_FLAGS>` (these are the exact values used in `registry.json` targets). Return a structured summary with the sections below:
>
> 1. Read `<REGISTRY_PATH>/README.md`. Summarize only the key CLI commands and project structure.
>
> 2. Parse `<REGISTRY_PATH>/bin/lib/agents.sh` and extract the `AGENT_TABLE` (format: `name|project_path|global_suffix|detection_dirs|detection_bins`). Return a table mapping each agent name to its `--agent` flag value, project install path, and global install path.
>
> 3. Read `<REGISTRY_PATH>/registry.json`. Parse every entry: name, type, description, targets, files, path.
>
> 4. Cross-reference the detected installations from Step 1d against `registry.json`. Build:
>    - `COMPATIBLE_SKILLS`: items whose `targets` includes any of the user's agent flags: `<AGENT_FLAGS>`.
>    - `ALREADY_INSTALLED`: compatible items already present (found in lock file or agent dirs).
>    - `NOT_INSTALLED`: compatible items not yet installed.
>
> 5. For every item in `NOT_INSTALLED`, read its first 40 lines from `<REGISTRY_PATH>/<item.path>/SKILL.md` (or `<REGISTRY_PATH>/<item.path>/AGENTS.md` if SKILL.md does not exist). Return a one-sentence summary of what each skill does. This enables accurate recommendations in Step 3.
>
> Return output in this structure:
>
> **AGENT TABLE:**
> [table mapping name → flag, project path, global path]
>
> **COMPATIBLE_SKILLS (N items):**
> - name | type | description | targets
>
> **ALREADY_INSTALLED (N items):**
> - name | description
>
> **NOT_INSTALLED (N items):**
> - name | description | one-sentence SKILL.md summary

When the sub-agent returns, consolidate results in your main context. If `NOT_INSTALLED` is empty, tell me: "All compatible skills are already installed. You can still update them with `bin/skill update` or add new ones as they become available."

If I ask for more detail on a specific skill, delegate a separate sub-agent to read `<REGISTRY_PATH>/<item.path>/SKILL.md` and return a summary.

---

## Step 3: Skill Selection

**CRITICAL: Only present skills that actually exist in `registry.json`. Do NOT invent, fabricate, or hallucinate skill names. Every skill name you show must be an exact `name` value from the parsed JSON.**

**If existing installations were detected in Step 2**, present the results first:

> **Already installed:** List the items found, grouped by source (obra.superpowers, mattpocock.skills, local). Mark each as ✓ installed.
>
> **Not yet installed:** List compatible items that are NOT in `ALREADY_INSTALLED`. These are what you can add.

Then ask: "Would you like to install any of the items that aren't installed yet, or are you happy with your current setup?"

If I say I'm happy, proceed to Step 5 (User Profile AGENTS.md) — continue through all remaining steps for anything not yet configured. **The Beads question in Step 8 MUST always be asked** unless both `local.beads` AND `local.beads-workflow` are already in `ALREADY_INSTALLED`. Do not silently skip the Beads question.

**If nothing is installed yet (fresh project)**, present all compatible skills:

Present the discovered skills to me in a clear, organized format. Group them logically (by tags or by name prefix like `obra.superpowers.*`, `mattpocock.skills.*`, `local.*`). For each skill show:
- Name
- Description (from registry.json)
- Compatibility with my assistant(s)

Only show skills compatible with at least one of my selected assistants. If a skill is compatible with some but not all of my assistants, note which ones.

Tell me I can select by:
- Individual names or keywords (e.g., "brainstorming, tdd") — you will match these to the full skill names from registry.json
- Group prefix (e.g., "all obra.superpowers skills")
- "all" for everything compatible
- "recommend" if I want your suggestion

When I select by shorthand or keyword, map my input to the exact full `name` values from `registry.json`. The install command requires the exact full name (e.g., `obra.superpowers.brainstorming`, not just `brainstorming`).

**If I say "recommend":** Based on what you read in the SKILL.md files, suggest a balanced starter set covering design/planning, testing, debugging, and quality verification. Prefer skills with broader assistant compatibility when possible. Explain briefly why you chose each one.

**OpenSrc recommendation rule (dependency debugging):**
- If my request/history mentions dependency internals, third-party library bugs, "how does this package work", source-level investigation, or edge-case behavior inside npm/PyPI/crates/GitHub dependencies, explicitly include `local.opensrc-source-context` in your recommendation.
- If these signals are not present, keep OpenSrc optional and ask one quick follow-up: "Do you often debug dependency internals or inspect third-party source code?" If yes, include it.

---

## Step 4: Install Skills

Based on my selections, generate the install commands. **Skip any items that are already in `ALREADY_INSTALLED`** — only install new selections.

**Determine the correct `--agent` flag values.** Use the Agent Name Reference table above to map each user-facing agent name to its `--agent` flag. Cross-reference with the `AGENT_TABLE` from Step 2 for confirmation. Build the flags as `--agent <name>` repeated for each assistant.

**Deduplication note:** `.agents/skills/` is the canonical source of truth. `github-copilot`, `cursor`, `cline`, `opencode`, and `codex` all install directly there. `claude-code` installs to `.agents/skills/` and creates a symlink `.claude/skills/<name>` → `.agents/skills/<name>`. `windsurf` and `roo` install to their own directories.

**Delegate the install execution to a sub-agent.** Run the sub-agent with these instructions:

> Install the following skills into the project. Run each command individually and report success or failure for each:
>
> ```
> <CLI> install <SKILL_NAME> --target "<PROJECT_PATH>" --agent <AGENT_1> --agent <AGENT_2> --yes
> ```
>
> (repeat for each skill in the selection list)
>
> For each skill, only include `--agent` flags for assistants that appear in that skill's `targets` array from `registry.json`.
>
> After running all commands, list the installed directories to confirm success. Return the list of what was created.

When the sub-agent returns, show me what was installed.

**After presenting, update your in-memory state:** add every successfully installed item to `ALREADY_INSTALLED`. This is critical — Steps 5–9 reference `ALREADY_INSTALLED` to decide what to ask about. If you skip this, the agent will re-ask about items just installed.

---

## Step 5: User Profile AGENTS.md (user profile only)

**This step only installs to `~/AGENTS.md` (user profile).** Baseline behavioral guidelines span across projects; they do NOT belong in a single project's AGENTS.md. Project-level AGENTS.md is handled separately in Step 6 via the agentsmd-init skill.

Ask whether the user wants a **user-level** `AGENTS.md` at `~/AGENTS.md`. This file applies baseline behavioral guidelines across all projects for this AI assistant.

### 5a) Detect existing user profile (lightweight check)

Check if `~/AGENTS.md` already exists:

```bash
[[ -f "$HOME/AGENTS.md" ]] && echo "Found: ~/AGENTS.md"
```

### 5b) Act based on state

**If `~/AGENTS.md` does NOT exist:**

> Would you like to install a user profile `AGENTS.md` at `~/AGENTS.md`? This provides baseline behavioral guidelines (think before coding, write the minimum, touch only what you must, etc.) that apply across all projects you work on with AI assistants.

If the user says **YES**:
**Delegate to a sub-agent:**

> Follow the workflow in `<REGISTRY_PATH>/skills/local.baseline-agents/SKILL.md`:
>
> 1. Read `~/AGENTS.md` (treat as empty if it does not exist).
> 2. Compare each rule section against the content of `~/AGENTS.md` using semantic equivalence.
> 3. Append only the missing rule sections to `~/AGENTS.md`. Do not duplicate existing content.
> 4. Return which sections were added, or "all rules already present — no changes made."

Confirm what was added (or that everything was already present).

**If `~/AGENTS.md` DOES exist (re-run path):**

> User profile AGENTS.md already exists at `~/AGENTS.md`. Setup complete for this step.

Lightweight check only — do not deep-compare content unless the user explicitly asks: "Would you also like me to review it against the skills-registry baseline for any missing guidelines?"

If the user says YES to review:
**Delegate to a sub-agent:**

> Review `~/AGENTS.md` against the baseline:
> 1. Read `~/AGENTS.md` and `<REGISTRY_PATH>/skills/local.baseline-agents/SKILL.md`.
> 2. Identify which baseline principles are NOT already covered (semantic equivalence, not keywords).
> 3. Present the list of missing sections to the user with a brief summary of each. Wait for user approval.
> 4. After approval, append only the missing sections to `~/AGENTS.md`.
> 5. Return which sections were added, or "all rules already present — no changes made."

If the user says **NO** to installing or reviewing the user profile: skip to Step 6.

---

## Step 6: Project AGENTS.md Setup

### 6a) Ask whether to set up a project AGENTS.md

Detect whether any instruction file already exists in `<PROJECT_PATH>` — check `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules`, `opencode.json`. Present your finding, then ask:

> Would you like to set up or update a project `AGENTS.md`? This provides AI assistants with project-specific behavioral guidelines, conventions, and commands.

If the user says **NO**: skip to Step 7.

If the user says **YES**: continue below.

### 6b) Generate using the agentsmd-init skill

Do NOT manually copy the baseline-agents file or run the workflow yourself. **Delegate this entire step to a sub-agent:**

> You are executing the agentsmd-init workflow for the project at `<PROJECT_PATH>`. Do not ask the user questions that the filesystem can answer. Return a summary of what you did and what changed.
>
> 1. Read the full agentsmd-init skill at `<REGISTRY_PATH>/skills/local.agentsmd-init/SKILL.md`.
>
> 2. Follow the skill's workflow exactly as written:
>    - **Step 1 (Check what exists):** Read any existing instruction files in `<PROJECT_PATH>` — `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`, `opencode.json`.
>    - **Step 2 (Init vs. update mode):** Branch on whether `AGENTS.md` exists — follow the audit flow for update mode or investigation flow for init mode.
>    - **Step 3 (Extract high-signal facts):** Investigate the repo following the skill's priority order. Extract only facts an agent would get wrong without help.
>    - **Step 4 (Identify gaps, update mode only):** Compare found facts against the audited file.
>    - **Step 5 (Ask questions):** Only if the repo cannot answer something important. Never ask about anything the repo already makes clear.
>    - **Step 6 (Write or merge):** Write fresh in init mode or merge audit results in update mode. Apply the filter test: "Would an agent likely miss this without help?"
>    - **Step 7 (Verify and summarize):** Final pass for correctness. Return what was added, removed, or corrected.

When the sub-agent returns, confirm the final state of `<PROJECT_PATH>/AGENTS.md` with me.

---

## Step 7: Taste Setup (Optional)

Run this step after Step 6.

Use this deterministic state model:

- `TASTE_ITEMS = ["local.taste-setup", "local.taste-developer"]`
- `HAS_TASTE_SETUP = "local.taste-setup" in ALREADY_INSTALLED`
- `HAS_TASTE_DEVELOPER = "local.taste-developer" in ALREADY_INSTALLED`
- `TASTE_FULLY_INSTALLED = HAS_TASTE_SETUP && HAS_TASTE_DEVELOPER`

### 7a) Ask whether to enable Taste setup

If `TASTE_FULLY_INSTALLED` is `false`, ask exactly once:

> Would you like to enable **Taste Developer** setup? This adds a one-time opt-in prompt that asks whether to activate adaptive preference learning — the agent observes which outputs you accept, reject, or edit over time and auto-adjusts.

- If user says **NO**: set `TASTE_ENABLED = false` and go to Step 8.
- If user says **YES**: set `TASTE_ENABLED = true` and continue.

If `TASTE_FULLY_INSTALLED` is `true`, do not ask; set `TASTE_ENABLED = true` and skip to 7c (no install needed). The managed block was created during the initial install.

### 7a1) Ask where to install Taste

When `TASTE_ENABLED = true` and `TASTE_FULLY_INSTALLED` is `false` (fresh install), ask exactly once:

> Where would you like to install Taste?
> - **Project only** — Taste learns from your feedback in this project. Skills go into `<PROJECT_PATH>`.
> - **User profile (global)** — Taste learns across all projects. Skills go into your home directory (`~/.claude/skills/`, etc.).
> - **Both** (recommended) — install in both places.

Set `TASTE_SCOPE` to `project`, `global`, or `both` based on the answer.

### 7b) Ensure taste components are installed at the chosen scope

When `TASTE_ENABLED = true`, install only missing items at the chosen scope. **Delegate to a sub-agent:**

> Install taste components into the requested scope(s). Only install items that are missing from the respective lock files:
>
> 1. **Install for project scope** (if scope includes project):
> ```bash
> <CLI> install local.taste-setup --target "<PROJECT_PATH>" --agent <AGENT_1> --agent <AGENT_2> --yes
> <CLI> install local.taste-developer --target "<PROJECT_PATH>" --agent <AGENT_1> --agent <AGENT_2> --yes
> ```
> Verify both appear in `<PROJECT_PATH>/.skills-lock.json`.
>
> 2. **Install for global scope** (if scope includes global):
> ```bash
> <CLI> install local.taste-setup --global --agent <AGENT_1> --agent <AGENT_2> --yes
> <CLI> install local.taste-developer --global --agent <AGENT_1> --agent <AGENT_2> --yes
> ```
> Verify both appear in `$HOME/.skills-lock.json`.
>
> 3. **No managed block for taste-setup.** The user already opted in during this setup session. The full `local.taste-setup/AGENTS.md` is the opt-in prompt — it has no ongoing runtime value once the user has opted in. Do NOT create a managed block in the root instruction file. If a `<!-- BEGIN: local.taste-setup -->` block already exists from a previous run, leave it in place (removing it would break determinism on re-runs).
>
> Return: which items were installed at which scope. If any install fails, report the specific command and its error.

If the sub-agent reports failure, stop and tell me.

### 7c) Explain runtime behavior clearly

When taste setup is enabled (opted in during this session), explain:
- Taste Developer is already enabled. The agent will learn preferences from accepted/rejected/edited outputs over time.
- A taste profile is maintained at `.ai/taste/taste.md`.
- If taste was installed but declined earlier, the user can enable later by saying "start taste" or "enable taste developer."
- The setup prompt (`local.taste-setup/AGENTS.md`) is NOT folded into the project's root instruction file — it has no ongoing value once opted in. The installation itself (skill files in agent directories) is sufficient for the "start taste" fallback path.

---

## Step 8: Beads — Issue Tracking & Memory (Required Checkpoint)

**This step is mandatory on every setup run.** You MUST always execute Step 8 logic, even if the user skipped installs in Step 3 or skipped project AGENTS.md work in Step 6.

Beads (`bd`) is a system-wide CLI that gives the AI a dependency-aware issue graph **and** persistent memory (`bd remember` / `bd prime`) so it learns from past mistakes. It replaces the older file-based `.ai/memory/` system.

Use this deterministic state model:

- `BEADS_ITEMS = ["local.beads", "local.beads-workflow"]`
- `HAS_BEADS_INSTRUCTION = "local.beads" in ALREADY_INSTALLED`
- `HAS_BEADS_WORKFLOW = "local.beads-workflow" in ALREADY_INSTALLED`
- `BEADS_FULLY_INSTALLED = HAS_BEADS_INSTRUCTION && HAS_BEADS_WORKFLOW`

### 8a) Decide enablement

If `BEADS_FULLY_INSTALLED` is `false`, ask exactly once:

> Would you like to set up **Beads** for this project? It gives your AI a dependency-aware issue tracker (features/bugs as a graph instead of TODO lists) plus persistent memory — it recalls prior lessons with `bd prime` before tasks and records non-obvious lessons with `bd remember` after them, so it avoids repeat failures.

- If user says **NO**: set `BEADS_ENABLED = false` and go to Step 9.
- If user says **YES**: set `BEADS_ENABLED = true` and continue.

If `BEADS_FULLY_INSTALLED` is `true`, do not ask; set `BEADS_ENABLED = true` and continue.

### 8b) Full beads setup (install items, install bd, init, memory format, git-remote sync)

When `BEADS_ENABLED = true`, **delegate all beads work to a single sub-agent:**

> Set up beads for `<PROJECT_PATH>`. Do everything below and return what was done:
>
> 1. **Install the registry items** (skip if already in `.skills-lock.json`):
> ```bash
> <CLI> install local.beads --target "<PROJECT_PATH>" --agent <AGENT_1> --agent <AGENT_2> --yes
> <CLI> install local.beads-workflow --target "<PROJECT_PATH>" --agent <AGENT_1> --agent <AGENT_2> --yes
> ```
> Verify both appear in `.skills-lock.json`. If either is missing after install, return failure.
>
> 2. **Ensure the `bd` CLI is installed.** Check `command -v bd`. If missing, ask the user before installing system-wide, then run whichever fits their environment:
> ```bash
> brew install beads                 # macOS / Linuxbrew (recommended)
> npm install -g @beads/bd           # any environment with npm
> curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash
> ```
> If the user declines a system install or none of these are available, print the commands, skip to reporting, and note that `bd` install is deferred (the registry items are still installed).
>
> 3. **Initialize beads** (idempotent — skip if `<PROJECT_PATH>/.beads/` already exists):
> ```bash
> cd "<PROJECT_PATH>" && bd init
> ```
> `bd init` creates `.beads/`, writes the beads workflow into `AGENTS.md`, and wires a Dolt `origin` remote when the git repo has one.
>
> 4. **Wire agent-specific hooks** for each installed agent:
> ```bash
> bd setup claude    # for claude-code
> bd setup codex     # for codex
> # other agents: bd init already updated AGENTS.md; no extra step
> ```
> Run `bd setup --help` first to confirm which agents have dedicated setup in the installed `bd` version.
>
> 5. **Write our Standard Memory Format into the root instruction file.** `bd init` writes a generic beads section into `AGENTS.md`, but it does NOT include our required memory format, so agents won't follow our design unless we add it. Resolve the root instruction file (first existing of `AGENTS.md`, `.github/copilot-instructions.md`, `CLAUDE.md`; else create `<PROJECT_PATH>/AGENTS.md`). If it does not already contain the marker `<!-- BEGIN: local.beads-memory-format -->`, append this managed block verbatim (idempotent — never add a second copy):
> ```markdown
> <!-- BEGIN: local.beads-memory-format -->
> ## Beads Memory Format (bd remember)
>
> Record every lesson with `bd remember` in this exact shape so memories are searchable with `bd memories <keyword>` and dedup-able by key:
>
>     bd remember "[<area>] <generalized lesson — root cause + rule/fix>. Keywords: <kw1>, <kw2>, <kw3>." --key <area>-<subject>
>
> - `[<area>]` — one of: build, test, config, deps, api, arch, tooling, env, data, perf, security, workflow (workflow = catch-all).
> - Lesson — one or two self-contained sentences that read as a reusable rule (root cause + fix). Strip transient paths, ticket numbers, and debugging noise.
> - `Keywords:` — 3–6 lowercase search terms (tool/command names, file/component names, error tokens) a future agent would type into `bd memories`.
> - `--key <area>-<subject>` — stable kebab-case slug; re-recording the same key updates the memory in place instead of duplicating.
>
> Before recording, search with `bd memories <keyword>`; if a close memory exists, reuse its `--key` to refine it rather than adding a near-duplicate. Full procedure: the `local.beads-workflow` skill (Operation 4).
> <!-- END: local.beads-memory-format -->
> ```
>
> 6. **Set up team sync over the git remote (ask the user first).** Beads can share the full Dolt database — issues *and* memories — over the project's existing git `origin` using a custom `refs/dolt/data` ref (no DoltHub or separate server). Ask: "Share beads issues & memories with your team over the git remote? (recommended)". Default to yes when `<PROJECT_PATH>` has a git `origin`. If yes:
>    - Derive a Dolt-over-git URL from the origin and register it as the Dolt remote (this writes `sync.git-remote` into `.beads/config.yaml`):
>      ```bash
>      cd "<PROJECT_PATH>"
>      ORIGIN_URL="$(git remote get-url origin)"
>      # git@github.com:org/repo.git      -> git+ssh://git@github.com/org/repo.git
>      # https://github.com/org/repo.git  -> git+https://github.com/org/repo.git
>      bd dolt remote add origin "git+ssh://git@github.com/org/repo.git"   # use the derived URL
>      ```
>    - Publish the database, verify the ref exists, and commit the config so teammates inherit it:
>      ```bash
>      bd dolt push
>      git ls-remote origin 'refs/dolt/*'    # should list refs/dolt/data
>      git add .beads/config.yaml && git commit -m "chore: configure beads dolt git sync"
>      ```
>      (Leave the `git push` of the config commit to the user's normal flow.) Do NOT commit `.beads/issues.jsonl` as a sync mechanism — it is an export only; the database syncs via `refs/dolt/data`.
>    - If the user declines team sync, skip this and note that beads stays local to their machine.
>    - Append this managed block to the root instruction file if the marker `<!-- BEGIN: local.beads-git-sync -->` is not already present (idempotent — never add a second copy):
> ```markdown
> <!-- BEGIN: local.beads-git-sync -->
> ## Beads Team Sync (Dolt over the git remote)
>
> The beads database (issues + memories) is shared over the git `origin` via a `refs/dolt/data` ref — **not** the `.beads/issues.jsonl` export, which is for viewers/interchange only.
>
> - **Before any task**, if a sync remote is configured (`bd dolt remote list` shows `origin`), run `bd dolt pull` to merge teammates' latest issues/memories. This updates the local Dolt database only — it does not touch the working tree — so it is safe to run unattended; surface any conflict/error instead of forcing it. Then run `bd prime` / `bd ready`.
> - **To share your changes**, run `bd dolt push` after recording issues/memories.
> - **On a fresh clone or new machine**, run `bd bootstrap` — it auto-detects `refs/dolt/data` on origin, clones the Dolt database, and wires the remote so push/pull work.
> - Only `.beads/config.yaml` (holding `sync.git-remote`) is tracked in git; the database lives in `refs/dolt/data` and the local Dolt engine dir is gitignored. Never hand-edit the database or export — change data only via `bd` commands.
> <!-- END: local.beads-git-sync -->
> ```
>
> 7. **Verify**: `bd ready` runs without error (an empty list on a fresh project is fine) and `bd prime` prints workflow context.
>
> Return a summary: which registry items were installed, whether `bd` was already present or newly installed (or deferred), whether `bd init` created `.beads/` or it already existed, which agent hooks were wired, whether the `local.beads-memory-format` and `local.beads-git-sync` managed blocks were added or already present, and whether git-remote team sync was configured (`refs/dolt/data` pushed) or declined.

If the sub-agent reports failure, stop and tell me.

### 8c) Explain runtime behavior clearly

When beads is enabled, explain:
- Before task work, agents run `bd dolt pull` (when a sync remote is configured) to fetch teammates' latest data, then `bd prime` and `bd ready` to recall lessons and see available issues.
- Agents track features/bugs as beads (`bd create` / `bd close`) instead of markdown TODO lists.
- Agents propose `bd remember` only after task completion, when a non-obvious lesson was learned.
- Memories follow the **Standard Memory Format** (`[<area>] … Keywords: … --key <area>-<subject>`) written into the root instruction file, so they stay searchable via `bd memories <keyword>` and dedup in place by key.
- The beads database lives under `.beads/`; do not create `.ai/memory/` or `MEMORY.md` files.
- If team sync was enabled, the Dolt database (issues + memories) syncs over the git remote via `refs/dolt/data`: `bd dolt push` to share, `bd dolt pull` to receive, `bd bootstrap` on a fresh clone. `.beads/issues.jsonl` is an export only, never the sync source.

This ensures beads behavior is loaded from the root instruction surface and cannot be silently skipped.

---

## Step 9: OpenSrc Source Context (Optional)

Run this step after Step 8.

Use this deterministic state model:

- `OPENSRC_ITEM = "local.opensrc-source-context"`
- `HAS_OPENSRC_ITEM = "local.opensrc-source-context" in ALREADY_INSTALLED`
- `HAS_OPENSRC_BIN = command -v opensrc succeeds`

### 9a) Ask whether to enable OpenSrc guidance

If `HAS_OPENSRC_ITEM` is `false`, ask exactly once:

> Would you like to enable **OpenSrc source context guidance**? This adds optional instructions for using `opensrc` to fetch and inspect dependency source code when docs and types are not enough.

- If user says **NO**: set `OPENSRC_ENABLED = false` and go to Step 10.
- If user says **YES**: set `OPENSRC_ENABLED = true` and continue.

If `HAS_OPENSRC_ITEM` is `true`, do not ask; set `OPENSRC_ENABLED = true` and continue.

### 9b) Install OpenSrc instruction item (if enabled)

When `OPENSRC_ENABLED = true`, **delegate to a sub-agent:**

> Set up OpenSrc for `<PROJECT_PATH>`:
>
> 1. Install the instruction item (skip if already in `.skills-lock.json`):
> ```bash
> <CLI> install local.opensrc-source-context --target "<PROJECT_PATH>" --agent <AGENT_1> --agent <AGENT_2> --yes
> ```
> Verify it appears in `.skills-lock.json`. If missing, return failure.
>
> 2. Check if the `opensrc` CLI is available:
> ```bash
> command -v opensrc
> ```
>
> Return whether the item was installed (or already present) and whether `opensrc` is in PATH.

If the sub-agent reports the item failed to install, stop and tell me.

If `opensrc` is not in PATH, ask me whether to install it:

```bash
npm install -g opensrc
```

- If I approve, **delegate the install to a sub-agent** and re-check `command -v opensrc`.
- If install fails, report the error and continue setup (do not fail the whole setup).
- If I decline install, continue setup and note that only guidance was installed.

### 9c) Explain runtime behavior clearly

When OpenSrc guidance is enabled, explain:
- Use `opensrc` only when dependency internals are needed.
- `opensrc path <package>` can be used inside shell substitutions for `rg`, `cat`, and `find`.
- Third-party cached source should be treated as read-only analysis context.

---

## Step 10: Summary & Next Steps

After completing all steps, provide a clear summary:

**Installed skills:** List each skill name and where it was installed (full path).

**User Profile AGENTS.md:** State whether `~/AGENTS.md` was created, merged, or skipped.

**Project AGENTS.md:** State whether `<PROJECT_PATH>/AGENTS.md` was created or updated by the agentsmd-init skill.

**Taste Setup:** State whether it was enabled or skipped. If enabled, include:
- whether both `local.taste-setup` and `local.taste-developer` are installed.

**Beads:** State whether it was enabled or skipped. If enabled, include:
- whether both `local.beads` and `local.beads-workflow` are installed,
- whether the `bd` CLI was already present, newly installed, or deferred,
- whether `bd init` created `.beads/` or it already existed,
- which agent hooks were wired (e.g. `bd setup claude`),
- whether the `local.beads-memory-format` and `local.beads-git-sync` managed blocks were added to the root instruction file,
- and whether git-remote team sync was configured (`refs/dolt/data` pushed to origin) or declined (beads stays local).

**OpenSrc Source Context:** State whether it was enabled or skipped. If enabled, include:
- whether `local.opensrc-source-context` is installed,
- whether the `opensrc` CLI is available in PATH,
- and whether CLI install was run or deferred.

**Lock file:** Explain that `.skills-lock.json` was created in `<PROJECT_PATH>` and can be committed to version control so teammates can restore the same skills with:

    <CLI> install

This reads the lock file and reinstalls everything listed in it.

**Ongoing maintenance tips:**
- View installed skills: `cat "<PROJECT_PATH>/.skills-lock.json"`
- Share with team: commit `.skills-lock.json`; teammates run `<CLI> install`
- Update skills from upstream: `cd "<REGISTRY_PATH>" && bin/skill update && bin/skill sync`
- Uninstall a skill: `<CLI> uninstall <SKILL_NAME> --target "<PROJECT_PATH>"`
- Browse more skills: `<CLI> list` or `<CLI> search <KEYWORD>`

If I used the temporary clone option, ask whether I want to keep `/tmp/skills-registry`, move it to a permanent location, or delete it. Explain that future restore/update/uninstall commands require access to a skills-registry clone, so deleting means re-cloning later.
