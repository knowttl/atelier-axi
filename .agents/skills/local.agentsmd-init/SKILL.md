---
name: agentsmd-init
description: >
  Create, update, or audit the AGENTS.md instruction file for a repository. Use
  whenever the user mentions AGENTS.md, CLAUDE.md, .cursorrules, "agent
  instructions," "write rules for this repo," "help future AI sessions," "ramp
  up faster," or wants to capture project conventions so agents stop making the
  same mistakes. Use when setting up a new project, after major refactors, or
  when the user asks to audit, refresh, sync, or improve existing agent
  instructions — even if they don't name the file. If an AGENTS.md already
  exists, default to auditing and improving it rather than rewriting.
---

# AGENTS.md

Create or update `AGENTS.md` for the current repository. If the file already
exists, audit it against the current codebase and improve it — don't rewrite
blindly. The output is a compact instruction file that helps future AI sessions
avoid mistakes and ramp up quickly. Every line must answer: **"Would an agent
likely miss this without help?"** If not, leave it out.

If the user provides focus areas or constraints (e.g., "focus on the build
system" or "just document the test setup"), narrow the investigation and output
to those areas.

## Workflow

Follow these steps in order. The path diverges at step 2 depending on whether
`AGENTS.md` already exists.

### 1. Check what already exists

Before investigating anything else, read any existing instruction files:

- `AGENTS.md` — primary output target
- `CLAUDE.md` — may contain content to merge or reference
- `.cursor/rules/` — rules that should stay there, not duplicate here
- `.cursorrules` — cursor-specific version, same treatment
- `.github/copilot-instructions.md` — same for Copilot
- `opencode.json` — may reference instruction files via the `instructions` field

This tells you whether you're in **init mode** (no `AGENTS.md` exists) or
**update mode** (`AGENTS.md` already exists).

### 2a. Update mode: audit existing content

If `AGENTS.md` exists, audit it against the current repo state before adding
anything new. For every claim in the file, verify:

- **Commands** — do they still exist and run? Has the CLI flag changed? Was the
  tool replaced? Run the command or check `package.json`/`Makefile`/task runner
  config to confirm.
- **Paths** — do the directories and files referenced still exist? Were they
  renamed or reorganized?
- **Tools and dependencies** — was jest replaced by vitest? webpack by vite?
  pip by poetry? Check lockfiles (including multiple if it's a monorepo) and
  config files for actual current usage.
- **Conventions** — does the codebase still follow this? Look at recent commits
  and current files. A convention documented but no longer followed is worse
  than no documentation.
- **Rules** — do the rules in the Agent Rules section still make sense? A rule
  like "always run `npm test` before pushing" is stale if the repo switched to
  `pnpm`. Trace each rule back to the command, path, or tool it references and
  verify that target still exists and works as the rule expects.
- **References** — do referenced config files, scripts, or external docs still
  exist at the stated path or URL?

Also check for structural completeness — if the file has an Agent Rules section
that is missing the self-updating paragraph (the text that says "when the user
establishes a new behavioral rule... add it as a bullet point below"), add it.
This ensures older files get upgraded to support self-updating rules.

Mark every claim as **keep**, **update** (stale but fixable), or **remove**
(stale beyond repair or no longer relevant). Do this systematically — a
partially audited file is worse than no file, because future agents will trust
stale claims.

Examples of stale content to catch:
- "Run tests with `npm test`" → but the repo now uses `pnpm test`
- "See `src/utils/helpers.ts`" → but that file was deleted in a refactor
- "Uses Jest for testing" → but `package.json` now shows vitest
- "Deploy with `./deploy.sh production`" → but the script was removed in favor
  of a GitHub Actions workflow
- "ESLint config in `.eslintrc.js`" → but the repo migrated to `eslint.config.mjs`
- "Always run `npm run lint` before committing" → but the repo now uses `pnpm`,
  so the rule should say `pnpm run lint`

### 2b. Init mode: investigate the repo

If no `AGENTS.md` exists, investigate the repo from scratch. Read sources in
roughly this priority order. Prefer executable sources over prose — if docs
conflict with config or scripts, trust the executable source.

1. `README*`, root manifests, workspace config, lockfiles
2. Build, test, lint, formatter, typecheck, and codegen config
3. CI workflows (`.github/workflows/`, etc.) and pre-commit / task runner config
4. A small number of representative source files — only if architecture is still
   unclear after config. Read files that explain how the system is wired
   together, not random leaf files.

If the repo has none of these (no package manager, no lockfile, no CI, no
tests, no build config), it may be a minimal repo. In that case, write a
short AGENTS.md with only what you did find. Do not pad it.

### 3. Extract high-signal facts

From your investigation (and in update mode, the audit notes), extract only
things an agent would get wrong or miss without help. Look for:

- Exact developer commands, especially non-obvious ones
- How to run a single test, a single package, or a focused verification step
- Required command order when it matters (e.g., `lint -> typecheck -> test`)
- Monorepo or multi-package boundaries, directory ownership, app entrypoints
- Framework/toolchain quirks: generated code, migrations, codegen, build
  artifacts, special env loading, dev servers, deploy flow
- Testing quirks: fixtures, integration test prerequisites, snapshot workflows,
  required services, flaky or expensive suites
- Non-obvious conventions from existing instruction files worth preserving

Good content is hard-earned context that took reading multiple files to infer.

### 4. In update mode: identify gaps

If you're updating, compare your extracted facts against the audited existing
file. What did you find in your investigation that the current `AGENTS.md`
doesn't cover? This tells you what to add in the merge step. If the existing
file already covers everything you found, it's still an improvement — you may
have verified and cleaned up stale content in the audit.

In init mode there are no gaps to identify; skip to step 5.

### 5. Ask questions (only if needed)

Only ask the user if the repo cannot answer something important. Use the
`question` tool for one short batch at most, and only for:

- Undocumented team conventions
- Branch / PR / release expectations
- Missing setup or test prerequisites known but not written down

Never ask about anything the repo already makes clear.

### 6. Write or merge

**Init mode** — write fresh using the structure template below. Include only
verified facts from your investigation.

**Update mode** — merge your audit results with new findings:
1. Remove every claim you marked **remove**
2. Fix every claim you marked **update** (e.g., correct the command, update the
   path, replace the tool name)
3. Add the gaps you identified in step 4 — facts from your investigation that
   the existing file was missing
4. If the file's structure is messy or scattered, restructure it to match the
   template below while preserving the content's meaning — but don't restructure
   just for the sake of it; only when readability would meaningfully improve

Apply the **filter test** to every line you write: "Would an agent likely miss
this without help?" If the answer is no, delete it.

**Structure template** — use short sections with bulleted lists. Adapt freely;
this is a starting point, not a straitjacket:

```
# AGENTS.md — <one-line repo summary>

## Agent Rules
<Include this exact paragraph before the rule bullets:>

Rules that govern how the agent works on this project. **Self-updating**:
when the user establishes a new behavioral rule (e.g. "always test after X",
"from now on, when Y happens do Z", "never Q unless R"), add it as a bullet
point below. Follow the format of existing rules. Do not ask for confirmation
— just add it.

- <rule 1: e.g. "Always rebuild the Docker image after changing the Dockerfile.">
- <rule 2: e.g. "Run `npm run lint` and `npm run typecheck` before committing.">
- <rule 3: e.g. "Never edit generated files directly; update the source template instead.">

## File Map
# <only the non-obvious directories and what they contain>

## Conventions
# <conventions that differ from language/framework defaults>
# <framework/toolchain quirks an agent would trip on>

## Commands
# <exact commands, especially non-obvious ones>
# <command order when it matters>
```

Include the **Agent Rules** section only if you found behavioral rules to
encode. If no rules are needed, omit it entirely — an empty heading is worse
than no heading. When included, it serves two purposes:

1. **Capture existing rules** you inferred from the repo — e.g., if the CI
   config shows a required lint-before-build order, encode it as a rule.
2. **Enable self-updating** — the paragraph at the top tells future agents that
   when the user says "from now on, always do X after Y", the agent should
   append that as a new bullet without asking. This keeps the file alive and
   accumulating context over time.

Rules should be specific, actionable, and verifiable. Good examples:
- "Always maintain both `.sh` and `.ps1` versions of any script you change."
- "After modifying content under `skills/`, run `bin/skill sync`."
- "Keep scripts zero-dependency — NEVER use `jq`, `yq`, or `node`."

Bad examples (vague, unverifiable, or obvious):
- "Write good code." (vague)
- "Use modern JavaScript." (obvious, not actionable)

**Rules vs. Conventions** — keep these two sections distinct to avoid
duplication:

- **Agent Rules** = behavioral imperatives the agent MUST follow: "always do X,"
  "never do Y," "when Z happens, do W." These are enforced by the agent itself.
- **Conventions** = descriptive patterns the codebase follows, which the agent
  should match: "this repo uses snake_case for Bash functions," "imports are
  sorted with biome," "error handling uses `set -euo pipefail`."

If the same fact could go in either section, put it in Conventions. Reserve
Agent Rules for things the agent would otherwise violate without being told.

Include only high-signal, repo-specific guidance. Exclude:
- Generic software advice, long tutorials, or exhaustive file trees
- Obvious language conventions (e.g., "use camelCase in JavaScript")
- Speculative claims or anything you could not verify
- Content better stored in another file referenced via `opencode.json`
  `instructions`

When in doubt, omit. If the repo is simple, the file should be short. If the
repo is large, summarize the few structural facts that actually change how an
agent should work.

### 7. Verify and summarize

After writing, do a final pass:

- Read the file once more and test each line against the filter: "Would an
  agent likely miss this without help?"
- Check that every command listed actually exists and runs as documented
- For update mode: confirm that every stale claim was either removed or
  corrected, and that nothing critical was lost in the cleanup
- Summarize to the user what you added, removed, corrected, and why — be
  specific: "Removed reference to `deploy.sh` (script no longer exists, replaced
  by GitHub Actions workflow `.github/workflows/deploy.yml`)" rather than
  "updated deploy section"
