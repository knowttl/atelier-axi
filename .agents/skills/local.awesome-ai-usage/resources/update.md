# Update Workflow

> **Orchestration resource for the `awesome-ai-usage` skill.** The skill loads this file when the user asks to update their installed skills or check their setup's health (e.g. `/awesome-ai-usage update`, "update my skills", "check for skill updates", "is my skills setup healthy?"). Follow it as an interactive, step-by-step workflow.
>
> **If the skill already ran Registry Discovery**, reuse the `REGISTRY_PATH` and `PROJECT_PATH` it established (Registry Discovery already does `git pull && bin/skill sync` — do not repeat it). Otherwise establish both first.

Throughout this file, `<CLI>` means `"<REGISTRY_PATH>/bin/skill"`.

## What This Does

`/awesome-ai-usage update` brings the skills installed **from this awesome-ai registry** up to the latest versions the registry ships, then runs a **health check** that finds and (on your confirmation) fixes anything missing, broken, or out of date:

1. **Refresh the registry clone** — `git pull` + `bin/skill sync` so the local registry reflects the latest committed content.
2. **Propagate to the project** — restore every locked item from `.skills-lock.json`, re-copying files at the current registry versions.
3. **Health check** — scan the lock file, agent directories, symlinks, versions, and beads wiring; report every problem.
4. **Fix on confirm** — after you approve, remediate the findings (reinstall missing, re-propagate outdated, recreate symlinks, re-add managed blocks).
5. **Summary** — report what changed and what (if anything) still needs attention.

**Scope note:** this refreshes the awesome-ai clone via `git pull` — it does **not** run `bin/skill update` (which pulls the newest content from external upstream repos like obra/superpowers into the registry's vendored copies). That deeper refresh is a separate, heavier action; mention it only if the user explicitly asks for the very latest upstream content.

## Idempotent by Design

Every step checks current state and only changes what's needed. Restoring from the lock file and re-adding managed blocks are idempotent — re-running `update` on a healthy project reports "nothing to do." Safe to run anytime.

---

You are updating my installed AI coding skills and verifying my setup. Guide me through this interactively. Present findings, wait for my confirmation before making changes, and never delete anything without asking.

## Step 1: Preconditions

Confirm the essentials (reuse values the skill already discovered):

- `REGISTRY_PATH` — the awesome-ai clone (has `bin/skill` and `registry.json`).
- `PROJECT_PATH` — the project root (where `.skills-lock.json` lives). Default to the current directory.

```bash
[ -f "<PROJECT_PATH>/.skills-lock.json" ] && echo "lock file present" || echo "NO lock file"
```

If there is **no lock file**, the project has no recorded installs to update. Skip Steps 2–3, go straight to the health check (Step 4), and treat "no lock file" as a finding — offer to rebuild it by scanning the agent directories and re-installing what's found (see Step 5, *Rebuild a missing lock file*).

## Step 2: Refresh the registry clone

Unless the skill's Registry Discovery already did this in the current run, refresh the clone so it reflects the latest committed content:

```bash
cd "<REGISTRY_PATH>" && git pull && <CLI> sync
```

`git pull` only touches the registry clone, never the user's project. "Already up to date" is not a failure — `sync` must still run. If `git pull` fails (no network, upstream diverged), report the specific error and ask whether to continue with the current registry state.

Report what changed (the `git pull` summary). This is a `git pull` refresh, **not** `bin/skill update`.

## Step 3: Propagate updates to the project

**Delegate to a sub-agent.** Restore every locked item at the current registry versions:

> Restore all installed items into `<PROJECT_PATH>` from its lock file, re-copying files at the registry's current versions:
> ```bash
> <CLI> install --target "<PROJECT_PATH>" --yes
> ```
> This reads `.skills-lock.json` and re-installs every entry using the agents recorded in that entry (it does not prompt for agents). Local-source items update from the freshly-pulled registry; remote-source items are restored at their pinned `sourceCommit`. Return the list of items re-installed and note any whose on-disk version changed.

When the sub-agent returns, tell me which items were refreshed and any version bumps.

> To also refresh a **remote**-sourced item to its latest upstream (not just its pinned commit), re-install it without a ref: `<CLI> install <owner/repo> --skill <name> --target "<PROJECT_PATH>" --agent <agents> --yes`. Only do this if I ask.

## Step 4: Health check (report first, change nothing)

**Delegate the scan to a sub-agent.** It must read files and report — it must NOT modify anything in this step. Zero-dependency rule applies to the CLI, not to your analysis: use `python3` to parse the JSON lock file and `registry.json`.

> Perform a read-only health check of the beads/skills setup in `<PROJECT_PATH>`, using `<REGISTRY_PATH>/registry.json` as the source of truth for current versions, files, and targets. Report every finding; make no changes.
>
> Agent install paths (from `bin/lib/agents.sh`): `claude-code` → `.agents/skills/<name>/` with a symlink `.claude/skills/<name>` → `../../.agents/skills/<name>`; `github-copilot`/`cursor`/`cline`/`opencode`/`codex` → `.agents/skills/<name>/`; `windsurf` → `.windsurf/skills/<name>/`; `roo` → `.roo/skills/<name>/`.
>
> Check for each of these and classify severity:
>
> 1. **Missing / partial files** — for every entry in `.skills-lock.json`, the item directory exists for each of its recorded `agents`, and every file listed in that item's `registry.json` `files` array is present on disk. (severity: error)
> 2. **Broken symlinks** — for `claude-code` entries, `.claude/skills/<name>` is a symlink that resolves to the matching `.agents/skills/<name>`. (severity: error)
> 3. **Version drift** — the entry's `version` in the lock file is older than the item's `version` in `registry.json` (semver compare via `python3`). (severity: warn — will be fixed by re-propagation)
> 4. **Orphan lock entries** — an entry is in the lock file but its files are absent everywhere. (severity: error)
> 5. **Orphan directories** — a directory exists under an agent skills dir but is not in the lock file (manually installed, or the lock file lost the entry). (severity: warn)
> 6. **Beads coherence** — if `<PROJECT_PATH>/.beads/` exists but `local.beads` and/or `local.beads-workflow` are not in the lock file (record which). And if `local.beads` IS installed, whether the root instruction file (first existing of `AGENTS.md`, `.github/copilot-instructions.md`, `CLAUDE.md`) contains the markers `<!-- BEGIN: local.beads-memory-format -->` and — when a Dolt sync remote is configured (`bd dolt remote list` shows `origin`) — `<!-- BEGIN: local.beads-git-sync -->`. (severity: warn)
>
> Return a table: `# | item/target | finding | severity | suggested fix (exact command)`. If everything is healthy, say so explicitly.

Present the report to me as a clear table. If everything is healthy, tell me and skip to Step 6.

## Step 5: Fix on confirm

Show me exactly what will change, then ask: **"Proceed to fix all of these? (yes / choose a subset / no)"** Do not change anything until I answer.

After I approve, **delegate remediation to a sub-agent.** Apply only the fixes I approved:

> Remediate the approved findings in `<PROJECT_PATH>`. Report success/failure per fix.
>
> - **Outdated / missing / partial / broken-symlink items:** re-propagate from the lock file, which re-copies files and recreates symlinks (idempotent):
>   ```bash
>   <CLI> install --target "<PROJECT_PATH>" --yes
>   ```
>   For a single stubborn item, re-install it with the agents from its lock entry: `<CLI> install <name> --target "<PROJECT_PATH>" --agent <agent> --yes`.
> - **Orphan directories:** ask me per item whether to **remove** it (`<CLI> uninstall <name> --target "<PROJECT_PATH>" --yes`) or **adopt** it (re-install so it's recorded in the lock file). Never delete without my yes.
> - **Beads items missing while `.beads/` exists:** install them so the agent loads the beads workflow:
>   ```bash
>   <CLI> install local.beads --target "<PROJECT_PATH>" --agent <agent> --yes
>   <CLI> install local.beads-workflow --target "<PROJECT_PATH>" --agent <agent> --yes
>   ```
> - **Missing beads managed blocks:** append the missing block(s) to the root instruction file verbatim — the `<!-- BEGIN: local.beads-memory-format -->` and/or `<!-- BEGIN: local.beads-git-sync -->` blocks defined in `resources/setup.md` Step 8 (idempotent — only add a block whose marker is absent).
>
> **Rebuild a missing lock file** (only if Step 1 found none): scan the agent skill directories for installed item directories, then re-install each discovered item with `<CLI> install <name> --target "<PROJECT_PATH>" --agent <agent> --yes` so the lock file is regenerated. Ask me before assuming which agents each item targets if it is ambiguous.
>
> Return what was fixed and anything that still failed.

If the sub-agent reports any failure, tell me the specific command and error and ask whether to retry, skip, or abort.

## Step 6: Summary

Report:

- **Registry:** whether the clone was refreshed (git pull result) or already current.
- **Updated:** which installed items were re-propagated, and any version bumps (old → new).
- **Health findings:** the count by severity, and for each: fixed / skipped / still failing.
- **Beads:** if applicable — whether beads items and managed blocks are now complete.
- **Still needs attention:** anything unresolved, with the exact command to finish it.

Remind me that `.skills-lock.json` reflects the current state and can be committed so teammates get the same versions with `<CLI> install`.
