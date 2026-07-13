---
name: local.upstream-sync
description: >
  Review how far this fork is behind its upstream parent (kunchenguid/lavish-axi)
  and help decide which upstream commits to merge without breaking the atelier
  rebrand or local customizations. Use whenever the user asks to "check upstream",
  "sync upstream", "pull upstream changes", "how far behind is the fork", "review
  new upstream commits", or wants to catch this fork up to lavish-axi. The
  "commits behind" count is computed live from git, so after a merge lands on
  GitHub and local main is updated it drops back to 0 on its own.
---

# Upstream sync review

`atelier-axi` is a maintained fork of **[`kunchenguid/lavish-axi`](https://github.com/kunchenguid/lavish-axi)** carrying a permanent `lavish` → `atelier` rebrand.
This skill answers two questions: **how far behind am I, and which upstream commits should I pull in?**
It then hands the actual merge off to the maintainer procedure in `docs/upstream-sync.md`.

The mechanics of resolving conflicts, why the merge must be a plain merge commit, and how the `no-mistakes` CI gate behaves on sync PRs all live in **`docs/upstream-sync.md`** — read it before merging and do not duplicate it here.

## How "behind" is counted (and why it resets)

The count is pure git — no state file:

```sh
git rev-list --count main..upstream/main
```

This counts upstream commits not yet reachable from your local `main`.
Because syncs land as a **plain merge commit** (never squash/rebase), merging `upstream/main` makes it an ancestor of `main`, so the count naturally falls to `0`.
Nothing to reset by hand.

The count reads your **local** `main`.
So after the sync PR merges on GitHub, you MUST update local `main` (Step 4) for the count to reflect reality — otherwise it keeps showing the old number.

## Step 1 — Check how far behind

```sh
git remote -v | grep -q '^upstream' || {
  git remote add upstream https://github.com/kunchenguid/lavish-axi.git
  git remote set-url --push upstream DISABLE_PUSH_TO_UPSTREAM
}
git fetch upstream --quiet
git rev-list --count main..upstream/main
```

- **`0`** → the fork is up to date; report that and stop, there is nothing to review.
- **`N > 0`** → report "N commits behind upstream" and continue to Step 2.

## Step 2 — Review the behind-commits and recommend

List what is behind (skip merge commits — review the real changes):

```sh
git log --oneline --no-merges main..upstream/main
```

Inspect the actual diff of each commit before recommending — never guess from the subject line:

```sh
git show <sha>
```

Then give the user a per-commit recommendation table classifying each as one of:

- **Merge** — a genuine bugfix, feature, or improvement worth taking. Note if it touches renamed identifiers (package name, `bin`, `ATELIER_AXI_*` / `LAVISH_AXI_*` env vars, `.atelier` / `.lavish` paths, CLI/skill wording); those WILL conflict on merge and the atelier side must be kept, which is expected, not a blocker.
- **Merge with care** — logic worth taking but it risks the atelier rebrand or a local customization. Call out exactly what to watch during conflict resolution.
- **Skip** — an upstream-only feature this fork does not want, or something already reimplemented locally. Explain why. Skipped commits still count as "behind" under pure-git counting (see the caveat in Step 3).

Verify nothing in the batch reverts the rebrand or a local customization before recommending a full merge.
If the user wants only some commits, prefer cherry-pick per `docs/upstream-sync.md`.

## Step 3 — Do the sync

Follow **`docs/upstream-sync.md`** exactly: throwaway `sync-upstream-YYYY-MM-DD` branch, resolve conflicts keeping the atelier side of renames and upstream's logic, `pnpm run check`, own-fork PR, plain-merge, admin-merge past the expected-red `Require no-mistakes` check.

> Counting caveat: if the user chooses to **cherry-pick** or deliberately **skip** commits rather than fully merge `upstream/main`, those unmerged commits keep counting as "behind".
> That is correct — they genuinely are not in `main`.
> Tell the user the residual count is the commits they chose not to take, so a nonzero count after a partial sync is expected, not a bug.

## Step 4 — Confirm the count reset

After the sync PR merges on GitHub, refresh local `main` so the "behind" count reflects it:

```sh
git switch main && git pull origin main
git fetch upstream --quiet
git rev-list --count main..upstream/main
```

After a full merge this is `0` (or, after a partial sync, exactly the commits intentionally left behind).
Report the final number so the user knows the fork's current standing.

## Graceful degradation

- No network / `git fetch upstream` fails → report that the count is stale and cannot be refreshed; do not invent a number.
- `docs/upstream-sync.md` missing → the merge procedure is unavailable; surface that and do not improvise a merge onto `main` directly.
