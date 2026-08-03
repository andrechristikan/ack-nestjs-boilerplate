# Authoring — where a sentence lives

The four-tree map and the placement test are in `.claude/CLAUDE.md` → "Where a sentence
lives". What follows here is the rationale and mechanics for writing INSIDE those trees
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
may be Bahasa Indonesia; artifacts are never mixed. When recording something the owner
said, PARAPHRASE it in English; do not paste the original-language quote for provenance.
The date and the "owner decision" attribution carry the provenance.

Trigger phrases and examples inside `.claude/**` stay in English too. Routing still matches
other languages semantically, so English examples cost nothing.

## Comments

- **Minimal comments** — default zero, only a critical WHY.
- **No method JSDoc on internal code (HARD).** A service, repository, controller, seed `seed()`/`remove()`, guard, pipe, or processor method carries no JSDoc — types, names, and tests are the contract. JSDoc is fine on a published library's public API; this is an internal boilerplate, so almost everything is internal.
- **Optional one-line class JSDoc** only when the class name alone does not say what the Nest provider/command is for (live seed classes and some modules do this). Never required. Never method-level to "match" a class comment.
- **Banned JSDoc tags on any JSDoc that does exist:** `@example` `@param` `@returns` `@template` `@throws` `@private` `@export` `@class` `@implements` `@constraint` `@remarks`.
- **No JSDoc on interfaces** (including per-field comments).
- **`@note` is VERY RARE (HARD).** It exists for exactly two things:
  1. **A decision between two viable paths, naming what the other path costs.**
  2. **The hazard of the edit the next reader is about to make** — what BREAKS when they
     do the obvious thing.
  Both name a CONSEQUENCE. Zero per file is the normal count.
- **`@note` is NEVER a justification (HARD).** Banned: rule-defense, restating a rule file,
  narration of WHAT, changelog or plan notes. Delete on sight.
- **Re-test the note AFTER the change lands.** Delete notes whose subject the change itself
  removed.
- **A note sits where the hazardous EDIT happens**, not where the value is declared.
- **The test:** finish "…otherwise". If it ends in a concrete breakage, it may stay. If it
  ends in "…because that is allowed", leave it out.
- **Format:** `// @note: <reason>` exclusively, short and single-line (~80 chars). A bare `//` narration is not a form this codebase has. No trailing comments to the right of code.
- **Preserve** existing rule-compliant `TODO` / `NOTE` / `@note` / `FIXME` / `XXX` / `HACK`
  verbatim when still true; delete banned notes, do not preserve them.
