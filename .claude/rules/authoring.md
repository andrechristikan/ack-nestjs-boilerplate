---
paths:
  - "docs/**"
  - ".claude/**"
  - ".github/**"
  - "AGENTS.md"
  - "README.md"
  - "SECURITY.md"
  - "CONTRIBUTING.md"
  - "CODE_OF_CONDUCT.md"
---

# Authoring

## Where a sentence lives

| It says | It goes to |
|---|---|
| what code must or must not do | `.claude/rules/` |
| an agent's role, scope, tools, limits, or working habits | `.claude/agents/` |
| the ordered steps of one job | `.claude/skills/` |
| project facts every tool needs: stack, layout, commands, gates | `AGENTS.md` |
| Claude-only orientation: skills, agents, gotchas, etiquette | `.claude/CLAUDE.md` |
| what Copilot needs beyond `AGENTS.md` | `.github/copilot-instructions.md` |
| a deterministic block or check | a hook in `.claude/settings.json` |
| how a feature works, for people | `docs/*.md` |

A sentence that seems to belong in two files is two sentences. A rule may carry the one clause of rationale
needed to apply it; a document carries no obligation.

## Final state only

`docs/*.md`, the root people files, `.github/**`, `AGENTS.md`, and `.claude/**` describe how the project works
now. Not in any of them: an issue, a bug, a fix, a change, a decision and its reasoning, a rejected
alternative, a migration note, a date, a version, a changelog line, an owner quote or attribution. The test:
would this sentence exist if the thing had always been this way? "previously", "no longer", "instead of", and
"rather than" are banned where they contrast with an earlier state and fine where they contrast two options a
reader is choosing between now. A negation that states a contract stays (`an admin route carries no workspace
guard`); a negation that rebuts a former state goes (`the count is not stored on the model`). Rewrite it as
what is (`activeSessionCount is computed per read`).

## Documentation prose

Binds `docs/*.md`, the root people files, and `.github/` markdown; YAML under `.github/` is repaired for stale
facts, not rewritten as prose.

- Indicative mood. An obligation becomes a fact: `all three paths produce the same idempotency key`, not
  `all paths have to produce identical keys`.
- No `.claude/`, no rule cited by path, no working artifact (`.superpowers/`, `generated/`, `graphify-out/`,
  `.claude/worktrees/`), no local-only git ref, no absolute filesystem path, no branch-compare framing
  (`main`, `development`, `origin/*`, "against base"). A version identity the release is about may appear.
- No em-dash; use a period, comma, semicolon, colon, or parentheses. No filler, no rhetorical question, no
  synonym stacking. Bullets first; keep the existing section structure on a small correction.
- A flow, a stack, or a hand-off is a mermaid diagram (`flowchart`, `sequenceDiagram`, `stateDiagram-v2`).

A PR description fills `.github/pull_request_template.md`; a version description is lean release notes. Both
are public paste-ready prose under the same bans.

## Harness files

`.claude/**`, `AGENTS.md`, and `copilot-instructions.md` are written for the model: imperative, present tense,
short sentences, bullets for parallel items, tables only for real lookups, no ALL-CAPS emphasis. A `file:line`
pointer instead of a pasted snippet unless the snippet is the convention. No census counts, version numbers,
or port lists that live in a file; point at the file. Anything ESLint, Prettier, `tsc`, commitlint, `engines`,
or a hook enforces is not a rule; a lint-enforceable line the linter does not yet cover is one line plus an
entry under "Move to ESLint" in `rules/code-style.md`. Verify every path, command, and flag against the
checkout before writing it. `copilot-instructions.md` states nothing the rules do not.

Budgets: `.claude/CLAUDE.md` ≤ 120 lines; `AGENTS.md` ≤ 80; `copilot-instructions.md` ≤ 60; a rule ≤ 80; an
agent body ≤ 60 after frontmatter; a workflow `SKILL.md` ≤ 150 (long material in `references/`); a knowledge one ≤ 120.

A rule file opens with `paths:` as a YAML list unless it is one of the four unscoped ones. A skill's
`SKILL.md` and an agent's `.md` open with YAML frontmatter whose `description` is a folded block scalar
(`description: >-`); a plain scalar containing `: ` does not parse, and `.claude/hooks/roster.sh` reads the
folded form.

## Language

Every artifact is English: code, comments, commit messages, `docs/*.md`, `.claude/**`, `.superpowers/**`, PR
and version text, trigger phrases and examples inside `.claude/**`. Reply language is `.claude/CLAUDE.md`.
