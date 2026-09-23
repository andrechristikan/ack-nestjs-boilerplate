# Compare-ref resolution

The diff `writer` describes runs against a local ref this skill positions, never against
`origin/*` alone and never against a merge base it invented.

## Modes `description` and `create`

Base is the branch the PR targets (`main` or `development`; ask when not given).

```bash
git fetch origin <base>
git branch -f ack-pr/base-<base> origin/<base>
git rev-list --count ack-pr/base-<base>..HEAD
```

Zero commits ahead means the branch has nothing to describe: say so and stop.

The dispatch names `ack-pr/base-<base>`. `writer` diffs with no second ref and no `..`:
`git diff ack-pr/base-<base>` includes uncommitted and staged work, which
`ack-pr/base-<base>..HEAD` omits.

Slug: the branch name with a leading `feat/`, `fix/`, `chore/`, or similar prefix removed,
filesystem-safe. Output `generated/docs/pr-<slug>.md`.

## Mode `comment`

No compare ref. Inputs are the PR number and, for a review reply, the thread or comment id.
Read the thread first:

```bash
gh pr view <number> --comments
gh api repos/{owner}/{repo}/pulls/<number>/comments
```

Output `generated/docs/pr-comment-<slug>.md`, slug from the PR number and the thread.

## Mode `version`

The version identity is a single tag (`v1.2.0`) or an explicit range (`v1.1.0..v1.2.0`).
One tag means the previous reachable tag up to that tag; ask which previous tag when it is
ambiguous.

```bash
git fetch origin --tags
git branch -f ack-pr/version-<slug> <resolved tip>
git rev-list --count <from>..<to>
```

Zero means nothing to publish: say so and stop. The dispatch names both ends. Uncommitted
work is out of scope for `version` unless the owner said the tip is `HEAD` on the current
checkout.

Slug: the tag without its `v`, filesystem-safe (`1.2.0`). Output
`generated/docs/version-<slug>.md`.

## What stays out of the document

The local refs, the base branch, `origin/*`, "against base", any working-artifact path,
and any `.claude/` mention. A version identity the release is about may appear
(`.claude/rules/authoring.md`).
