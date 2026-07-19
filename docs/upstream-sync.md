# Upstream sync (maintainer guide)

`atelier-axi` is a maintained fork of **[`kunchenguid/lavish-axi`](https://github.com/kunchenguid/lavish-axi)**.
It carries a permanent hard rebrand (`lavish` → `atelier`) across the package name, CLI binary,
env vars, `.lavish`/`.atelier` paths, skill text, and public API surface. Because the rebrand is
committed to `main` (not a swappable override), every upstream change that touches a renamed
identifier will conflict on merge — that is expected and is resolved per-sync, not eliminated.

## Remotes

```sh
git remote -v
# origin    https://github.com/knowttl/atelier-axi.git   (your fork — push here)
# upstream  https://github.com/kunchenguid/lavish-axi.git (fetch only)
```

`upstream`'s push URL is intentionally disabled (`DISABLE_PUSH_TO_UPSTREAM`) so you can never push
to the parent by accident. If a fresh clone lacks `upstream`, add it:

```sh
git remote add upstream https://github.com/kunchenguid/lavish-axi.git
git remote set-url --push upstream DISABLE_PUSH_TO_UPSTREAM
```

## The rule

**Never merge upstream directly into `main`.** Always merge on a throwaway branch, open a PR within
your own fork, review the diff, and land it with a **plain merge commit**. This keeps `main` stable
mid-resolution and gives every incoming upstream commit a reviewable diff.

## Procedure

```sh
git fetch upstream

# branch off current main (use today's date)
git switch main && git switch -c sync-upstream-YYYY-MM-DD

# resolve conflicts HERE, isolated from main
git merge upstream/main
```

When resolving conflicts:

- **Keep the atelier side** of pure rename conflicts (package name, `bin`, `ATELIER_AXI_*` /
  `LAVISH_AXI_*` env vars, `.atelier`/`.lavish` paths, CLI/skill wording).
- **Take upstream's logic** — the actual behavior/bugfix/feature change riding along with the rename.
- **Confirm your rebrand and any local customizations were not reverted** by the merge.
- Do not hand-edit `CHANGELOG.md` or `.release-please-manifest.json` — release-please owns them;
  take whichever side keeps them consistent and let the bot reconcile.

Then verify, push the branch, and open the PR:

```sh
pnpm run check                         # build, lint, format, typecheck, tests, skill freshness
git push origin sync-upstream-YYYY-MM-DD
gh pr create --repo knowttl/atelier-axi --base main --head sync-upstream-YYYY-MM-DD \
  --title "Sync upstream lavish-axi YYYY-MM-DD" \
  --body "Upstream merge (own-fork maintenance)."
```

Review the PR like any other — read the commit list and diff, confirm nothing unwanted is pulled
in, and confirm your override/customizations survived — then **merge with a plain merge commit**:

```sh
gh pr merge --merge     # NOT --squash, NOT --rebase
```

### Why a plain merge commit (not squash/rebase)

Squash- or rebase-merging collapses the shared commit history git uses to compute future diffs
against `upstream`. After a squash, the next `git merge upstream/main` re-shows already-applied
upstream changes as brand-new conflicts. A real merge commit records the true ancestry so later
syncs only surface genuinely new upstream work.

## The `no-mistakes` gate on sync PRs

CI runs a **`Require no-mistakes`** check on every PR to `main` (see `CONTRIBUTING.md` and
`.github/workflows/no-mistakes-required.yml`). It fails unless the PR body carries the deterministic
no-mistakes signature — and it only exempts `github-actions`, `dependabot`, and `release-please`.

That check exists to gate **external contributions to the parent project**, not maintenance merges
you land on a fork you own. So on an upstream-sync PR it will show **red, and that is expected**:
review the diff and admin-merge past it. `main` is intentionally left **unprotected** so this red
check never blocks your own sync. (Do not route routine upstream syncs through `no-mistakes` — the
gate is for human-authored feature/fix contributions, which still go through `git push no-mistakes`
per `CONTRIBUTING.md`.)

## Dropping unwanted upstream features

If a reviewed sync pulls in a whole feature you don't want and it isn't opt-in by default, either:

- cherry-pick only the upstream commits you do want onto the sync branch instead of merging
  everything, or
- merge everything and disable/remove that piece in a follow-up commit on the sync branch before
  approving the PR.

### Standing skips

Two categories are skipped on sight, every sync, with no per-commit deliberation:

- **Upstream release bookkeeping.**
  release-please commits on the parent (`chore(main): release lavish-axi X.Y.Z`) and the
  `CHANGELOG.md` / `.release-please-manifest.json` / `package.json` version churn they carry.
  This fork publishes `atelier-axi` on its own release train and owns those files itself.
- **Branding commits.**
  Anything whose only content is upstream `lavish` naming, wording, or assets.
  The `lavish` → `atelier` rebrand is permanent, so taking these is always a revert.

Everything else gets a real per-commit call (merge / merge with care / skip with a reason).

## Finish every sync with a reconciliation merge

GitHub's "N commits behind" badge on the fork **tracks ancestry, not content**.
A ported commit is an *adapted* commit with a new SHA, so the upstream SHA never becomes an
ancestor and the badge never clears - even when every byte of the change is already in `main`.
A deliberately skipped commit does the same thing.

So a sync that ports or skips (rather than straight-merging everything) leaves a permanently
nonzero badge unless you close the ledger explicitly. Do that with an `ours` merge:

```sh
git fetch upstream
git switch -c sync-reconcile-YYYY-MM-DD        # off current main
git merge -s ours upstream/main                # records ancestry, changes nothing
```

Write the commit message so it states exactly what it is - which upstream SHAs it covers, where
their content landed, and which were skipped and why.

### Prove it is content-neutral

The first parent is our `main`, so a correct reconciliation merge has an **empty first-parent diff**:

```sh
git diff HEAD^1 HEAD                     # MUST be empty
git rev-parse HEAD^{tree} HEAD^1^{tree}  # MUST print the same tree SHA twice
```

If either check fails, the merge is not content-neutral - do not land it.
Record the output in the PR body; the PR's own "Files changed" tab must also be empty.

### Land it with a merge commit

Same constraint as any sync PR, and for the same reason, but here it is the *entire point*:
a squash or rebase merge discards the second parent, the ancestry is lost, and the badge stays
exactly where it was.

```sh
gh pr merge --merge     # NOT --squash, NOT --rebase
```

Confirm the repo still allows merge commits before opening the PR:

```sh
gh api repos/knowttl/atelier-axi --jq '{allow_merge_commit,allow_squash_merge,allow_rebase_merge}'
```

If `allow_merge_commit` is `false`, stop and get it re-enabled rather than landing a PR that
cannot do its job.

### Confirm the badge is zero

```sh
gh api repos/knowttl/atelier-axi/compare/kunchenguid:main...knowttl:main \
  --jq '{ahead_by,behind_by}'
```

`behind_by` tracks ancestry, not content; after a completed sync with reconciliation merge it must
read `0`.

### Order matters: reconcile last, never first

The `ours` merge moves the merge base for every *future* `git merge upstream/main`.
Any upstream change you had not yet ported or consciously skipped becomes invisible from then on -
git will consider it already accounted for and will never offer it again.

Only run the reconciliation merge once every commit in `main..upstream/main` has been ported,
merged, or deliberately skipped with a recorded reason. It is the closing step of a sync, never a
shortcut past one.
