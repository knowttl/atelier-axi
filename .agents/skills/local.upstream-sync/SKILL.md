---
name: local.upstream-sync
description: >
  Review how far this fork is behind its upstream parent (kunchenguid/lavish-axi)
  and help decide which upstream commits to merge without breaking the atelier
  rebrand or local customizations. Use whenever the user asks to "check upstream",
  "sync upstream", "pull upstream changes", "how far behind is the fork", "review
  new upstream commits", or wants to catch this fork up to lavish-axi. The
  "commits behind" count is computed live from git and tracks ancestry rather
  than content. A full merge clears it directly; a selective port or cherry-pick
  sync must end with an `ours` reconciliation merge. Either mode must reach 0.
---

# Upstream sync review

`atelier-axi` is a maintained fork of **[`kunchenguid/lavish-axi`](https://github.com/kunchenguid/lavish-axi)** carrying a permanent `lavish` → `atelier` rebrand.
This skill answers two questions: **how far behind am I, and which upstream commits should I pull in?**
It then hands the actual merge off to the maintainer procedure in `docs/upstream-sync.md`.

The mechanics of resolving conflicts, why the merge must be a plain merge commit, and how the `no-mistakes` CI gate behaves on sync PRs all live in **`docs/upstream-sync.md`** — read it before merging and do not duplicate it here.

## How "behind" is counted

The count is pure git — no state file:

```sh
git rev-list --count main..upstream/main
```

This counts upstream commits not yet reachable from your local `main`.
GitHub's fork badge computes the same thing (`behind_by` on the compare API).

**It tracks ancestry, not content.**
A commit whose change you _ported_ is an adapted commit with a new SHA, so the upstream SHA never becomes an ancestor and the count never drops for it.
A commit you deliberately _skipped_ behaves identically.
Mode A uses a straight `git merge upstream/main`, which records all upstream SHAs as ancestors and clears the count by itself.
Mode B ports or cherry-picks only wanted content, so it must end with an `ours` reconciliation merge (Step 4) that records the dispositioned upstream commits as ancestors while changing zero bytes of the tree.
After either mode completes, `behind_by` must be `0`.

The count reads your **local** `main`.
So after the sync PRs merge on GitHub, you MUST update local `main` (Step 5) for the count to reflect reality - otherwise it keeps showing the old number.

## Step 1 - Check how far behind

```sh
git remote -v | grep -q '^upstream' || {
  git remote add upstream https://github.com/kunchenguid/lavish-axi.git
  git remote set-url --push upstream DISABLE_PUSH_TO_UPSTREAM
}
git fetch upstream --quiet
git rev-list --count main..upstream/main
```

- **`0`** - the fork is up to date; report that and stop, there is nothing to review.
- **`N > 0`** - report "N commits behind upstream" and continue to Step 2.

## Step 2 - Review the behind-commits and recommend

List the ordinary commits for a readable per-commit review:

```sh
git log --oneline --no-merges main..upstream/main
```

Enumerate merge commits separately and inspect each merge-specific diff because conflict-resolution content can exist in neither parent's ordinary commits:

```sh
git log --oneline --merges main..upstream/main
git show --cc <merge-sha>
```

Inspect the actual diff of each commit before recommending — never guess from the subject line:

```sh
git show <sha>
```

Then give the user a per-commit recommendation table classifying each as one of:

- **Merge** - a genuine bugfix, feature, or improvement worth taking. Note if it touches renamed identifiers (package name, `bin`, `ATELIER_AXI_*` / `LAVISH_AXI_*` env vars, `.atelier` / `.lavish` paths, CLI/skill wording); those WILL conflict on merge and the atelier side must be kept, which is expected, not a blocker.
- **Merge with care** - logic worth taking but it risks the atelier rebrand or a local customization. Call out exactly what to watch during conflict resolution.
- **Skip** - an upstream-only feature this fork does not want, or something already reimplemented locally. Explain why.

Two categories are **standing skips** - classify them without deliberation, but still list them so the batch is fully accounted for:

- **Upstream release bookkeeping** - `chore(main): release lavish-axi X.Y.Z` and the `CHANGELOG.md` / `.release-please-manifest.json` / `package.json` version churn it carries. This fork runs its own release train.
- **Branding commits** - anything whose only content is upstream `lavish` naming, wording, or assets. Taking these would revert the permanent rebrand.

Verify nothing in the batch reverts the rebrand or a local customization before recommending Mode A.
A batch containing any standing skip must use Mode B because Mode A would import the skipped commit's cleanly merging content.
Use Mode B for any other selective sync as well.

Every ordinary and merge commit in the batch must end up with a disposition - merged, ported, or skipped with a reason.
Step 4 depends on that being complete.

## Step 3 - Select and perform one sync mode

There are exactly two modes:

- **Mode A - full merge.** This is the default for a clean batch with no standing skip when every commit is accepted. Use the throwaway `sync-upstream-YYYY-MM-DD` branch and straight `git merge upstream/main`. The merge itself records upstream ancestry, so the badge clears without Step 4. Running the `ours` merge afterward is a harmless `Already up to date` no-op that creates no commit. The first-parent proof commands in Step 4 are meaningless here because there is no reconciliation commit, and `HEAD^1` is unrelated to that proof.
- **Mode B - port or cherry-pick.** This is required whenever the batch contains any standing skip and applies to every other selective sync. Cherry-pick or port only wanted commits on the throwaway branch. Do not straight-merge `upstream/main`, because that would import cleanly merging standing-skip content. This mode must continue through Step 4.

Follow **`docs/upstream-sync.md`** exactly for the selected mode: throwaway `sync-upstream-YYYY-MM-DD` branch, preserve the atelier side of renames while taking wanted upstream logic, run `pnpm run check`, open an own-fork PR, and plain-merge it past the expected-red `Require no-mistakes` check.

> Mode B's ported and skipped commits keep counting as "behind" until Step 4 closes the ledger.
> A nonzero count between Step 3 and Step 4 is expected, not a bug.

## Step 4 - Close the Mode B ledger with a reconciliation merge

Skip this step for Mode A because its full merge already records `upstream/main` as an ancestor.
For Mode B, proceed only once **every** ordinary and merge commit in the batch has been ported or skipped with a reason.
This step returns the Mode B badge to `0`; the full procedure and rationale are in **`docs/upstream-sync.md`** ("Finish Mode B with a reconciliation merge").

```sh
git switch main
git pull origin main
git fetch upstream
git switch -c sync-reconcile-YYYY-MM-DD        # off current main
git merge -s ours upstream/main                # records ancestry, changes nothing
git diff HEAD^1 HEAD                           # MUST be empty - proof of content-neutrality
git rev-parse HEAD^{tree} HEAD^1^{tree}        # MUST print the same tree SHA twice
```

Starting from anything other than current `main` gives the merge the wrong first parent.
Concurrent `main` changes can then appear removed in the reconciliation PR while both proof checks still pass against that wrong baseline.
Write the commit message so it names the upstream SHAs covered, where their content landed, and which were skipped and why.
If either proof check is non-empty, the merge is not content-neutral - stop, do not land it.

Land it with a **plain merge commit** (`gh pr merge --merge`).
A squash or rebase merge discards the second parent, so the ancestry is lost and the badge does not move - here that is the whole point of the PR, not a side concern.

> **Reconcile last, never first.**
> The `ours` merge moves the merge base for every future `git merge upstream/main`, so anything not yet dispositioned becomes permanently invisible to git.
> It is the closing step of Mode B, never a shortcut past the ledger.

## Step 5 - Confirm the count reset

After the sync PRs merge on GitHub, refresh local `main` so the "behind" count reflects it:

```sh
git switch main && git pull origin main
git fetch upstream --quiet
git rev-list --count main..upstream/main

gh api repos/knowttl/atelier-axi/compare/kunchenguid:main...knowttl:main \
  --jq '{ahead_by,behind_by}'
```

`behind_by` tracks ancestry, not content; after either a Mode A full merge or a completed Mode B reconciliation merge it must read `0`.
A residual nonzero count means the selected mode did not record the full upstream ancestry or a required PR was squash/rebase-merged - investigate rather than reporting it as normal.
Report the final number so the user knows the fork's current standing.

## Graceful degradation

- No network / `git fetch upstream` fails - report that the count is stale and cannot be refreshed; do not invent a number.
- `docs/upstream-sync.md` missing - the merge procedure is unavailable; surface that and do not improvise a merge onto `main` directly.
