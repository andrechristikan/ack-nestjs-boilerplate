# ack-build dispatch templates

## Foreground dispatch

Binds the fork skills `ack-build` and `ack-spec`: a fork's run is one turn, and a result
that returns after the turn ends lands in the parent session and never reaches the fork.
`ack-doc` runs in the session and follows the same rules.

- Pass `run_in_background: false` on every Agent call where the tool offers the parameter;
  where it does not, a subagent already runs synchronously. Either way, end the turn only
  when no dispatched agent is running and every result has been read and acted on. A step
  whose agent is still running is unfinished work, not a hand-back.
- Run parallel work (a review split into parts, one reader test per file) as several calls
  in one message. They run concurrently; the next step starts when every call in the
  message has returned.
- Read each result and act on it (confirm or reject, route, record) before the next step.

## Every dispatch

Every dispatch carries these lines verbatim after the template body:

```
The working tree is the source, including unstaged and untracked files; read files from
disk, never from `HEAD` or a ref. To list what changed, use `git status --short` and
`git diff HEAD --name-only` plus `git ls-files --others --exclude-standard`; never
`<base>..HEAD` or `git show HEAD:`.
You cannot ask questions. When something is missing, stop and hand the question back.
Anything noticed outside this scope is one line in the hand-back, not a change.
Reply in English.
```

Rules by path: the four unscoped rules bind every file (`.claude/rules/layering.md`,
`cross-module.md`, `null-safety.md`, `naming.md`). Add each scoped rule whose `paths:`
frontmatter (the source) matches a file in the dispatch; by area: `code-style.md` (src,
test), `http.md` (controllers, router, app), `dto.md` (dtos, request, response, pagination),
`database.md` (repositories, prisma, common database), `exceptions.md` (exceptions,
status-code enums, app), `queue.md` (processors, queues, notification), `security.md` (auth,
session, api-key, user, request, instrument), `config.md` (configs, env example, logger,
sentry, cache, redis), `i18n.md` (languages, message), `file.md` (file, aws),
`feature-flag.md` (its module), `enum.md` (enums), `testing.md` (test, Vitest config),
`seeding.md` (migration), `docker.md` (compose, dockerfiles, ci, test container helper),
`authoring.md` (docs, `.claude`, `.github`, `AGENTS.md`, root people files).

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
Rules to read: <paths from the list above>
```

## Debugger

```
Agent: debugger
Symptom: input <..>; observed <..>; expected <..>; surfaces at <route, spec, log line, or job>
Scope: <modules or paths the symptom touches>
Decision: <the owner's answer to a previous NEEDS_DECISION, or none>
Rules to read: <paths from the list above>
Report: the reproduction command and its decisive line; each hypothesis with the
  evidence that confirmed or killed it; the root cause at file:line; the pin (files,
  cause, change); whether the change alters a flow; NEEDS_DECISION with the options
  when two fixes are equal or three hypotheses failed. Do not fix anything.
```

## Coder

```
Agent: coder
model: opus            # only when the plan marks the task complex; omit otherwise
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
  `pnpm test <module>` green with the new spec named; the run surface (package.json
  scripts, scripts/, ci/, ci/docker-compose.yml, ci/dockerfile.local, docker-compose.yml,
  the root dockerfile.local, .github/workflows/, .github/dependabot.yml, nest-cli.json,
  vitest.config.ts, knip.json, tsconfig*.json, eslint.config.mjs, .husky/, .gitignore)
  repaired where this change moved a command, port, path, or script name.
Schema: when prisma/schema.prisma changes, run `pnpm db:generate` and hand back the
  model, field, index, data consequence, and `pnpm db:migrate` for the owner. Do not
  run db:migrate, migration:*, db:studio, mongosh, or redis-cli.
Seeds: a seed under src/migration/ follows `.claude/skills/ack-build/references/add-seed.md`.
Rules to read: <paths from the list above>
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
  named in the report; boot (pnpm start:dev until the routes mount, then stop it) when the
  depth includes it; pnpm typecheck, pnpm lint, pnpm deadcode, pnpm spell. At plan, docs,
  and harness: only what the depth names in .claude/agents/reviewer.md. Never the full pnpm
  test.
Report: only what affects correctness or the stated requirement, each labelled Critical,
  Important, or Minor, with file:line and the rule or requirement it breaks; the rule
  files read; the surfaces checked and found clean. Do not fix anything.
Rules to read: <paths from the list above>
```
