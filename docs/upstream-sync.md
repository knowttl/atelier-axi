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
