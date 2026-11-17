---
paths:
    - '.claude/**'
    - 'AGENTS.md'
    - '.github/copilot-instructions.md'
---

# Harness files

Where a sentence lives, final state only, and language: `authoring.md`.

`.claude/**` but `.claude/decisions/` (`authoring.md`, Documentation prose and Decisions), `AGENTS.md`, and `copilot-instructions.md` address the model: imperative, present tense, short sentences, bullets for parallel items, tables only for real lookups, no ALL-CAPS emphasis, one line per paragraph (`authoring.md`, Documentation prose). The copied skills (the folders `skills-lock.json` names) are third-party text: nothing here binds them and nothing edits them. A `file:line` pointer replaces a snippet unless the snippet is the convention. A census count, version number, or port list points at the file holding it. Anything ESLint, Prettier, `tsc`, commitlint, `engines`, or a hook enforces is not a rule; a lint-enforceable rule is one line plus an entry under `rules/eslint.md` "Move to ESLint". Verify each path, command, and flag in the checkout before writing it. `copilot-instructions.md` states nothing the rules do not. Name `.scratch/`, `generated/report-src-sweep.md`, and `.claude/worktrees/` only as locations a workflow writes or reads; never as the source of a rule or a project fact.

Budgets are words, measured by `wc -w` on the whole file, frontmatter included: `.claude/CLAUDE.md` ≤ 1000; `AGENTS.md` ≤ 700; `copilot-instructions.md` ≤ 450; a rule ≤ 1000; an agent file ≤ 900; a `SKILL.md` ≤ 1300 (long material in `references/`); a reference file ≤ 1000. Every rule but the five unscoped ones opens with a YAML-list `paths:`. A `SKILL.md` and an agent `.md` open with frontmatter holding a folded `description: >-`: a plain scalar with `: ` does not parse. `.claude/hooks/roster.sh` prints a `SKILL.md`'s quoted one-line `blurb:`, else the first sentence of `description`.

## Copied skills

- They are never edited (`guard-write.sh` denies it). An `ack-*` skill or an agent follows one by path or preloads it, and states its departures.
- Where a copied skill and a rule, an `ack-*` skill, or an agent file differ, the copied skill loses.
- `pnpm skills:update` updates them; `/ack-harness` then re-reads each departure.

## Levels

- `coder` runs on sonnet at an effort set per ticket by `/ack-plan` and per fix by `/ack-review`. TypeSafe's Jev is optional there, through `bash .claude/hooks/jev.sh level`, never as a hook.
- Without `TYPESAFE_API_KEY` in `.env.harness`, or with `JEV_ROUTER_ENABLED=false`, it prints `off`; a failed call prints `unavailable`; the `/ack-plan` table then gives the effort.
