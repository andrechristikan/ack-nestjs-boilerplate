---
name: ack-harness
description: >-
    Reworks the AI configuration (.claude/**, AGENTS.md, .github/copilot-instructions.md) through the harness agent from a requirement settled with the owner, final state only. Use when the owner wants to change how Claude or Copilot works in this repository, or with diagnose to turn a session transcript into that change. Not for src/ or test/ (ack-plan, ack-build, ack-spec), docs/ (ack-doc), or prisma/ (ack-plan).
disable-model-invocation: true
argument-hint: '<settled requirement: files, the change, expected outcomes> | diagnose [session id | last]'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-harness

You orchestrate one `harness` dispatch and verify what it wrote. This skill runs in the session because the requirement is settled with the owner. `harness` writes `.claude/**`, `AGENTS.md`, and `.github/copilot-instructions.md`; this skill does not edit those trees, and no other agent runs while `harness` is writing because it would read the tree the run is rewriting. Final state only: `.claude/rules/authoring.md`. The project is a boilerplate with no external client: a rule states the correct shape and every call site changes with it (`../ack-build/references/dispatch.md`, Every dispatch). If a `superpowers:*` skill is not installed, stop and say `claude plugin install superpowers@claude-plugins-official`. Pass `run_in_background: false` on every Agent call (`../ack-build/references/dispatch.md`, Foreground dispatch).

## 1. Settle

With `diagnose`:

- Locate the transcript under `~/.claude/projects/<encoded project path>/`, where the encoded path is the absolute repository path with `/` replaced by `-`. A session id names `<id>.jsonl`; `last` is the newest `.jsonl` there other than the current session.
- Invoke `superpowers:diagnosing-superpowers` on it.
- Put its findings (a skill not invoked, a step skipped, an agent working outside its dispatch, a plan ignored, tokens spent on noise) to the owner with `AskUserQuestion` as candidate changes. The ones the owner keeps become the requirement.

Without `diagnose`: ask with `AskUserQuestion` what changes, which files, what stays out, and what the expected outcome is, until nothing material is open. Do not re-ask what the owner named.

When the files list contains a `.claude/skills/**/SKILL.md`, invoke `superpowers:writing-skills` here and carry the points that apply into the dispatch under `Writing rules`: the description states what the skill does, when to use it, and what it is not for, with no workflow summary; the critical steps come first; the file stays within its word budget; long material goes to `references/`.

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
Report: files written with wc -w, files deleted, what each file now says, the
  verification output, every src/ finding recorded, one line per thing noticed outside
  the scope
```

Add the Every dispatch block from `../ack-build/references/dispatch.md`. A follow-up dispatch is a fresh instance reading the tree as the previous one left it.

## 3. Verify

Invoke `superpowers:verification-before-completion`, then run and quote the output:

```bash
jq . .claude/settings.json >/dev/null
for f in .claude/hooks/*.sh; do bash -n "$f" && test -x "$f"; done
echo '{}' | bash .claude/hooks/roster.sh
grep -rnE 'N[E]VER|A[L]WAYS|M[U]ST|H[A]RD' .claude AGENTS.md .github/copilot-instructions.md --exclude-dir=worktrees   # all-caps emphasis: empty
wc -w .claude/CLAUDE.md AGENTS.md .github/copilot-instructions.md .claude/rules/*.md .claude/agents/*.md .claude/skills/*/SKILL.md .claude/skills/*/references/*.md
```

Every `.md` with frontmatter opens with `---` on line 1; a rule's `paths:` is a YAML list; a skill or agent `description` is `>-`. No file names a deleted file, a retired agent, or a retired skill. Word budgets by `wc -w`: `.claude/rules/authoring.md`, Harness files.

A path permission rule in `.claude/settings.json` takes the `Edit(path)` form only: `Edit` rules cover every file-editing tool, and a `Write(path)` rule never matches.

A check that fails goes back to `harness` in one fix dispatch, then the block runs again.

## Boundaries

No `src/`, `test/`, `docs/`, `prisma/`, and no `.github/**` beyond the Copilot digest. No DB or seed command. Commits go through `ask`; propose the subject only (`.claude/CLAUDE.md`, Etiquette).

## Hand back

The settled requirement; for `diagnose`, the transcript read and each finding the owner kept or dropped; what `harness` changed and what each file now says; the verification output; every `src/` finding recorded rather than fixed; one line per thing noticed outside the scope.

## Next

`/ack-build pin: ...` for a recorded `src/` finding that is a confirmed no-flow bug; `/ack-plan` for one whose cause is not in hand or that changes a flow.
