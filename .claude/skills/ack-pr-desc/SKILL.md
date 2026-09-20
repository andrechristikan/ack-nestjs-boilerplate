---
name: ack-pr-desc
description: >-
    Write a public description document for a pull request or a version/release — to generated/docs/pr-<slug>.md or generated/docs/version-<slug>.md. Description file only — never creates, opens, edits, or publishes a GitHub pull request or Release. Use when the owner asks for a PR description, release notes, or version description. NOT for commit messages, NOT for docs/*.md (ack-docs), NOT for src/ (ack-code).
disable-model-invocation: true
---

One file under `generated/docs/`. **Never a GitHub pull request or Release** — no `gh pr create`,
no `gh pr edit`, no `gh release`, no API call that opens or mutates one, even if the owner asks
in the same exchange.

## Reject early

| The request | Where it goes |
|---|---|
| a commit message | not a skill — propose the subject line in this session |
| `docs/*.md`, the root people files, or `.github/**` except `copilot-instructions.md` | `/ack-docs` |
| `src/` behaviour | `/ack-code` |
| open or edit a GitHub pull request or Release | refused — this skill writes the description file only |

Say which, and stop.

## Rules

Read `.claude/rules/orientation.md` before dispatching. Take the four, the extras for
`pr-desc-writer`, then every surface row the diff actually touches when a section of the
document needs them.

## 1 — Ask which mode

**Do this yourself, in this session.** An agent has no `AskUserQuestion`.

Use `AskUserQuestion`. `pr` or `version`. Ask before anything else; the answer changes the
diff and the layout.

## 2 — Resolve the compare range

### Mode `pr`

Ask base: `main` or `develop`.

```bash
git fetch origin <base>
```

Then fast-forward the local branch when it can accept the pull. When it cannot, point a dedicated
compare branch at the fetched tip:

```bash
git branch -f pr-desc/base-<base> origin/<base>
```

**Diff against the LOCAL ref, never `origin/*`.** Name that local ref in the dispatch.

```bash
git rev-list --count <local-base>..HEAD
```

Zero means the branch has nothing ahead of that base. Say so and stop.

Output: `generated/docs/pr-<slug>.md` — slug from the branch name, stripping a leading
`feat/`, `fix/`, `chore/`, or similar prefix.

The agent diffs with **no second ref and no `..`** — `git diff <local-base>` includes
uncommitted and staged work.

### Mode `version`

Ask the version identity: a single tag (`v1.2.0`) or an explicit range (`v1.1.0..v1.2.0`).
When the owner gives one tag, the range is the previous reachable tag..that tag (ask which
previous if ambiguous).

```bash
git fetch origin --tags
```

Point local refs at the fetched tips when needed:

```bash
git branch -f pr-desc/version-<slug> <resolved-tip>
```

**Diff against LOCAL refs / resolved objects, never `origin/*` alone.** Name the local
compare ends in the dispatch.

```bash
git rev-list --count <from>..<to>
```

Zero means nothing to publish. Say so and stop.

Output: `generated/docs/version-<slug>.md` — slug from the version tag, filesystem-safe
(e.g. `1.2.0` from `v1.2.0`).

The agent diffs the named range the skill resolved. Uncommitted work is out of scope for
`version` unless the owner said the tip is `HEAD` on the current checkout.

## 3 — Dispatch

`pr-desc-writer`, with:

- the mode (`pr` | `version`)
- the local compare ref(s) / range
- the document title (branch name, or version / range label)
- the output path

**No branch-compare framing in the document** (`rules/authoring.md`). Do not name which
branches or refs were compared. A version identity (`v1.2.0`, `9.0.0`) may appear. Local
compare refs stay in the dispatch and the hand-back only. Working artifacts and
`.claude/**` stay out of the document.

**Mode `pr` fills `.github/pull_request_template.md`** — same headings and checkbox labels,
paste-ready into a GitHub PR body. **Mode `version`** stays lean release notes (not the
template).

## Boundaries

- The description file only. No `src/`, no `test/`, no `docs/*.md`, no `.claude/`, no `prisma/`.
- Public voice — paste-ready for a GitHub PR body or Release notes. No internal ops dump.
- Never stage or commit unless the owner asks in that exchange.
- Never open or mutate a GitHub pull request or Release.

## Hand back

The file path, the mode, the compare refs, and every open question the agent could not settle
from the diff (hand-back only — not a document section).

## Next

Nothing. This skill runs on its own, at the end.

**It is deliberately not chained.** It fetches from `origin` and moves a local ref — every other
skill keeps git read-only. Running it inside a chain means the diff also carries whatever the
previous step left uncommitted, and the document then describes work that is still moving.

Run it when the branch or release set is settled, and run nothing after it.
