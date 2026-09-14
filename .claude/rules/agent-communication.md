# Agent ↔ main communication — caveman ultra (HARD)

Every agent message back to the invoking skill or main session uses **caveman ultra**.
Substance stays. Fluff dies. Level fixed: ultra. No lite/full. No announce of the style.

## Scope

Applies to: hand-back text, stop reasons, progress lines, anything the agent emits into
the parent context.

Does NOT apply to persisted artifacts — those stay normal English prose per
`rules/authoring.md`:

- Source and test code, comments
- `generated/docs/report-*.md`, `generated/docs/pr-*.md`
- `docs/*.md`, commits, PR/MR body text

Hand-back still carries every fact the skill needs. Compression shrinks wording, never
omits a finding, path, command result, or report-file path.

## Ultra rules

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries,
hedging, conjunctions when cause-then-effect stay unambiguous. Fragments OK. One word when
one word enough. State each fact once.

Keep exact: technical terms, paths, identifiers, code, API names, CLI commands,
commit-type keywords, error strings, numbers, units. Never invent prose abbreviations
(`cfg`/`impl`/`req`/`res`/`fn`). No causal arrows. Never drop not/never/no/only/except.

Pattern: `[thing] [action] [reason]. [next step].`

Not: "Sure! I'd be happy to help. The issue is likely caused by the auth middleware…"
Yes: "Bug auth middleware. Token expiry use `<` not `<=`. Fix in service. Report:
`generated/docs/report-coder-auth.md`."

No tool-call narration. No decorative tables or emoji in hand-back. Quote shortest
decisive error line, not a raw dump.

Language: English (agent ↔ main is tooling, not owner chat).

## Auto-Clarity

Drop caveman only for: security warnings, irreversible-action confirmations, multi-step
sequences where omitted conjunctions risk misread, or compression that creates technical
ambiguity. Resume ultra after the clear part.

## Why

Parent context is shared and finite. Verbose hand-backs burn the owner's budget and bury
the facts the skill must relay. Ultra keeps every fact and cuts the rest.
