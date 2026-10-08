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

A sentence that seems to belong in two files is two sentences. A rule may carry the one clause of rationale needed to apply it; a document carries no obligation.

## Final state only

`docs/*.md`, the root people files, `.github/**`, `AGENTS.md`, and `.claude/**` describe how the project works now. Not in any of them: an issue, a bug, a fix, a change, a decision and its reasoning, a rejected alternative, a migration note, a date, a version, a changelog line, an owner quote or attribution. Attribution has one home: the root `README.md` `## Contributors` section names each contributor with a link and the feature contributed. The test: would this sentence exist if the thing had always been this way? "previously", "no longer", "instead of", and "rather than" are banned where they contrast with an earlier state and fine where they contrast two options a reader is choosing between now. A negation that states a contract stays (`an admin route carries no workspace guard`); a negation that rebuts a former state goes (`the count is not stored on the model`). Rewrite it as what is (`activeSessionCount is computed per read`).

## Documentation prose

Binds `docs/*.md`, the root people files, `.github/` markdown, and PR and version text, all public paste-ready prose. In `.github/` YAML, `writer` repairs stale facts only; a workflow or `dependabot.yml` a change moves or a plan task lists is `coder`'s run surface (`rules/layering.md`). A small correction keeps the page's existing section structure.

- A paragraph, a list item, and a table row are each one line with no hard wrap; Prettier (`proseWrap: never`, `.prettierrc`) reflows `.md` on commit through `lint-staged` and on each edit through `.claude/hooks/format.sh`.
- A fact or an obligation is indicative (`the keys match`, not `keys must match`); a procedure step is imperative.
- Bullets first; one paragraph, one idea. An entry stating several separate facts (the rules of a config, the steps of a procedure, the fields of a payload) is a list, one fact per item, numbered when order matters, related items under a sub-heading or nested bullets. No paragraph strings separate facts together with "and" or semicolons.
- No `.claude/`, no rule cited by path, no working artifact (`.superpowers/`, `generated/docs/`, `.claude/worktrees/`), no local-only git ref, absolute path, or branch-compare framing (`main`, `development`, `origin/*`, "against base"). The released version, `generated/swagger.json`, and `generated/vault/` may appear. `CONTRIBUTING.md` names its branch flow (`development`, `main`) and the `upstream` remote.
- No em-dash (write a period, comma, colon, or parentheses), filler, rhetorical question, synonym stacking.
- A colon joins a label to its description, never `-` or a semicolon; a link list item is `[Title][ref]: description`.
- A flow, a stack, or a hand-off is a mermaid diagram (`flowchart`, `sequenceDiagram`, `stateDiagram-v2`).
- A designed diagram exists only where the owner asked for one: HTML source and SVG export together under `docs/assets/`, kebab-case names; the page embeds the SVG as a markdown image, alt text saying what it shows.

## Harness files

`.claude/**`, `AGENTS.md`, and `copilot-instructions.md` address the model: imperative, present tense, short sentences, bullets for parallel items, tables only for real lookups, no ALL-CAPS emphasis. A paragraph, a list item, and a table row are each one line with no hard wrap; Prettier (`proseWrap: never`, `.prettierrc`) reflows `.md` on commit through `lint-staged` and on each edit through `.claude/hooks/format.sh`. A `file:line` pointer replaces a snippet unless the snippet is the convention. A census count, version number, or port list points at the file holding it. Anything ESLint, Prettier, `tsc`, commitlint, `engines`, or a hook enforces is not a rule; a lint-enforceable rule is one line plus an entry under `rules/code-style.md` "Move to ESLint". Verify each path, command, and flag in the checkout before writing it. `copilot-instructions.md` states nothing the rules do not. Name `.superpowers/`, `generated/docs/`, and `.claude/worktrees/` only as locations a workflow writes or reads; never as the source of a rule or a project fact.

Budgets are words, measured by `wc -w` on the whole file, frontmatter included: `.claude/CLAUDE.md` ≤ 1400; `AGENTS.md` ≤ 700; `copilot-instructions.md` ≤ 450; a rule ≤ 900; an agent file ≤ 900; a `SKILL.md` ≤ 1300 (long material in `references/`); a reference file ≤ 1000. Every rule but the four unscoped ones opens with a YAML-list `paths:`. A `SKILL.md` and an agent `.md` open with frontmatter holding a folded `description: >-`: a plain scalar with `: ` does not parse, and `.claude/hooks/roster.sh` reads the folded form.

## Language

Every artifact is English: code, comments, commit messages, `docs/*.md`, `.claude/**`, `.superpowers/**`, PR and version text, trigger phrases and examples inside `.claude/**`. Reply language is `.claude/CLAUDE.md`.
