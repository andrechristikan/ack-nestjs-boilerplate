---
name: ack-pr-doc
description: Write the pull-request DESCRIPTION document for the current branch to generated/docs/pr-<feature>.md. Description file only — never creates, opens, edits, or publishes a GitHub pull request. Use when the owner asks for a PR description. NOT for commit messages, NOT for docs/*.md.
disable-model-invocation: true
---

One file: `generated/docs/pr-<feature>.md`. **Never a GitHub pull request** — no
`gh pr create`, no `gh pr edit`, no API call that opens or mutates one, even if the owner asks
in the same exchange.

## 1 — Ask which base

`main` or `develop`. Ask before anything else; the answer changes the whole diff.

## 2 — Bring the base onto a LOCAL ref

```bash
git fetch origin <base>
```

Then fast-forward the local branch when it can accept the pull. When it cannot, point a
dedicated compare branch at the fetched tip:

```bash
git branch -f pr-doc/base-<base> origin/<base>
```

**Diff against the LOCAL ref, never `origin/*`.**

## 3 — Check there is something to publish

```bash
git rev-list --count <local-base>..HEAD
```

Zero means the branch has nothing ahead of that base. Say so and stop.

## 4 — Dispatch

`pr-doc-writer`, with the local base ref named. It diffs with **no second ref and no `..`** —
`git diff <local-base>` includes uncommitted and staged work, which `<base>..HEAD` silently
omits.

The document body follows `.github/pull_request_template.md`.

## Boundaries

- The description file only. No `src/`, no `test/`, no `docs/*.md`, no `prisma/`.
- **Never `git add`, `git commit`, or stage anything.** Preparing the local compare base (fetch,
  fast-forward, compare branch) is the sanctioned exception to git-read-only; nothing else is.
- No schema, DB, or seed commands.
- The branch is the scope. A feature scope does not constrain it: an unrelated fix riding the
  branch belongs in the document.

## Hand back

The file path, the base ref, and every item the agent put under **Known Open**.

## Next

Nothing. This skill runs on its own, at the end.

**It is deliberately not chained.** It fetches from `origin` and moves a local ref — every other
skill keeps git read-only. Running it inside a chain means the diff also carries whatever the
previous step left uncommitted, and the document then describes work that is still moving.

Run it when the branch is settled, and run nothing after it.
