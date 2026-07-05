---
name: awesome-ai-usage
description: >
  Orchestration skill for the awesome-ai skills-registry (a zero-dependency
  CLI). Use when the user wants to install/set up, uninstall/remove, update,
  list, search, or sync skills; browse available skills; restore teammate
  setups from the lock file; install profile bundles; or run the guided
  onboarding, removal, or update/health-check workflows. Also use when the
  user says things like "/awesome-ai-usage install", "/awesome-ai-usage
  uninstall", "/awesome-ai-usage update", "set up skills for this project",
  "onboard this project", "what skills are available?", "add the brainstorming
  skill", "remove context-sync", "update my skills", "check my skills setup is
  healthy", or "how do I share my skill setup with my team?".
---

# Awesome-AI Skills-Registry Orchestration

You are an AI assistant working in a project where the **awesome-ai** skills-registry has been onboarded. This is the **main orchestration skill** for that registry: it teaches you how to onboard a project, install/uninstall items, update from upstream, and share setups with teammates.

## Intent Dispatch (read this first)

This skill handles three guided, multi-step workflows plus everyday management commands. **Decide which one the request is before doing anything else:**

| The user's request | What to do |
|---|---|
| `/awesome-ai-usage install`, "set up skills", "onboard this project", "guide me through installing", first-time setup | Load and follow **`resources/setup.md`** — the full guided onboarding workflow. |
| `/awesome-ai-usage uninstall`, "remove my skills", "uninstall everything", "guide me through removing" | Load and follow **`resources/uninstall.md`** — the guided removal workflow. |
| `/awesome-ai-usage update`, "update my skills", "update all my skills", "check for skill updates", "is my skills setup healthy?", "health check" | Load and follow **`resources/update.md`** — updates every item installed from this registry and runs a health check. |
| A single concrete action ("add the brainstorming skill", "remove context-sync", "list skills", "search debugging", "re-install just X") | Stay in this file — use the [CLI Command Reference](#cli-command-reference) below. Do **not** run a full guided workflow for a single-item action. |

The `resources/*.md` files live next to this `SKILL.md`. Read the relevant one in full and execute it step by step; each references the same `REGISTRY_PATH`/`PROJECT_PATH` variables established below, so run **Registry Discovery** first and pass those values in (the workflows will skip their own detection when you provide them).

When the intent is ambiguous — e.g. the user just types `/awesome-ai-usage` with no argument — briefly ask whether they want to **install/set up**, **uninstall**, **update / health-check**, or do a specific management task, then dispatch accordingly.

The rest of this skill covers registry discovery and the individual management commands used by both the workflows above and by one-off requests.

## Key Variables

Two variables are used throughout this skill. Set them before running any commands:

- **`PROJECT`** — the target project root directory (where `.skills-lock.json` lives). Default to the current working directory (`pwd`), but confirm with the user if they mention a different project path.
- **`REGISTRY_PATH`** — the directory containing the awesome-ai clone (where `bin/skill` and `registry.json` live). Discover it using the steps below.

## Registry Discovery

Before running any commands, locate the registry clone. Run this snippet:

```bash
# Search user profile locations, common clone dirs, and the current project tree
REGISTRY_PATH=""
for dir in \
  "$HOME/awesome-ai" \
  "$HOME/skills-registry" \
  "$HOME/Projects/awesome-ai" \
  "$HOME/.local/share/awesome-ai"; do
  if [ -f "$dir/bin/skill" ] && [ -f "$dir/registry.json" ]; then
    REGISTRY_PATH="$dir"
    break
  fi
done
# Also check cwd (registry may be the project itself)
if [ -z "$REGISTRY_PATH" ] && [ -f "$PWD/bin/skill" ] && [ -f "$PWD/registry.json" ]; then
  REGISTRY_PATH="$PWD"
fi
# Fallback: walk up from cwd
if [ -z "$REGISTRY_PATH" ]; then
  d="$PWD"
  while [ "$d" != "/" ]; do
    if [ -f "$d/bin/skill" ] && [ -f "$d/registry.json" ]; then
      REGISTRY_PATH="$d"
      break
    fi
    d="$(dirname "$d")"
  done
fi
echo "${REGISTRY_PATH:-NOT FOUND}"
```

If the output is `NOT FOUND`, tell the user you can't find the registry and ask where it's cloned. The CLI is a single bash script — no installation step is needed beyond cloning the repo.

**Once found, bring the registry up to date:**

```bash
# Pull latest commits and regenerate the index
cd "$REGISTRY_PATH" && git pull && bin/skill sync
```

`git pull` is safe — it only changes files in the registry clone, never in the user's project. If the pull fails (no network, upstream changed), tell the user what happened and ask whether to continue with the current state. "Already up to date" is not a failure — `bin/skill sync` must still run.

After this, all commands in this skill use `$REGISTRY_PATH/bin/skill` as the CLI entry point. (On Windows, use `$REGISTRY_PATH/bin/skill.ps1`.)

## Core Principle: The CLI Is Zero-Dependency

The CLI is pure Bash (with a PowerShell counterpart on Windows). It uses `awk` and `sed` internally — never introduce `jq`, `yq`, `node`, `python`, or any other external dependency. The CLI's own parsing functions (`yaml_read_field`, `yaml_read_list`, etc.) handle everything.

## Quick Health Check

When entering a project, quickly assess its skills state:

```bash
# Does the lock file exist?
ls "$PROJECT/.skills-lock.json" 2>/dev/null

# What agent directories have content?
for dir in .claude/skills .github/skills .agents/skills .windsurf/skills .roo/skills; do
  [ -d "$PROJECT/$dir" ] && echo "$dir: $(ls "$PROJECT/$dir" 2>/dev/null | tr '\n' ' ')"
done
```

This tells you what's installed without reading the full lock file. Use it when the user asks "what skills do I have?" or you need context about the project's setup.

## Project Files Setup

Every project should have an `AGENTS.md` file as the canonical source of project-level AI instructions. Some tools read from different filenames — create symlinks so they all consume the same content.

```bash
# Ensure AGENTS.md exists (create an empty one as a starting point)
if [ ! -f "$PROJECT/AGENTS.md" ]; then
  echo "# $(basename "$PROJECT")" > "$PROJECT/AGENTS.md"
  echo "Created AGENTS.md for this project."
fi

# Create symlinks for tools that use different filenames
# Claude Code looks for CLAUDE.md
if [ ! -e "$PROJECT/CLAUDE.md" ]; then
  ln -s AGENTS.md "$PROJECT/CLAUDE.md"
  echo "Linked CLAUDE.md -> AGENTS.md"
fi

# Cursor looks for .cursorrules
if [ ! -e "$PROJECT/.cursorrules" ]; then
  ln -s AGENTS.md "$PROJECT/.cursorrules"
  echo "Linked .cursorrules -> AGENTS.md"
fi
```

**Always do this when onboarding a new project.** Check for existing files first — if `CLAUDE.md` or `.cursorrules` already exist as regular files (not symlinks), don't overwrite without asking. Offer to consolidate their content into `AGENTS.md` and then replace them with symlinks.

## CLI Command Reference

### `list` — Browse Available Items

```bash
$REGISTRY_PATH/bin/skill list                     # all items
$REGISTRY_PATH/bin/skill list --type skill         # skills only
$REGISTRY_PATH/bin/skill list --type instruction   # instructions only
$REGISTRY_PATH/bin/skill list --tag debugging      # filter by tag
$REGISTRY_PATH/bin/skill list --for claude-code    # items for a specific agent
```

Output is a table: NAME, TYPE, VERSION, DESCRIPTION. Use this when the user wants to browse what's available.

### `search` — Find Items by Keyword

```bash
$REGISTRY_PATH/bin/skill search brainstorming
$REGISTRY_PATH/bin/skill search debugging --type skill
$REGISTRY_PATH/bin/skill search review --for opencode
```

Case-insensitive search across name, description, and tags. Accepts `--type` and `--for` filters. Use when the user says "find me a skill for X" or "is there something about Y?"

### `info` — Show Details for One Item

```bash
$REGISTRY_PATH/bin/skill info obra.superpowers.brainstorming
```

Displays: name, type, version, description, path, tags, targets, files, dependencies. Use before installing to confirm the item is right, or when the user wants to know more about a specific skill.

### `install` — Install Items Into the Project

The most important command. Multiple invocation modes:

```bash
# From local registry (most common)
$REGISTRY_PATH/bin/skill install <full-item-name> --target "$PROJECT" --agent <agent> --yes

# From GitHub shorthand
$REGISTRY_PATH/bin/skill install <owner/repo> --skill <name> --target "$PROJECT" --agent <agent> --yes

# From any Git URL
$REGISTRY_PATH/bin/skill install <url> --skill <name> --target "$PROJECT" --agent <agent> --yes

# Profile (bundle of skills)
$REGISTRY_PATH/bin/skill install --profile <name> --target "$PROJECT" --yes

# Restore from lock file (team sharing)
$REGISTRY_PATH/bin/skill install --target "$PROJECT" --yes
```
**[Critical] Always pass `--agent` explicitly.** Do not rely on auto-detection. Omitting `--agent` triggers `select_agents()`, which currently writes interactive prompt text into the agent list and causes files to install into the project root instead of the agent directory. This is a known bug.

**Key flags:**

| Flag | Purpose |
|------|---------|
| `--target <path>` | Project directory to install into (defaults to cwd) |
| `--global`, `-g` | Install to user's global agent directory instead of project |
| `--agent`, `-a <name>` | Restrict to specific agents (repeatable). If omitted, the CLI detects and prompts. |
| `--yes`, `-y` | Skip confirmation prompts. Always use this when running on the user's behalf — they already told you what they want. |
| `--ref <commit>` | Pin a remote install to a specific commit/tag/branch |

**Choosing `--agent` flags:** Always pass `--agent` explicitly. The agent flag values are: `claude-code`, `github-copilot`, `cursor`, `cline`, `opencode`, `codex`, `windsurf`, `roo`. Never rely on auto-detection — omitting `--agent` triggers `select_agents()` which currently has a known bug that corridors interactive prompt text into the agent list, causing files to install into the project root instead of proper agent directories.

**Important — always use the full dotted name.** For example, the brainstorming skill is `obra.superpowers.brainstorming`, not `brainstorming`. You can discover the full name from `bin/skill list` or `bin/skill search`.

**Deduplication:** `.agents/skills/` is the canonical source of truth. `github-copilot`, `cursor`, `cline`, `opencode`, and `codex` all install directly to `.agents/skills/<name>/` — the install loop copies files once (subsequent agents see files already exist and skip). `claude-code` installs to `.agents/skills/<name>/` and creates a symlink `.claude/skills/<name>` → `.agents/skills/<name>`. `windsurf` and `roo` install to their own directories.

### `uninstall` — Remove Installed Items

```bash
$REGISTRY_PATH/bin/skill uninstall <full-item-name> --target "$PROJECT" --yes
$REGISTRY_PATH/bin/skill uninstall <full-item-name> --target "$PROJECT" --agent claude-code --yes
```

Removes the item's directory from all agent paths, cleans up empty parent dirs, and updates `.skills-lock.json`. When the user says "remove X" or "I don't want Y anymore", this is the command.

### `update` — Pull Latest from Upstream

```bash
# Update from default upstream (obra/superpowers)
$REGISTRY_PATH/bin/skill update

# Update from a custom upstream
$REGISTRY_PATH/bin/skill update <owner/repo>

# Update a single item only
$REGISTRY_PATH/bin/skill update --item brainstorming

# Preview changes without modifying
$REGISTRY_PATH/bin/skill update --dry-run
```

After running `update`, always follow up with `bin/skill sync` to regenerate the registry index. Tell the user what changed.

**Important:** `bin/skill update` only updates the registry clone itself — the files under `$REGISTRY_PATH/skills/`. It does **not** push updated files into projects that already have those skills installed. After updating the registry, installed projects still have the old copies. To propagate updates to a project, re-run `install` for the affected items:

```bash
$REGISTRY_PATH/bin/skill update --yes && $REGISTRY_PATH/bin/skill sync
# Then for each project that uses these skills:
$REGISTRY_PATH/bin/skill install <item-name> --target "$PROJECT" --agent <agent> --yes
```

Or, if many items were updated, restore everything from the lock file (which re-copies all files at their current registry versions):

```bash
$REGISTRY_PATH/bin/skill install --target "$PROJECT" --yes
```

### `sync` — Regenerate the Registry Index

```bash
$REGISTRY_PATH/bin/skill sync
```

Scans all `skills/`, `instructions/`, and `profiles/` directories and rebuilds `registry.json`. Run this after:
- Adding or modifying any skill content (new skills, edited manifests)
- Running `bin/skill update`
- Changing anything under `skills/` or `instructions/`

This is required for new content to appear in `list` and `search` output.

## Agent Install Paths

Each AI assistant reads skills from a specific directory. The CLI places files accordingly:

| Agent flag | Project path | Global path (`--global`) |
|------------|-------------|--------------------------|
| `claude-code` | `.claude/skills/<name>/` → `.agents/skills/<name>/` | `~/.claude/skills/<name>/` |
| `github-copilot` | `.agents/skills/<name>/` | `~/.copilot/skills/<name>/` |
| `cursor` | `.agents/skills/<name>/` | `~/.cursor/skills/<name>/` |
| `cline` | `.agents/skills/<name>/` | `~/.agents/skills/<name>/` |
| `opencode` | `.agents/skills/<name>/` | `~/.config/opencode/skills/<name>/` |
| `codex` | `.agents/skills/<name>/` | `~/.codex/skills/<name>/` |
| `windsurf` | `.windsurf/skills/<name>/` | `~/.codeium/windsurf/skills/<name>/` |
| `roo` | `.roo/skills/<name>/` | `~/.roo/skills/<name>/` |

`.agents/skills/` is the source of truth: `github-copilot`, `cursor`, `cline`, `opencode`, and `codex` all install directly there. `claude-code` installs to `.agents/skills/` and creates a relative symlink `.claude/skills/<name>` → `../../.agents/skills/<name>`. `windsurf` and `roo` install to their own directories and do not read from `.agents/skills/`.

## Lock File & Team Sharing

Every `install` and `uninstall` updates `.skills-lock.json` in the project root. The structure is:

```json
{
  "version": 1,
  "installed": {
    "obra.superpowers.brainstorming": {
      "type": "skill",
      "version": "1.0.0",
      "source": "local",
      "sourceUrl": null,
      "sourceCommit": null,
      "installedAt": "2026-06-29T22:00:00Z",
      "agents": ["claude-code"],
      "profile": null
    }
  }
}
```

Each installed item is keyed by its full dotted name. Fields you care about when reading the lock file:
- **`type`** — `skill`, `agent`, or `instruction`
- **`agents`** — array of agent flags the item is installed for
- **`source`** — `"local"` for registry items, a URL for remote installs
- **`sourceCommit`** — the pinned commit (null for local registry items)

When summarizing installed items for the user, extract these fields from the JSON. Do not use `jq` — the CLI is zero-dependency. Use `python3 -c "import json,sys; ..."` if you need structured parsing, or read the file and summarize manually for small lock files.

**Team workflow:**
1. One person sets up skills → `.skills-lock.json` is created
2. They commit the lock file to version control
3. Teammates clone and run: `$REGISTRY_PATH/bin/skill install --target "$PROJECT" --yes`
4. This restores the exact same skills, same versions, same agents — no manual selection needed

When the user asks "how do I share this with my team?", explain this workflow and tell them to commit `.skills-lock.json`.

## Profiles

Profiles are named bundles defined in `$REGISTRY_PATH/profiles/`. They install multiple items in one command:

```bash
$REGISTRY_PATH/bin/skill install --profile ponytail --target "$PROJECT" --yes
```

To see available profiles, list the `profiles/` directory. To create a new profile, write a YAML file:

```yaml
name: my-workflow
description: My standard dev workflow skills.
items:
  - name: obra.superpowers.brainstorming
    source: local
  - name: obra.superpowers.systematic-debugging
    source: local
```

Then run `bin/skill sync` to register it.

## Guided Workflows (Setup / Uninstall / Update)

This skill bundles three guided, interactive workflows as resources next to this file:

- **`resources/setup.md`** — Full onboarding: detects environment, discovers skills, installs selected items, sets up AGENTS.md, optionally sets up beads (`bd`), taste developer, and OpenSrc.
- **`resources/uninstall.md`** — Removal workflow: scans installed items, lets the user select what to remove, confirms before deleting.
- **`resources/update.md`** — Update + health check: refreshes the registry clone, re-propagates every locked item at the current versions, then scans for missing files, broken symlinks, version drift, orphans, and incomplete beads wiring — fixing them on your confirmation.

When the request is a first-time setup ("set up skills for my project", "onboard this project", `/awesome-ai-usage install`), read `resources/setup.md` in full and execute it step by step. For a bulk removal ("help me remove skills", "uninstall everything", `/awesome-ai-usage uninstall`), use `resources/uninstall.md`. For "update my skills" / "check my setup" / `/awesome-ai-usage update`, use `resources/update.md`. Run **Registry Discovery** (above) first and pass the resulting `REGISTRY_PATH`/`PROJECT_PATH` into the workflow so it skips its own detection.

For a single concrete action — adding or removing one named item, listing, searching, or re-installing just one skill — do **not** launch these workflows; use the [CLI Command Reference](#cli-command-reference) directly.

> **Bootstrap note:** A brand-new user who hasn't installed this skill yet starts from the top-level `SETUP-PROMPT.md` in the registry repo. That file is a thin bootstrap: it clones the registry, installs this `awesome-ai-usage` skill, then hands off to `resources/setup.md`. Once the skill is installed, everything runs through this skill instead.

## Common Workflows

### User asks "what skills are available?"
```bash
$REGISTRY_PATH/bin/skill list
```
Present the output as a table. If they want to filter, add `--type`, `--tag`, or `--for`.

### User asks "install the brainstorming skill"
```bash
# First confirm the full name
$REGISTRY_PATH/bin/skill search brainstorming
# Then install
$REGISTRY_PATH/bin/skill install obra.superpowers.brainstorming --target "$PROJECT" --agent <agent> --yes
```

### User asks "remove the context-sync skill"
```bash
$REGISTRY_PATH/bin/skill uninstall local.context-sync --target "$PROJECT" --yes
```

### User asks "what's installed in this project?"
```bash
cat "$PROJECT/.skills-lock.json"
```
Read and summarize: list each installed item, its type, and which agents have it. If the lock file is missing, scan agent directories directly.

### User asks "update my skills to the latest"

The registry discovery step already keeps the registry clone itself up to date (`git pull`). This command pulls the latest skill content from upstream repos (like obra/superpowers) and refreshes the index:

```bash
$REGISTRY_PATH/bin/skill update --yes && $REGISTRY_PATH/bin/skill sync
```

Then push the updated files into the project (the registry has new content but installed project copies are still old):

```bash
$REGISTRY_PATH/bin/skill install --target "$PROJECT" --yes
```

### User asks "share my setup with teammates"
Tell them: commit `.skills-lock.json` to the repo. Teammates clone and run `bin/skill install` (no arguments). That restores everything from the lock file.

### User wants to add a new skill to the registry
This is a registry-development workflow (only applies when working inside the skills-registry repo itself):
1. Create `skills/<name>/` with `manifest.yaml` and `SKILL.md`
2. Run `$REGISTRY_PATH/bin/skill sync`
3. The new skill is now installable via `bin/skill install <name>`

## Handling Partial or Inconsistent State

Real projects can get into states where the lock file and agent directories disagree. Here's how to detect and fix each case.

### Lock file exists, but agent directories are missing

This can happen if directories were deleted manually or a teammate's clone doesn't have them yet. Run `bin/skill install` (no args) to restore everything from the lock file:

```bash
$REGISTRY_PATH/bin/skill install --target "$PROJECT" --yes
```

This is idempotent — it re-copies files for every entry in the lock file, recreating any missing directories.

### Agent directories exist, but lock file is missing or empty

This happens if `.skills-lock.json` was deleted, never committed, or the install was done without `--target`. The skills are still usable but the lock file can't be used for team restore.

To rebuild the lock file, re-install each item that exists on disk. Scan what's present:

```bash
for dir in .claude/skills .github/skills .agents/skills .windsurf/skills .roo/skills; do
  if [ -d "$PROJECT/$dir" ]; then
    for item in "$PROJECT/$dir"/*/; do
      basename "$item"
    done
  fi
done | sort -u
```

Then re-install each discovered item (the CLI will re-add them to the lock file):

```bash
$REGISTRY_PATH/bin/skill install <item-name> --target "$PROJECT" --agent <agent> --yes
```

### An item is partially installed (some agents have it, others don't)

The lock file records which agents each item targets. If the user says a skill works in one assistant but not another, check the lock file's `agents` array for that item, then scan the corresponding agent directories. Re-run install to fix gaps:

```bash
$REGISTRY_PATH/bin/skill install <item-name> --target "$PROJECT" --agent <missing-agent> --yes
```

### Beads database (.beads/) exists but the beads items aren't installed

The beads database (`.beads/`) is separate from the beads instruction items (`local.beads` and `local.beads-workflow`). If `.beads/` exists but the items aren't in the lock file, the agent won't know to run `bd prime`/`bd remember`. Install the beads items to connect them:

```bash
$REGISTRY_PATH/bin/skill install local.beads --target "$PROJECT" --agent <agent> --yes
$REGISTRY_PATH/bin/skill install local.beads-workflow --target "$PROJECT" --agent <agent> --yes
```

## Safety Rules

- **Always use `--yes`** when running commands on the user's behalf — they already gave you the intent.
- **Never modify the registry's own files** (under `$REGISTRY_PATH/skills/`, `instructions/`, `bin/`) unless the user explicitly asks to develop the registry itself.
- **Never hardcode the registry path.** Always discover it dynamically per the discovery steps above.
- **Always run `sync` after any content change** to the registry (new skills, edited manifests, updates from upstream).
- **On Windows PowerShell**, use `$REGISTRY_PATH/bin/skill.ps1` instead of the bash entry point.
