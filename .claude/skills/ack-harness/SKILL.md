---
name: ack-harness
description: >-
  Reworks the AI configuration, .claude/** (CLAUDE.md, rules, agents, skills, hooks,
  settings), AGENTS.md, and .github/copilot-instructions.md through the harness
  agent from a settled requirement, final state only. Use when the owner wants to change
  how Claude or Copilot works in this repository. Not for src/, test/, docs/, or prisma/.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: "<settled requirement: files, the change, expected outcomes>"
---

!`git status --short`

# ack-harness

You orchestrate. `harness` writes `.claude/**`, `AGENTS.md`, and
`.github/copilot-instructions.md`; you do not edit those trees yourself, and no other agent
runs here because it would read the tree this run is rewriting. Every file produced here is
final state only: how the thing works now, with no history, decision log, "changed on",
"applies from", "previously", or rationale for a change (`.claude/rules/authoring.md`,
Final state only).

## 1. Settle, in the session

This step runs before the fork: the session asks with `AskUserQuestion` what changes,
which files, what stays out, and what the expected outcome is, until nothing material is
open, then passes the settled requirement as the argument. Do not re-ask what the owner
named.

## 2. Dispatch `harness`

```
Agent: harness
Requirement: <the settled requirement>
Files: <every path to write, delete, or leave alone, named>
Scope: .claude/**, AGENTS.md, .github/copilot-instructions.md; nothing else
Expected outcomes: <what each file says when done>
Verify before writing: every path, class, script, and flag against the checkout
  (package.json, vitest.config.ts, docker-compose.yml, .husky/, .commitlintrc,
  eslint.config.mjs, knip.json, the source file itself)
Writing rules: .claude/rules/authoring.md, Harness files; budgets from that section;
  final state only
A src/ defect found on the way: append a row to generated/docs/report-src-sweep.md,
  do not fix it
Report: files written with wc -l, files deleted, what each file now says, the
  verification output, every src/ finding recorded, one line per thing noticed outside
  the scope
```

Add the working-tree line and the no-questions line from
`../ack-code/references/dispatch.md`. A follow-up dispatch is a fresh instance reading
the tree as the previous one left it.

## 3. Verify

Run after the hand-back and quote the output:

```bash
jq . .claude/settings.json >/dev/null
for f in .claude/hooks/*.sh; do bash -n "$f" && test -x "$f"; done
echo '{}' | bash .claude/hooks/roster.sh
grep -rnE 'N[E]VER|A[L]WAYS|M[U]ST|H[A]RD' .claude AGENTS.md .github/copilot-instructions.md   # all-caps emphasis: empty
wc -l .claude/CLAUDE.md AGENTS.md .github/copilot-instructions.md .claude/rules/*.md .claude/agents/*.md .claude/skills/*/SKILL.md
```

Every `.md` with frontmatter opens with `---` on line 1; a rule's `paths:` is a YAML list;
a skill or agent `description` is `>-`. No file names a deleted file, a retired agent, or
a retired skill. Budgets: `.claude/rules/authoring.md`, Harness files.

A path permission rule in `.claude/settings.json` takes the `Edit(path)` form only: `Edit`
rules cover every file-editing tool, and a `Write(path)` rule never matches.

## Boundaries

No `src/`, `test/`, `docs/`, `prisma/`, and no `.github/**` beyond the Copilot digest. No
DB or seed command. Commits go through `ask`; propose the subject only
(`.claude/CLAUDE.md`, Etiquette).

## Hand back

The settled requirement, what `harness` changed and what each file now says, the
verification output, every `src/` finding recorded rather than fixed, and one line per
thing noticed outside the scope.

## Next

`/ack-spec` for a recorded `src/` finding that is a confirmed no-flow bug; `/ack-code`
for one that changes a flow.
