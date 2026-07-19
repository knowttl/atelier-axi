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

**Never merge upstream directly into `main`.**
Use exactly one of the two modes below on a throwaway branch, open a PR within your own fork, review the diff, and land it with a **plain merge commit**.
This keeps `main` stable mid-resolution and gives every incoming upstream commit a reviewable disposition.

Every completed sync must leave GitHub's `behind_by` count at `0`.
Mode A achieves that through the full merge itself.
Mode B achieves it through a separate reconciliation merge after all wanted content has landed.

## Review the batch

Fetch upstream, record the reviewed tip, and inspect every commit in the pinned batch before selecting a mode.
Merge commits must also be dispositioned because their conflict-resolution content may exist in neither parent's ordinary commits.

```sh
git fetch upstream
REVIEWED_UPSTREAM_TIP=$(git rev-parse upstream/main)
printf '%s\n' "$REVIEWED_UPSTREAM_TIP"        # record this SHA in the disposition ledger
git log --oneline --no-merges "main..$REVIEWED_UPSTREAM_TIP"
git log --oneline --merges "main..$REVIEWED_UPSTREAM_TIP"
git show --cc <merge-sha>
```

This sync covers exactly the commits through the recorded reviewed tip, and every merge or reconciliation in either mode must target that pinned SHA.
Anything upstream adds beyond that tip is out of scope and forms the next review batch.

### Standing skips

Two categories are skipped on sight, every sync, with no per-commit deliberation:

- **Upstream release bookkeeping.** release-please commits on the parent (`chore(main): release lavish-axi X.Y.Z`) and the `CHANGELOG.md` / `.release-please-manifest.json` / `package.json` version churn they carry. This fork publishes `atelier-axi` on its own release train and owns those files itself.
- **Branding commits.** Anything whose only content is upstream `lavish` naming, wording, or assets. The `lavish` → `atelier` rebrand is permanent, so taking these is always a revert.

Everything else gets a real per-commit call: merge, merge with care, or skip with a reason.
A batch containing any standing skip must use Mode B because a straight full merge would import the skipped commit's cleanly merging content.

## Mode A - full merge

Mode A is the default for a clean batch with no standing skip when every commit is being accepted.
Create the throwaway branch from `main` and merge the recorded reviewed tip directly:

```sh
git switch main
git switch -c sync-upstream-YYYY-MM-DD
git merge "$REVIEWED_UPSTREAM_TIP"
```

When resolving conflicts:

- **Keep the atelier side** of pure rename conflicts such as the package name, `bin`, `ATELIER_AXI_*` / `LAVISH_AXI_*` env vars, `.atelier` / `.lavish` paths, and CLI or skill wording.
- **Take upstream's logic**, meaning the actual behavior, bugfix, or feature change riding along with the rename.
- **Confirm the rebrand and local customizations were not reverted** by the merge.
- Do not hand-edit `CHANGELOG.md` or `.release-please-manifest.json`; release-please owns them, so take whichever side keeps them consistent and let the bot reconcile.

The full merge records the reviewed tip as an ancestor, so it clears the reviewed batch without a separate reconciliation merge.
Running `git merge -s ours "$REVIEWED_UPSTREAM_TIP"` after it is harmless but only reports `Already up to date` and creates no commit.
The Mode B first-parent proof commands are meaningless in Mode A because there is no reconciliation commit; `HEAD^1` refers to an unrelated commit, so a vacuous pass is not evidence of content neutrality.

## Mode B - port or cherry-pick

Mode B is required whenever the batch contains a standing skip and is also used for any other selective sync.
Do not straight-merge `upstream/main` in this mode because doing so imports cleanly merging content from commits that policy says to skip.
Create the throwaway branch from `main`, then cherry-pick or port only the wanted commits:

```sh
git switch main
git switch -c sync-upstream-YYYY-MM-DD
git cherry-pick <wanted-upstream-sha>
```

Adapt a wanted commit when necessary to preserve the permanent rebrand and local customizations.
Record every upstream commit in the batch as ported or skipped with a reason, including merge commits and any merge-specific diff.

## Verify and land the content PR

After applying either mode, verify, push the branch, and open the PR:

```sh
pnpm run check                         # build, lint, format, typecheck, tests, skill freshness
git push origin sync-upstream-YYYY-MM-DD
gh pr create --repo knowttl/atelier-axi --base main --head sync-upstream-YYYY-MM-DD \
  --title "Sync upstream lavish-axi YYYY-MM-DD" \
  --body "Upstream sync (own-fork maintenance)."
```

Review the PR like any other: read the commit list and diff, confirm nothing unwanted is pulled in, and confirm the rebrand and local customizations survived.
Then merge with a plain merge commit:

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

## Finish Mode B with a reconciliation merge

GitHub's "N commits behind" badge on the fork **tracks ancestry, not content**.
A ported commit is an _adapted_ commit with a new SHA, so the upstream SHA never becomes an ancestor and the badge never clears - even when every byte of the change is already in `main`.
A deliberately skipped commit does the same thing.

Mode B leaves a permanently nonzero badge unless you close the ledger explicitly.
After the content PR lands, switch to `main`, fast-forward it from `origin`, fetch upstream, and only then create the reconciliation branch:

```sh
git switch main
git pull origin main
git fetch upstream
git rev-parse upstream/main                     # compare with the recorded reviewed tip
git switch -c sync-reconcile-YYYY-MM-DD        # off current main
git merge -s ours "$REVIEWED_UPSTREAM_TIP"    # use the exact SHA recorded during review
```

Starting from anything other than current `main` gives the reconciliation merge the wrong first parent.
Concurrent `main` changes can then appear removed in the reconciliation PR while both content-neutrality checks still pass against the wrong baseline.
If the fetch shows that `upstream/main` moved past the recorded tip, leave those new commits for the next batch and send them through the review procedure from the beginning.
Never replace the pinned SHA with the newer `upstream/main`, because that would reconcile unreviewed commits and hide their changes from future merges.

Write the commit message so it names the recorded reviewed tip, every covered upstream SHA, where wanted content landed, and which commits were skipped and why.

### Prove it is content-neutral

These checks apply only to Mode B.
The first parent is current `main`, so a correct reconciliation merge has an **empty first-parent diff**:

```sh
git diff HEAD^1 HEAD                     # MUST be empty
git rev-parse HEAD^{tree} HEAD^1^{tree}  # MUST print the same tree SHA twice
```

If either check fails, the merge is not content-neutral - do not land it.
Push the reconciliation branch and create its PR only after both checks pass:

```sh
git push origin sync-reconcile-YYYY-MM-DD
gh pr create --repo knowttl/atelier-axi --base main --head sync-reconcile-YYYY-MM-DD \
  --title "Reconcile reviewed upstream ancestry YYYY-MM-DD" \
  --body "<paste the empty first-parent diff, both identical tree SHAs, and the per-commit disposition table>"
```

The PR body must explicitly state that `git diff HEAD^1 HEAD` produced no output, include both identical SHA lines from `git rev-parse HEAD^{tree} HEAD^1^{tree}`, and include a disposition table showing where each covered upstream SHA landed or why it was skipped.
The PR's own "Files changed" tab must also be empty as the reviewable confirmation that the merge is content-neutral.

### Land it with a merge commit

Same constraint as any sync PR, and for the same reason, but here it is the _entire point_: a squash or rebase merge discards the second parent, the ancestry is lost, and the badge stays exactly where it was.

Confirm the repo still allows merge commits before merging the PR:

```sh
gh api repos/knowttl/atelier-axi --jq '{allow_merge_commit,allow_squash_merge,allow_rebase_merge}'
```

If `allow_merge_commit` is `false`, stop and get it re-enabled rather than landing a PR that cannot do its job.
The reconciliation PR's `Require no-mistakes` check is expected to be red for this fork-maintenance merge, so review the proof and disposition table and admin-merge past that check.

Merge the created PR as the final action:

```sh
gh pr merge --merge     # NOT --squash, NOT --rebase
```

### Confirm the badge is zero

```sh
gh api repos/knowttl/atelier-axi/compare/kunchenguid:main...knowttl:main \
  --jq '{ahead_by,behind_by}'
```

`behind_by` tracks ancestry, not content.
After either a Mode A full merge or a completed Mode B reconciliation merge, it must read `0`.
If upstream advanced beyond the recorded tip, the new commits are the next batch, so return to the review procedure and do not report the sync complete until that batch is dispositioned.

### Order matters: reconcile last, never first

The `ours` merge moves the merge base for every _future_ `git merge upstream/main`.
Any in-scope upstream change you had not yet ported or consciously skipped becomes invisible from then on - git will consider it already accounted for and will never offer it again.

Only run the reconciliation merge once every ordinary and merge commit through the recorded reviewed tip has been merged, ported, or skipped with a recorded reason.
It is the closing step of Mode B, never a shortcut past the ledger.
