# Comments

One policy for the whole codebase. Do not invent a second one anywhere else.

## Minimal by default

**Default zero comments.** Types, names, and structure are the contract. A comment is a
liability that nothing type-checks.

## Every comment states FINAL STATE only (HARD)

This governs JSDoc and inline comments alike. A comment describes what the symbol or statement
IS or DOES right now, present tense, as if it had always been that way.

It never narrates history ("moved from X", "corrected 2026-08-05", "was Y, now Z"), never
records a decision ("chosen over X because Y", "no verifyTwoFactor here because it would
overwrite", "owner decided to merge/split"), never defends a rule, and never carries changelog
or plan notes.

**A comment that stops making sense the moment something else in the codebase changes is
written wrong**, regardless of whether it happens to be accurate today.

Deprecation is the one exception, and only when the symbol itself carries an explicit
deprecation signal (a real `@deprecated` marker or equivalent) — never prose speculating that
something might be going away.

## `@note` is BANNED (HARD)

`// @note:` is not a form this codebase has. It is not "rare", it is gone. Delete every
occurrence on sight; do not preserve, reword, or relocate one. Anything that genuinely has to
be written down goes in JSDoc.

## JSDoc

JSDoc is where a written explanation belongs. Prefer it over an inline comment whenever the
subject is a whole symbol.

- **Optional one-line class JSDoc** when the class name alone does not say what the Nest
  provider or command is for.
- **Method JSDoc is the exception, not the habit.** A service, repository, controller, seed
  `seed()`/`remove()`, guard, pipe, or processor method normally carries none. One line is
  permitted only when a caller cannot see the behaviour from the signature and getting it
  wrong breaks something — and it still states what the method DOES, never why it was written
  that way.
- **No JSDoc on interfaces**, including per-field comments.
- **Banned tags on any JSDoc that exists:** `@example` `@param` `@returns` `@template`
  `@throws` `@private` `@export` `@class` `@implements` `@constraint` `@remarks`.

## Inline `//` comments are allowed but VERY RARE (HARD)

Reserved for something a reader cannot see from the code at that exact statement and that
causes real damage when missed. Zero per file is the normal count; more than one in a file is
a smell.

It sits on the statement it describes, never on the line above a method or class declaration —
that position is symbol-level commentary and belongs in JSDoc. **No trailing comments to the
right of code.**

## The test

Finish "…otherwise". If it ends in a concrete breakage that the code itself does not show, it
may stay. If it ends in "…because that is allowed", or it explains a choice rather than a
behaviour, leave it out.

## Work markers

`TODO` and `FIXME` are work markers, not explanations. They are allowed, name outstanding
work, and are exempt from the final-state rule because they describe what is missing. `NOTE`,
`XXX` and `HACK` are not used.

## After a change lands

Re-test every comment the change touched. Delete the ones whose subject the change removed.
Preserve an existing rule-compliant comment during a refactor; delete it only when its subject
is gone.
