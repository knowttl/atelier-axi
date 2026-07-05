# Uninstall Workflow

> **Orchestration resource for the `awesome-ai-usage` skill.** The skill loads this file when the user asks to uninstall or remove skills in bulk (e.g. `/awesome-ai-usage uninstall`, "remove my skills", "uninstall everything"). Follow it as an interactive, step-by-step workflow.
>
> **If the skill already discovered `REGISTRY_PATH` and `PROJECT_PATH`** (via its Registry Discovery step), reuse those values and skip the questions in Step 1 that they answer.

## What This Does

This prompt guides you through an interactive uninstall process with your AI coding assistant:

1. **Environment check** — identifies your AI assistant(s), project path, and registry location
2. **Inventory scan** — reads the lock file and scans installed directories to show what's currently installed
3. **Selection** — lets you choose what to remove (individual items, groups, or everything)
4. **Confirmation** — shows exactly what will be deleted and asks for your approval before acting
5. **Uninstall** — removes the selected items and updates the lock file
6. **Cleanup** — optionally removes empty directories and orphaned configuration

No manual CLI knowledge required — the AI handles everything based on your choices.

---

You are helping me uninstall AI coding skills from my project. Guide me through this interactively, one step at a time. Do NOT proceed to the next step until I respond. Present each step clearly and wait for my input.

## Context You Need

The **skills-registry** (https://github.com/knowttl/awesome-ai) is a CLI tool + content monorepo for managing reusable AI coding skills. It has a zero-dependency CLI (pure Bash + PowerShell) that installs skill files into project-local directories for multiple AI coding assistants.

The uninstall command removes installed skill/instruction directories and updates the `.skills-lock.json` file. You will need access to both the registry CLI and my project to perform the uninstall.

**Prerequisite:** You must have the ability to run shell commands and read files to follow this prompt. If you cannot execute commands or access the filesystem, stop and tell me.

---

## Step 1: Environment Check

Ask me these questions (present them as a numbered list and wait for my answers):

1. What is the absolute path to my project's root directory?
2. Where is the skills-registry cloned? (The directory containing `bin/skill`)
3. Which AI coding assistant(s) am I using? (Common options: Claude Code, GitHub Copilot, Cursor, Cline, OpenCode, Codex, Windsurf, Roo Code)

Store my answers as variables for later steps:
- `PROJECT_PATH` = my project root
- `REGISTRY_PATH` = path to the skills-registry clone
- `AGENT_NAMES` = one or more agent identifiers

---

## Step 2: Inventory Scan

Once you have my answers, scan what's currently installed:

1. **Read the lock file** at `<PROJECT_PATH>/.skills-lock.json`. If it exists, parse it to get the list of installed items with their names, types, versions, and target agents.

2. **Read the agent path registry** at `<REGISTRY_PATH>/bin/lib/agents.sh`. Parse the `AGENT_TABLE` to determine the install directories for my selected assistants. The format is: `name|project_path|global_suffix|detection_dirs|detection_bins`.

   **Important name mapping:** If the user said "Roo Code", the `--agent` value is `roo` (not `roo-code`). For all other agents, user-facing names map directly to the `name` field.

3. **Scan the agent skill directories** for each of my assistants. List existing subdirectories under `<PROJECT_PATH>/<project_path>/` (e.g., `.claude/skills/`, `.github/skills/`, `.agents/skills/`). Each subdirectory is an installed item.

4. **Cross-reference** the lock file entries against the on-disk directories. Identify:
   - Items in both the lock file AND on disk (normal state)
   - Items in the lock file but NOT on disk (orphaned lock entries)
   - Items on disk but NOT in the lock file (manually installed or lock file was deleted)

5. **Check for a beads database** — note if `.beads/` exists (the beads issue graph + memories). Do not attempt to count entries; just note its presence.

6. **Present the inventory** in a clear table:

   > **Currently Installed:**
   >
   > | # | Item | Type | Agents | Status |
   > |---|------|------|--------|--------|
   > | 1 | obra.superpowers.brainstorming | skill | claude-code, cursor | ✓ installed |
   > | 2 | local.beads | instruction | claude-code, cursor | ✓ installed |
   > | ... | ... | ... | ... | ... |
   >
   > **Beads database:** `.beads/` exists (issue graph + `bd remember` memories).

   If nothing is installed, tell me: "No skills or instructions are currently installed in this project." and stop.

---

## Step 3: Selection

Ask me what I want to uninstall. Present these options:

- **By number** — e.g., "1, 3, 5" (from the table above)
- **By name or keyword** — e.g., "brainstorming, debugging" (you will match to full names)
- **By group** — e.g., "all obra.superpowers", "all mattpocock.skills", "all local"
- **"all"** — remove everything
- **"beads"** — remove the beads integration (both items + optionally the `.beads/` database)

When I select by shorthand or keyword, map my input to the exact installed item names.

**If I select beads removal**, also ask:
> "Do you also want to delete the `.beads/` database? This permanently destroys the issue graph and all `bd remember` memories and cannot be undone. (yes/no)"

Only include database deletion if I explicitly confirm. Note: the system-wide `bd` CLI is left installed — removing it (e.g. `brew uninstall beads`) is left to me.

---

## Step 4: Confirmation

Before executing anything, show me exactly what will happen:

> **The following will be removed:**
>
> | Item | Directories to delete |
> |------|-----------------------|
> | obra.superpowers.brainstorming | `.claude/skills/obra.superpowers.brainstorming/`, `.agents/skills/obra.superpowers.brainstorming/` |
> | ... | ... |
>
> **Lock file:** `.skills-lock.json` will be updated to remove these entries.
>
> *(Optional)* **Beads database:** `.beads/` and all issues + `bd remember` memories will be permanently deleted.
>
> **This action cannot be undone.** Proceed? (yes/no)

**Do NOT execute any removal commands until I explicitly confirm.** If I say no, ask if I want to modify my selection or cancel entirely.

---

## Step 5: Uninstall

After I confirm, execute the uninstall commands:

```bash
"<REGISTRY_PATH>/bin/skill" uninstall <ITEM_NAME> --target "<PROJECT_PATH>" --yes
```

Run one command per item. The `--yes` flag auto-confirms the CLI's own prompts (the user already confirmed in Step 4).

**If I also confirmed database deletion:**

```bash
rm -rf "<PROJECT_PATH>/.beads"
```

**After each command**, report success or failure. At the end, show a summary:

> **Uninstall complete:**
> - Removed: item1, item2, item3
> - Lock file updated: `.skills-lock.json`
> - *(if applicable)* Beads database deleted

---

## Step 6: Cleanup (Optional)

After uninstalling, check for and offer to clean up:

1. **Empty skill directories** — if all items for an agent were removed, the parent directory (e.g., `.claude/skills/`, `.agents/skills/`) may be empty. Offer to remove it.

2. **Orphaned lock file** — if all items were uninstalled and `.skills-lock.json` now has an empty `installed` object, offer to delete the lock file entirely.

3. **AGENTS.md relevance** — if the `local.beads` instruction was removed but `AGENTS.md` still references beads behavior, note this:
   > "Your AGENTS.md may still contain a beads workflow section (added by `local.beads` or `bd init`). Would you like me to review it and remove those sections?"

For each cleanup action, ask for confirmation before executing.

**Final message:**

> Uninstall complete. To reinstall any of these skills later, use:
> ```bash
> "<REGISTRY_PATH>/bin/skill" install <SKILL_NAME> --target "<PROJECT_PATH>"
> ```
> Or run the setup prompt again for a guided experience.
