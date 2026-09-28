---
name: ack-harness
description: >-
  Reworks the AI configuration, .claude/** (CLAUDE.md, rules, agents, skills, hooks,
  settings), AGENTS.md, and .github/copilot-instructions.md through the harness
  agent from a requirement settled with the owner, final state only, then has reviewer
  check it. With diagnose, reads a session transcript through superpowers
  diagnosing-superpowers and turns what went wrong into the requirement. Use when the
  owner wants to change how Claude or Copilot works in this repository. Not for src/,
  test/, docs/, or prisma/.
disable-model-invocation: true
argument-hint: "<settled requirement: files, the change, expected outcomes> | diagnose [session id | last]"
---

!`git status --short`

# ack-harness

This skill runs in the session because the requirement is settled with the owner. `harness`
writes `.claude/**`, `AGENTS.md`, and `.github/copilot-instructions.md`; this skill does not
edit those trees, and no other agent runs while `harness` is writing because it would read
the tree the run is rewriting. Every file produced here is final state only: how the thing
works now, with no history, decision log, "changed on", "applies from", "previously", or
rationale for a change (`.claude/rules/authoring.md`, Final state only).

## 1. Settle

With `diagnose`:

- Locate the transcript under `~/.claude/projects/<encoded project path>/`, where the
  encoded path is the absolute repository path with `/` replaced by `-`. A session id names
  `<id>.jsonl`; `last` is the newest `.jsonl` there other than the current session.
- Invoke `superpowers:diagnosing-superpowers` on it.
- Put its findings (a skill not invoked, a step skipped, an agent working outside its
  dispatch, a plan ignored, tokens spent on noise) to the owner with `AskUserQuestion` as
  candidate changes. The ones the owner keeps become the requirement.

Without `diagnose`: ask with `AskUserQuestion` what changes, which files, what stays out,
and what the expected outcome is, until nothing material is open. Do not re-ask what the
owner named.

When the files list contains a `.claude/skills/**/SKILL.md`, invoke
`superpowers:writing-skills` here and carry the points that apply into the dispatch under
`Writing rules`: the description states what the skill does and when to use it, the
critical steps come first, the body stays within budget, long material goes to
`references/`.

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
`../ack-build/references/dispatch.md`. A follow-up dispatch is a fresh instance reading
the tree as the previous one left it.

## 3. Review, through `reviewer`

Dispatch `reviewer` at `Depth: harness` (template `../ack-build/references/dispatch.md`,
Reviewer) with the files `harness` wrote as the scope and the settled requirement as the
requirement.

Every finding passes `superpowers:receiving-code-review` here: open the file, then confirm
or reject it with a reason. Confirmed findings go to `harness` in one fix dispatch, then
one scoped re-check by `reviewer`. Rejected findings and what stays open are lines in the
hand-back.

## 4. Verify

Invoke `superpowers:verification-before-completion`, then run and quote the output:

```bash
jq . .claude/settings.json >/dev/null
for f in .claude/hooks/*.sh; do bash -n "$f" && test -x "$f"; done
echo '{}' | bash .claude/hooks/roster.sh
grep -rnE 'N[E]VER|A[L]WAYS|M[U]ST|H[A]RD' .claude AGENTS.md .github/copilot-instructions.md --exclude-dir=worktrees   # all-caps emphasis: empty
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

The settled requirement; for `diagnose`, the transcript read and each finding the owner
kept or dropped; what `harness` changed and what each file now says; every `reviewer`
finding and its state (fixed, rejected with the reason, open); the verification output;
every `src/` finding recorded rather than fixed; one line per thing noticed outside the
scope.

## Next

`/ack-build pin: ...` for a recorded `src/` finding that is a confirmed no-flow bug;
`/ack-debug` for one whose cause is not in hand; `/ack-plan` for one that changes a flow.
