# ack-build dispatch templates

## Foreground dispatch

Binds every skill that dispatches an agent. An Agent call may return before the agent
finishes; the hand-back is the result.

- Pass `run_in_background: false` on every Agent call where the tool offers the parameter.
- Run parallel work (a review split into parts, one reader test per file) as several calls
  in one message. They run concurrently.
- Wait for every dispatched agent's hand-back before the next step. Never poll: `Monitor`
  and `Workflow` are denied, and scheduled wakeups and cron jobs are off
  (`.claude/CLAUDE.md`, Etiquette).
- Read each hand-back and act on it (confirm or reject, route, record) before the next step.
  End the turn only when every hand-back has been read and acted on.

## Every dispatch

Every dispatch carries these lines verbatim after the template body:

```
The working tree is the source, including unstaged and untracked files; read files from
disk, never from `HEAD` or a ref. To list what changed, use `git status --short` and
`git diff HEAD --name-only` plus `git ls-files --others --exclude-standard`; never
`<base>..HEAD` or `git show HEAD:`.
You cannot ask questions. When something is missing, stop and hand the question back.
Anything noticed outside this scope is one line in the hand-back, not a change.
Run every command in the foreground, bounded with `timeout` where it would not end on its own (a boot); no `run_in_background`.
Reply in English.
```

Rules by path: the four unscoped rules (`.claude/rules/layering.md`, `cross-module.md`,
`null-safety.md`, `naming.md`) bind every file; each scoped rule applies when its `paths:`
frontmatter, the source, matches a file in the dispatch.

## Explorer

```
Agent: explorer
Mode: locate | contract | assess
Requirement: <the settled paragraph>
Scope: <modules or paths the requirement names>
Question: <what the session cannot answer from the code it has read>
Deliver: a location table (file:line per touch point), the third-party contract quoted
with its source, two or three approaches with trade-offs and a recommendation, and every
open question the owner has to settle.
Rules to read: <the unscoped rules plus each scoped rule matching a file, per Rules by path>
```

## Debugger

```
Agent: debugger
Symptom: input <..>; observed <..>; expected <..>; surfaces at <route, spec, log line, or job>
Scope: <modules or paths the symptom touches>
Decision: <the owner's answer to a previous NEEDS_DECISION, or none>
Rules to read: <the unscoped rules plus each scoped rule matching a file, per Rules by path>
Report: the reproduction command and its decisive line; each hypothesis with the
  evidence that confirmed or killed it; the root cause at file:line; the pin (files,
  cause, change); whether the change alters a flow; NEEDS_DECISION with the options
  when two fixes are equal or three hypotheses failed. Do not fix anything.
```

## Coder

```
Agent: coder
Task: <plan path> task <N>, brief at <.superpowers/sdd/<plan>/task-<N>-brief.md>
  or
Pin: files <paths>; cause at <file:line>; change <one sentence>
Scope: <module directories this task may edit; test/ mirrors of the same; the specs,
  test helpers, setup or global-setup files, test config, and run-surface files the task's
  Files list names>
Test first: when the task changes src/ behaviour, write the failing spec under test/unit/
  mirroring the subject, run `pnpm test <path filter>` and quote the failing line, then
  implement the minimum. Specs, test helpers, setup or global-setup files, and test config
  the task's Files list names (a moved spec, a spec rewritten to a rule, an integration or
  e2e proof) are written as listed; no other spec (coverage work is tester).
Acceptance: `pnpm typecheck` exit 0; the task's own acceptance commands when the plan
  names them (`pnpm test:integration`, `pnpm test:e2e`, the parity counts), otherwise
  `pnpm test <module>` green with the new spec named; the run surface (`.claude/rules/layering.md`,
  The run surface is a call site) repaired where this change moved a command, port, path, or
  script name.
Schema: when prisma/schema.prisma changes, run `pnpm db:generate` and hand back the
  model, field, index, data consequence, and `pnpm db:migrate` for the owner. Do not
  run db:migrate, migration:*, db:studio, mongosh, or redis-cli.
Seeds: a seed under src/migration/ follows `.claude/skills/ack-build/references/add-seed.md`.
Rules to read: <the unscoped rules plus each scoped rule matching a file, per Rules by path>
Report: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED; files changed; the decisive
  test and typecheck lines; open items.
```

## Reviewer

```
Agent: reviewer
Depth: task | plan | docs | harness | rules and boot | end to end through guards, services, repository, processors
Scope: <files and modules from git status --short, a plan path, docs files, or harness files, as the depth needs>
Requirement: <the task brief, the plan path, or the settled paragraph>
Checks: at task, rules and boot, and end to end: every rule file that binds a changed path,
  named in the report; every sequential await of independent work (.claude/rules/code-style.md,
  Concurrency and errors); boot (timeout 90 pnpm start:dev, the 'App Name:' block in its
  log) when the depth includes it; pnpm typecheck, pnpm lint, pnpm deadcode, pnpm spell. At
  plan, docs, and harness: only what the depth names in .claude/agents/reviewer.md. Never
  pnpm test at any scope.
Report: only what affects correctness or the stated requirement, each labelled Critical,
  Important, or Minor, with file:line and the rule or requirement it breaks; the rule
  files read; the surfaces checked and found clean; each check command with its exit code
  and decisive output quoted. Do not fix anything.
Rules to read: <the unscoped rules plus each scoped rule matching a file, per Rules by path>
```
