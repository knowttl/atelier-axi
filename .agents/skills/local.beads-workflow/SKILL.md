---
name: beads-workflow
description: "Use when setting up beads (bd), recalling context with bd prime, tracking issues, or recording lessons with bd remember."
---

# Beads Workflow

Detailed procedures for setting up and using **beads** (`bd`) — a dependency-aware
issue tracker that doubles as persistent agent memory. Source:
<https://github.com/gastownhall/beads>.

`bd` is a system-wide CLI (installed via Homebrew / npm / script), **not** file-copied
content. This skill orchestrates installing it, initializing it in a project, and using
its recall (`bd prime`) and memory (`bd remember`) features. The routine pre-task recall
and post-task learning discipline lives in the `local.beads` instruction; this skill is
the on-demand reference and the setup path.

Goal: track features/bugs/tasks as a graph instead of markdown TODO lists, and capture
high-signal lessons — gotchas, edge cases, and environment quirks — so future agents stop
repeating mistakes. Not every task produces a save-worthy lesson.

## When to Use

- Setting up beads in a project for the first time (install `bd`, `bd init`, agent hooks).
- The user approved recording a lesson (from the `local.beads` instruction).
- The user asks to create, inspect, or close tracked issues.
- The user asks to review or clean up stored memories.

Do NOT use this skill for the routine pre-task recall — that is handled inline by the
`local.beads` instruction (`bd prime` / `bd ready`).

## Deterministic Rules

- `bd` (the beads database under `.beads/`) is the single source of truth. Never create
  `.ai/memory/`, `MEMORY.md`, or markdown TODO lists alongside it.
- Recall with `bd prime` before work; record with `bd remember` only after work.
- On a similar lesson, prefer refining an existing memory over recording a near-duplicate.
- **Default to generalized, pattern-level memories.** Capture the reusable lesson, not the
  one-off incident. Keep specifics only when justified (see the Generalization Rule).
- Keep memory strings concise and actionable. Strip transient paths and one-time details.
- **Always use the Standard Memory Format** (see Operation 4, Step 2) so every memory is
  consistently searchable with `bd memories <keyword>` and dedup-able via a stable `--key`.

## Operations

1. **Setup** — Install `bd` and initialize beads in the project
2. **Recall** — Load context and available work before a task
3. **Track** — Create, link, claim, and close issues
4. **Remember** — Record a durable lesson after a task
5. **Maintain** — Review memories and sync the database with teammates

---

## Operation 1: Setup (First Use)

Run when `bd` is missing or the project has no `.beads/` database.

### Step 1: Ensure the `bd` CLI is installed

Check for it first:

```bash
command -v bd
```

If it is missing, install it (prefer the user's existing package manager, and confirm
before installing system-wide):

```bash
brew install beads                 # macOS / Linuxbrew (recommended)
npm install -g @beads/bd           # any environment with npm
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash
```

If you cannot or should not install system software, print the commands and let the user
run them, then continue once `command -v bd` succeeds.

### Step 2: Initialize beads in the project

```bash
bd init
```

`bd init` creates the `.beads/` directory (an embedded Dolt database), updates `AGENTS.md`
with the beads workflow, wires a Dolt `origin` remote when the git repo has one, and
installs agent integrations. Pass `--skip-agents` if the caller only wants the database.

### Step 3: Wire agent-specific hooks

Beads ships dedicated setup for some agents; map the registry's agent flags:

| Agent flag        | Command             |
|-------------------|---------------------|
| `claude-code`     | `bd setup claude`   |
| `codex`           | `bd setup codex`    |
| others            | rely on `bd init` writing `AGENTS.md` |

Run the matching command for each installed agent. `bd setup claude` installs Claude Code
hooks/settings; run `bd --help` / `bd setup --help` to confirm currently supported agents.

### Step 4: Write the Standard Memory Format into the root instruction file

`bd init` writes a generic beads section into `AGENTS.md`, but it does **not** include our required
memory format — so agents won't follow the design unless we add it. Resolve the root instruction
file (first existing of `AGENTS.md`, `.github/copilot-instructions.md`, `CLAUDE.md`; otherwise create
`AGENTS.md`). If it does not already contain the marker `<!-- BEGIN: local.beads-memory-format -->`,
append this managed block verbatim (idempotent — never add a second copy):

```markdown
<!-- BEGIN: local.beads-memory-format -->
## Beads Memory Format (bd remember)

Record every lesson with `bd remember` in this exact shape so memories are searchable with `bd memories <keyword>` and dedup-able by key:

    bd remember "[<area>] <generalized lesson — root cause + rule/fix>. Keywords: <kw1>, <kw2>, <kw3>." --key <area>-<subject>

- `[<area>]` — one of: build, test, config, deps, api, arch, tooling, env, data, perf, security, workflow (workflow = catch-all).
- Lesson — one or two self-contained sentences that read as a reusable rule (root cause + fix). Strip transient paths, ticket numbers, and debugging noise.
- `Keywords:` — 3–6 lowercase search terms (tool/command names, file/component names, error tokens) a future agent would type into `bd memories`.
- `--key <area>-<subject>` — stable kebab-case slug; re-recording the same key updates the memory in place instead of duplicating.

Before recording, search with `bd memories <keyword>`; if a close memory exists, reuse its `--key` to refine it rather than adding a near-duplicate. Full procedure: the `local.beads-workflow` skill (Operation 4).
<!-- END: local.beads-memory-format -->
```

### Step 5: Configure team sync over the git remote (ask the user first)

Beads can share the **full Dolt database** — issues and memories — over the project's existing git
`origin`, using a custom `refs/dolt/data` ref that does not touch normal branches. No DoltHub or
separate server is required. Ask the user whether they want to share beads data with teammates; if
yes (the default when the repo has a git `origin`), configure it:

1. Derive a Dolt-over-git remote URL from the existing origin:
   ```bash
   ORIGIN_URL="$(git remote get-url origin)"
   # git@github.com:org/repo.git      -> git+ssh://git@github.com/org/repo.git
   # https://github.com/org/repo.git  -> git+https://github.com/org/repo.git
   ```
2. Register it as the Dolt remote (this also writes `sync.git-remote` into `.beads/config.yaml`):
   ```bash
   bd dolt remote add origin "git+ssh://git@github.com/org/repo.git"   # or git+https://…
   ```
3. Publish the database and verify the ref exists on the remote:
   ```bash
   bd dolt push
   git ls-remote origin 'refs/dolt/*'    # should list refs/dolt/data
   ```
4. Commit the config so teammates inherit the remote:
   ```bash
   git add .beads/config.yaml && git commit -m "chore: configure beads dolt git sync"
   ```

`.beads/config.yaml` (the only beads file tracked in git) will contain:

```yaml
sync:
  git-remote: git+ssh://git@github.com/org/repo.git
```

Teammates on a fresh clone then run `bd bootstrap` (see Operation 5) and push/pull just work.
If the user does **not** want team sync, skip this — beads stays local to their machine.

**Do not use `.beads/issues.jsonl` for sync.** It is an export for viewers/interchange, not the
source of truth; the database syncs via `refs/dolt/data`, not tracked files.

### Step 6: Verify

```bash
bd ready        # should run without error (empty list on a fresh project is fine)
bd prime        # should print workflow context
```

Confirm `.beads/` exists and is tracked appropriately (see Operation 5 for team sync).

---

## Operation 2: Recall (Before a Task)

The `local.beads` instruction handles the common recall path. Documented here for reference:

0. `bd dolt pull` — if a sync remote is configured (`bd dolt remote list` shows `origin`), pull
   teammates' latest issues/memories first. This merges into the local Dolt database only and does
   not touch the working tree, so it is safe to run before any task; surface any conflict/error to
   the user instead of forcing it.
1. `bd prime` — load workflow context and persistent memories.
2. `bd ready` — list unblocked, available issues.
3. `bd show <id>` — read the full detail of an issue before working it.
4. `bd update <id> --claim` — atomically claim it (sets assignee + in-progress) so parallel
   agents don't collide.

Apply recalled lessons before continuing.

---

## Operation 3: Track Issues

Use instead of markdown TODO lists.

```bash
bd create "Add rate limiting to the login endpoint" -p 1   # create (p0 = highest priority)
bd dep add <blocked-id> <blocker-id>                        # mark a dependency
bd show <id>                                                # inspect details + audit trail
bd update <id> --claim                                      # claim before working
bd close <id>                                               # close when done
```

- Break large work into an epic plus child issues; link children with `bd dep add`.
- Hash-based IDs (e.g. `bd-a1b2`) are collision-safe across parallel agents and branches.
- Run `bd --help` for the full command set (blockers, relations, message threads, etc.).

---

## Operation 4: Remember (After a Task)

Triggered when the user approves recording a lesson (see the `local.beads` instruction for
when to propose). Recording is `bd remember "<insight>"`; the work is in phrasing the insight.

### Step 0: Run the Decision Gate (and consider skipping)

Before recording anything, run the Decision Gate below and decide whether the lesson is worth
saving at all. If it is a one-off or trivial, do not record it.

### Step 1: Generalization Rule

A memory should help future *similar* tasks. Decide whether the lesson stays generalized
(default) or keeps specific detail.

Keep specific details only when at least one is true:

1. The file/component is critical and broadly reused across the codebase.
2. The file/component has unique design constraints or non-obvious logic that must be preserved.
3. The issue cannot be accurately represented without exact implementation context.

When specifics are included, always pair them with a generic takeaway so the memory stays
reusable. You own this decision and must make it before recording.

#### Decision Gate (run before every `bd remember`)

1. Is this a recurring pattern, or a one-off quirk of this specific task? (One-offs: skip.)
2. Can this be reframed as a reusable pattern?
3. Is this tied to a critical/shared component?
4. Does the component have unique logic that justifies specificity?
5. If specific details are present, is there also a generic takeaway?
6. Would another similar feature benefit from this memory as written?

If the lesson cannot pass (2) or (6), generalize it further before recording — or skip it entirely.

### Step 2: Phrase the insight using the Standard Memory Format

Every memory MUST follow this shape so future agents can find it by keyword and so re-recording
updates in place instead of duplicating:

```bash
bd remember "[<area>] <generalized lesson — root cause + rule/fix>. Keywords: <kw1>, <kw2>, <kw3>." --key <area>-<subject>
```

**Fields:**

- **`[<area>]`** — a coarse category prefix from this controlled vocabulary (pick the closest;
  `workflow` is the catch-all):
  `build, test, config, deps, api, arch, tooling, env, data, perf, security, workflow`.
  It doubles as a search facet: `bd memories build`.
- **Lesson** — one or two self-contained sentences that read as a reusable rule (root cause +
  the fix/rule). Not an incident log. Strip transient paths, ticket numbers, and debugging noise.
- **`Keywords:`** — 3–6 concrete, lowercase search terms: tool/command names, file/component
  names, error tokens, domain nouns. Include the words a future agent would actually type into
  `bd memories <keyword>`, even if they already appear in the sentence. This is what makes
  full-text search reliable regardless of how the prose is phrased.
- **`--key <area>-<subject>`** — a stable, predictable kebab-case slug. Re-recording the same
  lesson with the same key **updates it in place** (natural dedup), and enables exact retrieval
  via `bd recall <area>-<subject>`.

**Examples:**

- Good: `bd remember "[build] This repo's Bash scripts must stay zero-dependency — parse YAML/JSON with awk/sed helpers in common.sh, never jq/yq/node. Keywords: bash, yaml, zero-dependency, common.sh, parsing." --key build-zero-dependency`
- Bad:  `bd remember "Fixed the parse bug in list.sh on the auth ticket by removing jq."` (no area, no keywords, no key; reads as a one-off incident)

### Step 3: Search first, then record

Before recording, check for an existing memory on the same topic so you refine rather than
duplicate:

```bash
bd memories <keyword>          # full-text search existing memories
bd recall <area>-<subject>     # fetch a specific memory by its key, if you expect one
```

If a close memory exists, re-run `bd remember` with **the same `--key`** to update it in place.
Otherwise record the new one:

```bash
bd remember "[<area>] <generalized lesson>. Keywords: <kw1>, <kw2>, <kw3>." --key <area>-<subject>
```

The insight is stored in the beads database and surfaced to future agents via `bd prime`, and is
searchable anytime with `bd memories <keyword>`.

---

## Operation 5: Maintain

User-invocable. Run when the user asks to review memories, prune stale lessons, or share the
tracker with teammates.

### Review, search, and prune stored memories

```bash
bd memories                    # list all persistent memories
bd memories <keyword>          # full-text search (e.g. bd memories yaml)
bd recall <area>-<subject>     # fetch one memory by its key
bd forget <area>-<subject>     # remove a stale or superseded memory by key
```

`bd prime` prints the accumulated memories injected into agent context; `bd memories` is the
searchable audit view. Use them to spot stale, contradictory, or off-format lessons — when you
find a memory that doesn't follow the Standard Memory Format (Operation 4), re-record it with the
same `--key` to fix it in place. Beads also compacts old closed work via semantic summarization to
conserve context — see `bd --help` for compaction and memory-management subcommands.

### Team sync (Dolt database over the git remote)

The **Dolt database** is the source of truth, and it syncs over the project's existing git `origin`
via a custom `refs/dolt/data` ref — not via the `.beads/issues.jsonl` export. Configuration is done
once in Operation 1, Step 5; day-to-day it is just push/pull:

```bash
bd dolt push        # publish local issues + memories to refs/dolt/data on origin
bd dolt pull        # fetch teammates' issues + memories (the pre-task step, Operation 2 step 0)
```

**Onboarding a new clone or machine:**

```bash
bd bootstrap        # auto-detects refs/dolt/data on origin, clones the Dolt DB, wires the remote
```

`bd init` also bootstraps from origin automatically when `refs/dolt/data` already exists. After
bootstrap, `bd dolt push`/`pull` work with no extra setup because `.beads/config.yaml` (committed to
git) carries `sync.git-remote`.

- **Tracked in git:** only `.beads/config.yaml`. The database itself lives in `refs/dolt/data`; the
  local Dolt engine directory is gitignored by `bd init`.
- **`.beads/issues.jsonl` is an export only** — for viewers (`bv`) and interchange, never the sync
  source of truth. Do not commit it as a sync mechanism, and never hand-edit it; change data through
  `bd` commands.
- **Advanced remotes:** the same `bd dolt remote add <name> <url>` accepts DoltHub/DoltLab, S3, GCS,
  or a local path instead of a git remote — see the beads `docs/DOLT.md`. Prefer the git-remote
  default (`git+ssh://…` / `git+https://…`) since it reuses the repo you already push to.
