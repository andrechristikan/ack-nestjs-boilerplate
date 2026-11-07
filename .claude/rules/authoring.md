---
paths:
    - 'docs/**'
    - '.claude/**'
    - '.github/**'
    - 'AGENTS.md'
    - 'README.md'
    - 'SECURITY.md'
    - 'CONTRIBUTING.md'
    - 'CODE_OF_CONDUCT.md'
    - 'generated/docs/**'
---

# Authoring

## Where a sentence lives

| It says | It goes to |
| --- | --- |
| what code must or must not do | `.claude/rules/` |
| an agent's role, scope, tools, limits, or working habits | `.claude/agents/` |
| the ordered steps of one job | `.claude/skills/` |
| project facts every tool needs: stack, layout, commands, gates | `AGENTS.md` |
| Claude-only orientation: skills, agents, gotchas, etiquette | `.claude/CLAUDE.md` |
| what Copilot needs beyond `AGENTS.md` | `.github/copilot-instructions.md` |
| a deterministic block or check | a hook in `.claude/settings.json` |
| how a feature works, for people | `docs/*.md` |
| a closed product or architecture choice and the options it rejected | `docs/decisions/` |

A sentence that seems to belong in two files is two sentences. A rule may carry the one clause of rationale needed to apply it; a document carries no obligation.

## Final state only

`docs/*.md`, the root people files, `.github/**`, `AGENTS.md`, and `.claude/**` describe how the project works now. Not in any of them: an issue, a bug, a fix, a change, a decision and its reasoning, a rejected alternative, a migration note, a date, the version a change landed in, a changelog line, an owner quote or attribution. The list binds every tree but `docs/decisions/`, whose records carry a decision, its reasoning, the rejected alternatives, and a date. Attribution has one home: the root `README.md` `## Contributors` section names each contributor with a link and the feature contributed. The test: would this sentence exist if the thing had always been this way? "previously", "no longer", "instead of", and "rather than" are banned where they contrast with an earlier state and fine where they contrast two options a reader is choosing between now. A negation that states a contract stays (`an admin route carries no workspace guard`); a negation that rebuts a former state goes (`the count is not stored on the model`). Rewrite it as what is (`activeSessionCount is computed per read`).

## Documentation prose

Binds `docs/*.md`, `docs/decisions/*.md`, the root people files, `.github/` markdown, and PR and version text, all public paste-ready prose. In `.github/` YAML, `writer` repairs stale facts only; a workflow or `dependabot.yml` a change moves or a plan task lists is `coder`'s run surface (`rules/layering.md`). A small correction keeps the page's existing section structure.

- A paragraph, a list item, and a table row are each one line with no hard wrap; Prettier (`proseWrap: never`, `.prettierrc`) reflows `.md` on commit through `lint-staged` and on each edit through `.claude/hooks/format.sh`.
- A fact or an obligation is indicative (`the keys match`, not `keys must match`); a procedure step is imperative.
- Bullets first; one paragraph, one idea. An entry stating several separate facts (the rules of a config, the steps of a procedure, the fields of a payload) is a list, one fact per item, numbered when order matters, related items under a sub-heading or nested bullets. No paragraph strings separate facts together with "and" or semicolons.
- No `.claude/`, no rule cited by path, no working artifact (`.superpowers/`, `generated/docs/`, `.claude/worktrees/`), no local-only git ref, absolute path, or branch-compare framing (`main`, `development`, `origin/*`, "against base"). Only a record in `docs/decisions/` may cite a rule under `.claude/rules/`; no other page names `.claude/`. The released version, `generated/swagger.json`, and `generated/vault/` may appear. `CONTRIBUTING.md` names its branch flow (`development`, `main`) and the `upstream` remote.
- A version is `major.minor.x+`, a pin included (Node `26.13.x+`, pnpm `12.5.x+`, Redis `6.2.x+`); the patch number is never written. The `SECURITY.md` supported-version line alone is `<major>.<minor>.x`, from `package.json` `version`.
- No em-dash (write a period, comma, colon, or parentheses), filler, rhetorical question, synonym stacking.
- A colon joins a label to its description, never `-` or a semicolon; a link list item is `[Title][ref]: description`.
- A flow, a stack, or a hand-off is a mermaid diagram (`flowchart`, `sequenceDiagram`, `stateDiagram-v2`).
- A designed diagram exists only where the owner asked for one: HTML source and SVG export together under `docs/assets/`, kebab-case names; the page embeds the SVG as a markdown image, alt text saying what it shows.

## Decision records

- `docs/decisions/README.md`: the index. One line per record: `NNNN · <title> · chosen: <A> · rejected: <B>, <C>`.
- `docs/decisions/NNNN-<slug>.md`: one record in the standard ADR shape (Nygard's five sections plus MADR's considered options), under about 250 words:

```markdown
# NNNN. <title>

- Status: accepted | deprecated | superseded by NNNN
- Date: YYYY-MM-DD

## Context

<the forces in two or three sentences: what the flow or module needed, what made the choice non-obvious>

## Decision

<A>, in one or two sentences, with the module or flow it binds.

## Considered options

- <A> (chosen)
- <B>: rejected, <why, one sentence>
- <C>: rejected, <why>

## Consequences

<what a builder must do or must not do because of this; the rule or file that carries it, when one does>
```

A record with no rejected option is not a record: it is a rule, and goes to `.claude/rules/`. The index line and the `Considered options` section are what an agent reads first; the rejection reason is mandatory on every rejected option.

- `NNNN` is the next free four-digit number.
- A `proposed` status is never committed.
- The date is the day the owner accepted the decision.
- The index lists accepted records only; a deprecated or superseded record keeps its file and leaves the index.

## Harness files

`.claude/**`, `AGENTS.md`, and `copilot-instructions.md` address the model: imperative, present tense, short sentences, bullets for parallel items, tables only for real lookups, no ALL-CAPS emphasis. A paragraph, a list item, and a table row are each one line with no hard wrap; Prettier (`proseWrap: never`, `.prettierrc`) reflows `.md` on commit through `lint-staged` and on each edit through `.claude/hooks/format.sh`. A `file:line` pointer replaces a snippet unless the snippet is the convention. A census count, version number, or port list points at the file holding it. Anything ESLint, Prettier, `tsc`, commitlint, `engines`, or a hook enforces is not a rule; a lint-enforceable rule is one line plus an entry under `rules/eslint.md` "Move to ESLint". Verify each path, command, and flag in the checkout before writing it. `copilot-instructions.md` states nothing the rules do not. Name `.superpowers/`, `generated/docs/`, and `.claude/worktrees/` only as locations a workflow writes or reads; never as the source of a rule or a project fact.

Budgets are words, measured by `wc -w` on the whole file, frontmatter included: `.claude/CLAUDE.md` ≤ 1400; `AGENTS.md` ≤ 700; `copilot-instructions.md` ≤ 450; a rule ≤ 1200; an agent file ≤ 900; a `SKILL.md` ≤ 1300 (long material in `references/`); a reference file ≤ 1000. Every rule but the five unscoped ones opens with a YAML-list `paths:`. A `SKILL.md` and an agent `.md` open with frontmatter holding a folded `description: >-`: a plain scalar with `: ` does not parse. `.claude/hooks/roster.sh` prints a `SKILL.md`'s quoted one-line `blurb:`, else the first sentence of `description`.

## Language

Every artifact is English: code, comments, commit messages, `docs/*.md`, `.claude/**`, `.superpowers/**`, PR and version text, trigger phrases and examples inside `.claude/**`. Reply language is `.claude/CLAUDE.md`.
