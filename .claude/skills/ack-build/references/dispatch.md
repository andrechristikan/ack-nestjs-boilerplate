# ack-build dispatch templates

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
`cross-module.md`, `null-safety.md`, `naming.md`). Add the scoped rule whose `paths:`
matches a file in the dispatch: `code-style.md` (src, test), `http.md` (controllers,
router, app), `dto.md` (dtos, request, response, pagination), `database.md`
(repositories, prisma), `exceptions.md` (exceptions, status-code enums), `queue.md`
(processors, queues, notification), `security.md` (auth, session, api-key, user),
`config.md` (configs, logger, sentry, cache, redis), `i18n.md` (languages, message),
`file.md`, `feature-flag.md`, `enum.md`, `testing.md` (test), `seeding.md` (migration),
`docker.md` (docker-compose, dockerfiles, ci, the test container helper).

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
  scripts, scripts/, ci/, ci/docker-compose.yml, docker-compose.yml, the root
  dockerfile.local, .github/workflows/, .github/dependabot.yml, nest-cli.json,
  vitest.config.ts, knip.json, tsconfig*.json, eslint.config.mjs, .husky/, .gitignore) repaired where this change
  moved a command, port, path, or script name.
Schema: when prisma/schema.prisma changes, run `pnpm db:generate` and hand back the
  model, field, index, data consequence, and `pnpm db:migrate` for the owner. Do not
  run db:migrate, migration:*, db:studio, mongosh, or redis-cli.
Seeds: a seed under src/migration/ follows the `ack-add-seed` skill.
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
Checks: at task, rules and boot, and end to end: every rule file that binds a changed
  path, named in the report; boot (pnpm start:dev until the routes mount, then stop it)
  when the depth includes it; pnpm typecheck, pnpm lint, pnpm deadcode, pnpm spell. At
  plan, docs, and harness: only what the depth names in .claude/agents/reviewer.md.
  Never the full pnpm test.
Report: only what affects correctness or the stated requirement, each with file:line and
  the rule or requirement it breaks; the rule files read; the surfaces checked and found
  clean. Do not fix anything.
Rules to read: <paths from the list above>
```
