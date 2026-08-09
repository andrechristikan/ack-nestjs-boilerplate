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

## Private methods sit above public ones

Inside a class, every `private` method is declared ABOVE the public methods, directly under the constructor. A reader meets the helpers before the code that calls them, and the public surface of the class stays in one uninterrupted block instead of being cut apart by helpers.

This is a layout rule, not a visibility rule — it does not change what is private.

## Comments

- **Minimal comments** — default zero, only a critical WHY.
- **No method JSDoc on internal code (HARD).** A service, repository, controller, seed `seed()`/`remove()`, guard, pipe, or processor method carries no JSDoc — types, names, and tests are the contract. JSDoc is fine on a published library's public API; this is an internal boilerplate, so almost everything is internal.
- **Optional one-line class JSDoc** only when the class name alone does not say what the Nest provider/command is for (live seed classes and some modules do this). Never required. Never method-level to "match" a class comment.
- **JSDoc content states final state only (HARD).** Whatever JSDoc exists — the optional class JSDoc above, or any genuinely permitted case — describes what the symbol IS or DOES right now, present tense, as if it had always been that way. It never narrates history ("moved from X", "corrected 2026-08-05", "was Y, now Z"), a decision ("chosen over X because Y", "owner decided to merge/split"), or a cross-cutting relationship that is really explaining a wiring choice rather than the symbol's own definition ("X also serves Y's endpoint, injected from Z" describes a decision about X, not what X is). A JSDoc that stops making sense the moment something else in the codebase changes is written wrong, regardless of whether it happens to be accurate today. Deprecation is the one exception, and only when the symbol itself carries an explicit deprecation signal (a real `@deprecated` marker or equivalent) — never prose speculating that something might be going away.
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
- **A note sits where the hazardous EDIT happens**, not where the value is declared — inside
  the body, on the statement that breaks, and NEVER on the line above a method or class
  declaration. A comment in that position is method- or class-level commentary, which the
  JSDoc rules above already govern (method: forbidden; class: at most one line).
- **The test:** finish "…otherwise". If it ends in a concrete breakage, it may stay. If it
  ends in "…because that is allowed", leave it out.
- **Format:** `// @note: <reason>` exclusively, short and single-line (~80 chars). A bare `//` narration is not a form this codebase has. No trailing comments to the right of code.
- **Preserve** existing rule-compliant `TODO` / `NOTE` / `@note` / `FIXME` / `XXX` / `HACK`
  verbatim when still true; delete banned notes, do not preserve them.
