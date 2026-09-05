# Authoring — where a sentence lives

The tree-by-tree placement map is in `.claude/skills/ack-claude-config/SKILL.md` → "Where a
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

**Binds `docs/*.md` AND `.claude/**` alike.** Both trees describe how the project works NOW,
and nothing else.

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
PR description, and in the issue tracker.

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

`docs/` is written in the indicative. Rewrite an obligation as a fact plus a pointer.

- Wrong: `All paths MUST produce identical idempotency keys.`
- Right: `All three paths produce the same idempotency key, which is what dedupes them. The
  constraint when changing this: rules/queue.md.`

Verification aid, not an oracle:

    grep -nE '\b(MUST|NEVER|FORBIDDEN|ALWAYS)\b' docs/*.md

Two false-positive classes are excluded by READING, not by pattern: enum member names in
tables (`ABILITY_FORBIDDEN`, `NOT_FOUND`), and identifiers inside code fences. The
criterion is "no obligation SENTENCE in `docs/` prose".

## Language

Every artifact is written in ENGLISH — code, identifiers, comments, commit messages,
`docs/*.md`, `.claude/**`, `.superpowers/**`, PR descriptions. Conversation with the owner
may be Bahasa Indonesia; artifacts are never mixed. Something the owner said reaches an
artifact only as the RULE or the FACT it produced, in English — never as a quote, never with
a date, and never attributed. "Final state only" governs that: an artifact carries what is
true, not who decided it or when.

Trigger phrases and examples inside `.claude/**` stay in English too. Routing still matches
other languages semantically, so English examples cost nothing.

## Documentation prose (`docs/*.md`)

- **No em-dash (`—`) in documentation prose.** Use a period, comma, semicolon, colon, or
  parentheses. Plain hyphens in compound words (`dev-mode`, `in-memory`) are fine; do not
  overuse them. The one exception is an existing structured list whose every entry already uses
  `—` as a separator: match it rather than breaking the pattern on one line.
- Simple, firm, and pointed. Bullets first, prose where prose is needed. Keep the existing
  section structure intact rather than reorganizing around a small correction.

## What is NOT here

Comment policy is `rules/comments.md`. Class member layout is `rules/code-style.md`. Neither
is restated here.
