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
    - '.scratch/pr/**'
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
| how the AI harness works, for people | `docs/ai-harness.md` |
| why a plausible alternative to a rule was rejected | `.claude/decisions/` |

A sentence that seems to belong in two files is two sentences. A rule may carry the one clause of rationale needed to apply it; a document carries no obligation. Harness voice and budgets: `harness.md`.

## Final state only

`docs/*.md`, the root people files, `.github/**`, `AGENTS.md`, and `.claude/**` describe how the project works now. Not in any of them: an issue, a bug, a fix, a change, a decision and its reasoning, a rejected alternative, a migration note, a date, the version a change landed in, a changelog line, an owner quote or attribution. The list binds every tree but `.claude/decisions/`, which carries a rejected alternative and its reasoning, nothing else. Attribution has one home: the root `README.md` `## Contributors` section names each contributor with a link and the feature contributed. The test: would this sentence exist if the thing had always been this way? "previously", "no longer", "instead of", and "rather than" are banned where they contrast with an earlier state and fine where they contrast two options a reader is choosing between now. A negation that states a contract stays (`an admin route carries no workspace guard`); a negation that rebuts a former state goes (`the count is not stored on the model`). Rewrite it as what is (`activeSessionCount is computed per read`).

## Documentation prose

Binds `docs/*.md`, `.claude/decisions/*.md`, the root people files, `.github/` markdown, and PR and version text, all public paste-ready prose. In `.github/` YAML, `writer` repairs stale facts only; a workflow or `dependabot.yml` a change moves is `coder`'s run surface (`rules/layering.md`). A small correction keeps the page's existing section structure.

- A paragraph, a list item, and a table row are each one line with no hard wrap; Prettier (`proseWrap: never`, `.prettierrc`) reflows `.md` on commit through `lint-staged` and on each edit through `.claude/hooks/format.sh`.
- A fact or an obligation is indicative (`the keys match`, not `keys must match`); a procedure step is imperative.
- Bullets first; one paragraph, one idea. An entry stating several separate facts (the rules of a config, the steps of a procedure, the fields of a payload) is a list, one fact per item, numbered when order matters, related items under a sub-heading or nested bullets. No paragraph strings separate facts together with "and" or semicolons.
- No working artifact (`.scratch/`, `generated/report-src-sweep.md`, `.claude/worktrees/`), no local-only git ref, absolute path, or branch-compare framing (`main`, `development`, `origin/*`, "against base"). `docs/ai-harness.md` describes the harness and may name `.scratch/`; other pages link to it. The released version, `generated/swagger.json`, and `generated/vault/` may appear. `CONTRIBUTING.md` names its branch flow (`development`, `main`) and the `upstream` remote.
- A version is `major.minor.x+`, a pin included (Node `26.13.x+`, pnpm `12.5.x+`, Redis `6.2.x+`); the patch number is never written. The `SECURITY.md` supported-version line alone is `<major>.<minor>.x`, from `package.json` `version`.
- No em-dash (write a period, comma, colon, or parentheses), filler, rhetorical question, synonym stacking.
- A colon joins a label to its description, never `-` or a semicolon; a link list item is `[Title][ref]: description`.
- A flow, a stack, or a hand-off is a mermaid diagram (`flowchart`, `sequenceDiagram`, `stateDiagram-v2`).
- A designed diagram exists only where the owner asked for one: HTML source and SVG export together under `docs/assets/`, kebab-case names; the page embeds the SVG as a markdown image, alt text saying what it shows.

## Decisions

- A decision is a rule sentence first: the chosen option, and each rejected option as a prohibition, in the rule that owns the concept.
- Entries on one choice or one topic merge; none is dropped while its rule stands.
- A rule and an entry never state the same thing: the entry names the choice in its title, points at the rule, and gives reasons only.
- One file per scope, a scope as wide as `auth` or `deployment`, ten files at most, entries under `##` sub-scope headings. An entry joins the file whose scope it shares; a scope no file covers is a new file. No number, index, status, or date. `README.md` beside them lists each file and its scope.
- `/ack-harness` writes an entry, on the owner's word; `writer` does not. Shape: `.claude/skills/ack-harness/references/decision-record.md`.

## Language

Every artifact is English: code, comments, commit messages, `docs/*.md`, `.claude/**`, `.scratch/**`, PR and version text, trigger phrases and examples inside `.claude/**`. Reply language is `.claude/CLAUDE.md`.
