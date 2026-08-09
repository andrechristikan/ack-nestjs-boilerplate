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

- **Minimal comments** — default zero. Types, names, and structure are the contract.
- **Every comment states FINAL STATE only (HARD).** This governs JSDoc and inline comments alike. A comment describes what the symbol or statement IS or DOES right now, present tense, as if it had always been that way. It never narrates history ("moved from X", "corrected 2026-08-05", "was Y, now Z"), never records a decision ("chosen over X because Y", "no verifyTwoFactor here because it would overwrite", "owner decided to merge/split"), never defends a rule, and never carries changelog or plan notes. A comment that stops making sense the moment something else in the codebase changes is written wrong, regardless of whether it happens to be accurate today. Deprecation is the one exception, and only when the symbol itself carries an explicit deprecation signal (a real `@deprecated` marker or equivalent) — never prose speculating that something might be going away.
- **`@note` is BANNED (HARD).** `// @note:` is not a form this codebase has. It is not "rare", it is gone. Delete every occurrence on sight; do not preserve, reword, or relocate one. Anything that genuinely has to be written down goes in JSDoc.
- **JSDoc is where a written explanation belongs.** Prefer it over an inline comment whenever the subject is a whole symbol.
  - **Optional one-line class JSDoc** when the class name alone does not say what the Nest provider/command is for.
  - **Method JSDoc is the exception, not the habit.** A service, repository, controller, seed `seed()`/`remove()`, guard, pipe, or processor method normally carries none. One line is permitted only when a caller cannot see the behaviour from the signature and getting it wrong breaks something — and it still states what the method DOES, never why it was written that way.
  - **No JSDoc on interfaces**, including per-field comments.
  - **Banned tags on any JSDoc that exists:** `@example` `@param` `@returns` `@template` `@throws` `@private` `@export` `@class` `@implements` `@constraint` `@remarks`.
- **Inline `//` comments are allowed but VERY RARE (HARD).** Reserved for something a reader cannot see from the code at that exact statement and that causes real damage when missed. Zero per file is the normal count; more than one in a file is a smell. It sits on the statement it describes, never on the line above a method or class declaration — that position is symbol-level commentary and belongs in JSDoc. No trailing comments to the right of code.
- **The test:** finish "…otherwise". If it ends in a concrete breakage that the code itself does not show, it may stay. If it ends in "…because that is allowed", or it explains a choice rather than a behaviour, leave it out.
- **`TODO` / `FIXME` are work markers, not explanations.** They are allowed, name outstanding work, and are exempt from the final-state rule because they describe what is missing. `NOTE` / `XXX` / `HACK` are not used.
- **Re-test every comment AFTER a change lands.** Delete the ones whose subject the change removed.
