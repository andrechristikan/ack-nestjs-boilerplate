# Dispatch templates

## Foreground dispatch

Binds every skill that dispatches an agent. An Agent call may return before the agent finishes; the hand-back is the result.

- Pass `run_in_background: false` on every Agent call where the tool offers the parameter.
- Run parallel work (a review split into parts, one reader test per file) as several calls in one message.
- Wait for every dispatched agent's hand-back before the next step; never poll (`.claude/CLAUDE.md`, Etiquette).
- Read each hand-back and act on it (confirm or reject, route, record) before the next step. End the turn only when every hand-back has been read and acted on.

## Every dispatch

Every dispatch carries these lines verbatim after the template body, except `Decisions:`: fill it once, in the template's slot where it has one; before a plan file exists, with the owner's answers so far, or `none`.

```
Decisions: <the **Decisions:** block of the plan file, pasted>
The working tree is the source, including unstaged and untracked files; read files from
disk, never from `HEAD` or a ref. To list what changed, use `git status --short` and
`git diff HEAD --name-only` plus `git ls-files --others --exclude-standard`; never
`<base>..HEAD` or `git show HEAD:`.
You cannot ask questions. When something is missing, stop and hand the question back.
Anything noticed outside this scope is one line in the hand-back, not a change.
Run every command in the foreground, bounded with `timeout` where it would not end on its own (a boot); no `run_in_background`.
This is a boilerplate with no external client: build the correct shape and change every call site; no compat flag, no `v1`/`v2` pair, no deprecated-but-kept field, no backfill, no data-migration note, no existing-rows consequence.
Before writing or judging, run `bash .claude/hooks/rules.sh <every file you touch>` and read each rule it prints; name them in the hand-back.
Reply in English.
```

Rules by path: `bash .claude/hooks/rules.sh <path>...` prints the rules binding those paths, the unscoped five included; a newline-joined list goes in as one argument (`"$P"`) or on stdin, zsh included. Paste its output over a template's `Scope` paths into `Rules to read:`.

## Explorer

```
Agent: explorer
Mode: locate | contract | assess
Requirement: <the settled paragraph>
Decisions: <the **Decisions:** block of the plan file, pasted>
Scope: <modules or paths the requirement names>
Question: <what the session cannot answer from the code it has read>
Deliver: a location table (file:line per touch point), the third-party contract quoted
with its source, two or three approaches with trade-offs and a recommendation, and every
open owner question.
Rules to read: <the output of bash .claude/hooks/rules.sh over the paths in Scope, pasted>
```

## Debugger

```
Agent: debugger
Symptom: input <..>; observed <..>; expected <..>; surfaces at <route, spec, log line, or job>
Scope: <modules or paths the symptom touches>
Decision: <the owner's answer to a previous NEEDS_DECISION, or none>
Decisions: <the **Decisions:** block of the plan file, pasted>
Rules to read: <the output of bash .claude/hooks/rules.sh over the paths in Scope, pasted>
Report: the reproduction command and its decisive line; each hypothesis with the
  evidence that confirmed or killed it; the root cause at file:line; the pin (files,
  cause, change); whether the change alters a flow; NEEDS_DECISION with the options
  when two fixes are equal or three hypotheses failed. Do not fix anything.
```

## Coder

```
Agent: coder
Task: <.superpowers/plans/<plan-basename>.md> task <N>: task text pasted, or the brief path
  or
Pin: files <paths>; cause at <file:line>; change <one sentence>
Decisions: <the **Decisions:** block of the plan file, pasted>
Scope: <module directories this task may edit; test/ mirrors of the same; the specs,
  test helpers, setup or global-setup files, test config, and run-surface files the task's
  Files list names>
Test first: when the task changes src/ behaviour, write the failing spec under test/unit/
  mirroring the subject, run `pnpm test <path filter>` and quote the failing line, then
  implement the minimum; integration and e2e are held (`.claude/rules/testing.md`).
Acceptance: `pnpm typecheck` exit 0; the task's own acceptance commands when the plan
  names them (the parity counts), otherwise
  `pnpm test <module>` green with the new spec named; the run surface (`.claude/rules/layering.md`,
  The run surface is a call site) repaired where this change moved a command, port, path, or
  script name.
Schema: when prisma/schema.prisma changes, run `pnpm db:generate` and hand back the
  model, field, index, and `pnpm db:migrate` for the owner. Do not run db:migrate,
  migration:*, db:studio, mongosh, or redis-cli.
Seeds: a seed under src/migration/ follows `.claude/skills/ack-work/references/add-seed.md`.
Rules to read: <the output of bash .claude/hooks/rules.sh over the paths in Scope, pasted>
Report: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED; files changed; the decisive
  test and typecheck lines; open items; on a plan task, also written to
  generated/docs/report-<plan-basename>-task-<N>.md.
```

## Reviewer

```
Agent: reviewer
Depth: task | plan | docs | harness | rules and boot | end to end through guards, services, repository, processors
Scope: <files and modules from git status --short, a plan path, docs files, or harness files, as the depth needs>
Requirement: <the task text, the plan path, or the settled paragraph>
Decisions: <the **Decisions:** block of the plan file, pasted>
Checks: the depth's checks in .claude/agents/reviewer.md (Depth, Checks), the boot when
  the depth includes it; every rule file that binds a changed path, named in the report.
  Never pnpm test at any scope.
Report: only what affects correctness or the stated requirement, each labelled Critical,
  Important, or Minor, with file:line and the rule or requirement it breaks; the rule
  files read; the surfaces checked and found clean; each check command with its exit code
  and decisive output quoted. Do not fix anything.
Rules to read: <the output of bash .claude/hooks/rules.sh over the paths in Scope, pasted>
```

## Planner

```
Agent: planner
Requirement: <the design path or the chat-approved design; the settled paragraph>
Decisions: <the owner's answers so far, verbatim>
Location table: <explorer's, pasted>
Review depth: <SKILL.md, Review, for feature>
Deliver: .superpowers/plans/YYYY-MM-DD-<slug>.md (references/gate.md); **Agents:** <each agent, model, effort>
Rules to read: <the output of bash .claude/hooks/rules.sh over the table's paths, pasted>
```
