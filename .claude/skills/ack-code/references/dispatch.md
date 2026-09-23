# ack-code dispatch templates

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
`file.md`, `feature-flag.md`, `enum.md`, `testing.md` (test), `seeding.md` (migration).

## Explorer

```
Agent: explorer
Mode: locate | contract | assess
Requirement: <the settled paragraph from step 1>
Scope: <modules or paths the requirement names>
Question: <what the session cannot answer from the code it has read>
Deliver: a location table (file:line per touch point), the third-party contract quoted
with its source, two or three approaches with trade-offs and a recommendation, and every
open question the owner has to settle.
Rules to read: <paths from the list above>
```

## Coder

```
Agent: coder
model: opus            # only when the plan marks the task complex; omit otherwise
Task: <plan path> task <N>, brief at <.superpowers/sdd/<plan>/task-<N>-brief.md>
  or
Pin: files <paths>; cause at <file:line>; change <one sentence>
Scope: <module directories this task may edit; test/ mirrors of the same>
Test first: write the failing spec under test/ mirroring the subject, run
  `pnpm test <path filter>` and quote the failing line, then implement the minimum.
Acceptance: `pnpm typecheck` exit 0; `pnpm test <module>` green with the new spec named;
  the run surface (package.json scripts, scripts/, ci/, docker-compose.yml,
  .github/workflows/, nest-cli.json, vitest.config.ts, knip.json, tsconfig*.json,
  eslint.config.mjs, .husky/) repaired where this change moved a command, port, path,
  or script name.
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
Depth: rules and boot | end to end through guards, services, repository, processors
Scope: <files and modules the work changed, from git status --short>
Requirement: <the settled paragraph, or the plan path>
Checks: every rule file that binds a changed path, named in the report; boot
  (`pnpm start:dev` until the routes mount, then stop it) when depth includes boot;
  `pnpm typecheck`, `pnpm lint`, `pnpm deadcode`, `pnpm spell`; not the full `pnpm test`.
Report: only what affects correctness or the stated requirement, each with file:line and
  the rule or requirement it breaks; the rule files read; the surfaces checked and found
  clean. Do not fix anything.
Rules to read: <paths from the list above>
```

## Writer

```
Agent: writer
Scope: <docs/*.md files the behaviour touches>, plus README.md, SECURITY.md,
  CONTRIBUTING.md, CODE_OF_CONDUCT.md, and .github/** except copilot-instructions.md
Change: <what landed, in one paragraph, with the files under src/ that prove it>
Acceptance: every claim in scope classified ACCURATE, STALE, MISSING, PHANTOM,
  CONTRADICTS, or CONFLICT; the first five repaired in place; CONFLICT reported with the
  evidence for both sides and left unresolved. Final state only. Run
  avoid-ai-writing in edit mode on every markdown file touched; not on YAML.
Rules to read: .claude/rules/authoring.md
Report: findings by class, files changed, every CONFLICT with its evidence.
```
