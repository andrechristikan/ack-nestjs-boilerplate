# Authoring — where a sentence lives

The tree-by-tree placement map is in `.claude/agents/harness-writer.md` → "Where a
sentence lives". What follows here is the rationale and mechanics for writing INSIDE those trees
correctly, not the placement decision itself.

## The asymmetry (HARD)

**A rule MAY carry the minimum rationale needed to apply it correctly. A document MUST NOT
carry an obligation.**

This is deliberate and not symmetric. Rationale inside a rule prevents cargo-cult use: `rules/security.md` requires session invalidation after a password or role
change, and the reason — an open session still holds the old privilege — must travel with
the rule or it gets applied as a style preference. An obligation inside a document carries
nothing: the model does not read `docs/` by default, and a human reading it is not writing
code at that moment.

What does NOT move down into a rule: flow narrative, long code samples, catalogs. Those
are `docs/`.

## Final state only (HARD)

**Binds `docs/*.md`, the root people files (`README.md`, `SECURITY.md`, `CONTRIBUTING.md`,
`CODE_OF_CONDUCT.md`), `.github/**` except `copilot-instructions.md`, AND `.claude/**`
alike.** Those trees describe how the project works
NOW, and nothing else.

Never written in either tree: an issue, a bug, a bug fix, a defect that was repaired, a change,
a decision and its reasoning, a rejected alternative, a migration note, a date, a version, or a
changelog line.

**The ban is on comparing against a FORMER STATE, not on a vocabulary.** "previously", "used
to", "no longer", "now", "instead of" and "rather than" are banned where they contrast this
version of the system with an earlier one, and perfectly correct where they contrast two
options a reader is choosing between right now: `a repository is injected as a class rather
than behind a token` is a rule doing its job; `the repository is no longer injected behind a
token` is a changelog line. Grep finds the word; only reading finds the violation.

**The test:** would this sentence exist if the thing had ALWAYS been this way? If it only makes
sense because something used to be different, it is history. History lives in `git log`, in the
PR or version description, and in the issue tracker.

### The negation trap

A sentence phrased as a fact can still be history. This is the form that survives every other
check, so it gets its own test.

- A negation that states a **CONTRACT** is a fact, and it stays. It tells the reader what to
  send, what to expect, or what a guard will not do: `the refresh request carries no
  fingerprint`; `an admin route carries no workspace guard`; `the cursor payload carries no
  query`.
- A negation that **REBUTS a former state or a corrected claim** is history wearing a fact's
  clothes, and it goes: `there is no explicit $transaction wrapper around it`; `the session
  count is not stored on the model`; `derived from platform, whether or not a token came with
  the request`; `both paths pass the same action, so only createdBy differs`.

The difference is who the sentence serves. The first serves a reader building against the
system. The second serves only a reader who remembers what it used to say — and that reader
should be reading the diff.

**Rewrite, do not delete the information.** `the session count is not stored on the model`
becomes `activeSessionCount is computed per read by a _count on sessions`. State what IS, drop
the contrast.

## Mood

`docs/` is written in the indicative. Rewrite an obligation as a fact. Do not point at a
rule file.

- Wrong: `All paths MUST produce identical idempotency keys.`
- Right: `All three paths produce the same idempotency key, which is what dedupes them.`

Verification aid, not an oracle:

    grep -nE '\b(MUST|NEVER|FORBIDDEN|ALWAYS)\b' docs/*.md README.md SECURITY.md CONTRIBUTING.md CODE_OF_CONDUCT.md .github/pull_request_template.md

Two false-positive classes are excluded by READING, not by pattern: enum member names in
tables (`ABILITY_FORBIDDEN`, `NOT_FOUND`), and identifiers inside code fences. The
criterion is "no obligation SENTENCE in documentation prose".

## No harness paths in documentation (HARD)

**Binds `docs/*.md` and the root people files (`README.md`, `SECURITY.md`, `CONTRIBUTING.md`,
`CODE_OF_CONDUCT.md`).** Never mention `.claude/`, `claude/`, or any path under the harness
tree. Never cite a rule by path either (`rules/http.md`, `rules/dto.md`, and the same
shape with or without a leading `.claude/`). A constraint that lives in a rule is stated as a
fact in the document; the rule path is never cited. Agents load rules through
`orientation.md`; humans reading these files do not need that map.

Verification aid:

    grep -nE '\.claude|/claude/|`rules/[a-z0-9-]+\.md`|Constraint when changing|The constraint when' docs/*.md README.md SECURITY.md CONTRIBUTING.md CODE_OF_CONDUCT.md

## Language

Every artifact is written in ENGLISH — code, identifiers, comments, commit messages,
`docs/*.md`, `.claude/**`, `.superpowers/**`, PR and version descriptions. Reply language to
the owner
is `CLAUDE.md` → How to work here: English by default, match the language of the turn.
Something the owner said reaches an artifact only as the RULE or the FACT it produced, in
English — never as a quote, never with a date, and never attributed. "Final state only"
governs that: an artifact carries what is true, not who decided it or when.

Trigger phrases and examples inside `.claude/**` stay in English too. Routing still matches
other languages semantically, so English examples cost nothing.

## Working artifacts stay out of published trees (HARD)

A working artifact exists to run a session. It is not the product.

Working artifacts and machine-only paths:

- `.superpowers/` specs and plans
- `generated/` reports and description documents (the file being written is the output, not a source)
- `graphify-out/`
- `.claude/worktrees/` and `.worktrees/`
- local-only git refs (`pr-desc/*`)
- absolute filesystem paths

A tree may be named as a destination: where a spec is written, where a PR or version
description is written, what gitignores. A specific file, ref, or path from those trees is
never cited as a source.

This binds every published tree:

| Tree | What it publishes |
|---|---|
| `docs/*.md`, the root people files, `.github/**` except `copilot-instructions.md` | the product |
| `.claude/**` | how the project works |
| `generated/docs/pr-*.md` | filled `.github/pull_request_template.md` (public PR body) |
| `generated/docs/version-*.md` | a version or tag range (public release description) |

A PR description follows the project pull-request template (same sections and checkbox
labels). A version description is lean release notes. Both are public paste-ready prose.
They never cite `.claude/**`, working artifacts, machine paths, or local-only git refs.
A `.claude/**` path in the diff is one line in the hand-back.

**No branch-compare framing in the document body (HARD).** Do not name which git branches
or refs were compared (`main`, `develop`, `development`, `origin/*`, `pr-desc/*`,
"merge into", "against base", and similar). A version identity the release is about
(`v1.2.0`, `9.0.0`) may appear. Compare refs stay in the hand-back only.

## Documentation prose (`docs/*.md`, root people files, `.github/` markdown)

Binds `docs/*.md`, the root `README.md`, `SECURITY.md`, `CONTRIBUTING.md`,
`CODE_OF_CONDUCT.md`, and `.github/pull_request_template.md`.

YAML under `.github/` is not documentation prose. A claim there is still a fact about the
checkout — a script name, an `engines` range, a path, a URL — and it is repaired when it is
stale. Workflow logic is not rewritten as prose.

- **No em-dash (`—`) in documentation prose.** Use a period, comma, semicolon, colon, or
  parentheses. Plain hyphens in compound words (`dev-mode`, `in-memory`) are fine; do not
  overuse them. The one exception is an existing structured list whose every entry already uses
  `—` as a separator: match it rather than breaking the pattern on one line.
- Simple, firm, and pointed. Bullets first, prose where prose is needed. Keep the existing
  section structure intact rather than reorganizing around a small correction.
- **No filler.** No throat-clearing (`it is important to note`, `in order to`, `this ensures
  that`), no rhetorical questions, no synonym stacking. Name the thing and state what it does.
- **A flow, a stack, or a hand-off is a mermaid diagram.** Prefer `flowchart`,
  `sequenceDiagram`, or `stateDiagram-v2`. Do not invent a second diagram syntax.

## What is NOT here

Comment policy and class member layout are `rules/code-style.md`. Neither is restated here.

## Frontmatter

A skill's `SKILL.md` and an agent's `.md` open with YAML frontmatter, and its `description` is
a folded block scalar, whatever the text:

```yaml
---
name: coder
description: >-
    Writes feature code under src/** against the project rules, test-first. …
---
```

A plain scalar containing `: ` does not parse under a strict YAML parser, and a skill or agent
whose frontmatter does not parse has no name and no description for the loader. The
`SessionStart` hook (`.claude/hooks/session-skills.sh`) reads the folded form.
