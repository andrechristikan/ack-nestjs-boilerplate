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
| how a feature works, for people | `docs/**/*.md` |
| how the AI harness works, for people | `docs/*/ai-harness.md` |
| why a plausible alternative to a rule was rejected | `.claude/decisions/` |

A sentence that seems to belong in two files is two sentences. A rule may carry the one clause of rationale needed to apply it; a document carries no obligation.

## Final state only

`docs/**/*.md`, the root people files, `.github/**`, `AGENTS.md`, and `.claude/**` describe how the project works now. Not in any of them: an issue, a bug, a fix, a change, a decision and its reasoning, a rejected alternative, a migration note, a date, the version a change landed in, a changelog line, an owner quote or attribution. The list binds every tree but `.claude/decisions/`, which carries a rejected alternative and its reasoning, nothing else. Attribution has one home, `contributors.md`: each contributor with a link and the feature contributed; no other page thanks or credits a project contributor; a third-party license notice stays. The test: would this sentence exist if the thing had always been this way? "previously", "no longer", "instead of", and "rather than" are banned where they contrast with an earlier state and fine where they contrast two options a reader is choosing between now. A negation that states a contract stays (`an admin route carries no workspace guard`); a negation that rebuts a former state goes (`the count is not stored on the model`). Rewrite it as what is (`activeSessionCount is computed per read`).

## Documentation prose

Binds `docs/**/*.md`, `.claude/decisions/*.md`, the root people files, `.github/` markdown, and PR and version text, all public paste-ready prose. A small correction keeps the page's existing section structure.

- A paragraph, a list item, and a table row are each one line with no hard wrap.
- A fact or an obligation is indicative (`the keys match`, not `keys must match`); a procedure step is imperative.
- Bullets first; one paragraph, one idea. An entry stating several separate facts is a list, one fact per item, numbered when order matters.
- No working artifact (`.scratch/`, `generated/report-src-sweep.md`, `.claude/worktrees/`), no local-only git ref, absolute path, or branch-compare framing (`main`, `development`, `origin/*`, "against base"). `docs/*/ai-harness.md` may name `.scratch/`. The released version, `generated/swagger.json`, and `generated/vault/` may appear. `CONTRIBUTING.md` names its branch flow (`development`, `main`) and the `upstream` remote.
- A version is `major.minor.x+`, a pin included (Node `26.13.x+`, pnpm `12.5.x+`, Redis `6.2.x+`); the patch number is never written. The `SECURITY.md` supported-version line alone is `<major>.<minor>.x`, from `package.json` `version`.
- No em-dash (write a period, comma, colon, or parentheses), filler, rhetorical question, synonym stacking.
- A colon joins a label to its description, never `-` or a semicolon; a link list item is `[Title][ref]: description`.
- `docs/` explains using the project; production (hosting, TLS between hosts, release, CI/CD, cloud setup, Vault as a network service, several instances) is in `production.md` only.
- No page lists endpoints: Swagger is the list.
- A topic has one home page, its `concepts/` page unless the `/ack-doc` scope names another; another page links its section in one sentence.
- A concept page carries one high-level mermaid diagram, in Overview: its boxes are modules or components, never methods. Another page carries one only where its `/ack-doc` scope names it.
- A code block follows a sentence saying what it shows, and is a real command or a real excerpt from the checkout; an excerpt names its path.
- A designed diagram exists only where the owner asked for one: HTML source and SVG export together under `docs/assets/`, kebab-case names; the page embeds the SVG as a markdown image, alt text saying what it shows.

## Page types

Every page under `docs/` and root people file holds one [Diátaxis](https://diataxis.fr) type. A page sits in its type's folder, the four root pages below aside; a root people file takes no frame.

| Type | Folder | Body | Holds no |
| --- | --- | --- | --- |
| tutorial | `getting-started/` | one guided path for a newcomer: Prerequisites, numbered steps each ending in a visible result, What you have now, Next | a choice between options, a lookup table, background |
| how-to | `guides/` | one task for a reader who knows the subject: Prerequisites, numbered steps, Check the result, Related tasks | teaching, background, the full option list |
| reference | `reference/` | the facts a reader looks up (config keys, status codes, commands): one entry shape repeated, a table or one `###` per entry | steps, background |
| explanation | `concepts/` | how a part works and why its pieces fit together: Overview with the page's diagram, then one section per mechanism | steps, a lookup table |

- The root of `docs/` holds `readme.md` (reference: the index by folder), `features.md` (explanation: the entry point, and the one home of a feature summary), `contributors.md` (reference), and `production.md` (the one page holding a how-to with its reference tables); `reference/configuration.md` holds every config key with its env var.
- A file name is a noun, never a verb phrase; one subject keeps one name in every type folder (`concepts/queue.md`, `guides/queue.md`, `reference/queue.md`).

## Frame

Every page under `docs/` opens, in order:

1. Frontmatter: `title` (the `#` text) and `description`.
2. The `#` heading, then one sentence: what the page covers and who reads it.
3. `## Table of Contents`.
4. `## Related Documents`: every sibling page on the subject.
5. The body its type gives.

## Decisions

- A decision is a rule sentence first: the chosen option, and each rejected option as a prohibition, in the rule that owns the concept.
- Entries on one choice or one topic merge; none is dropped while its rule stands.
- A rule and an entry never state the same thing: the entry names the choice in its title, points at the rule, and gives reasons only.
- One file per scope, a scope as wide as `auth` or `deployment`, ten files at most, entries under `##` sub-scope headings. An entry joins the file whose scope it shares; a scope no file covers is a new file. No number, index, status, or date. `README.md` beside them lists each file and its scope.
- `/ack-harness` writes an entry, on the owner's word; `writer` does not. Shape: `.claude/skills/ack-harness/references/decision-record.md`.

## Language

Every artifact is English, spelled American: code, comments, commit messages, `docs/**/*.md`, `.claude/**`, `.scratch/**`, PR and version text.
