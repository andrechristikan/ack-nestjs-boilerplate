New names in this example, not in the checkout: the plan in `example-plan.md` and its paths, the brief `.superpowers/sdd/2026-11-05-country-inactive/task-1-brief.md`, and the report path.

# Example: a Coder and a Reviewer dispatch

Both are filled from `example-plan.md`; the templates are `dispatch.md`, Coder and Reviewer. `Decisions:` is filled once, in the template's slot, and the Every dispatch block follows the body without its own `Decisions:` line; its `Decisions to honour:` carries the index lines the Scope touches. `Rules to read:` is the output of `bash .claude/hooks/rules.sh` over the `Scope` paths.

## Coder, plan task 1

```
Agent: coder
Task: .superpowers/plans/2026-11-05-country-inactive.md task 1: the brief
  .superpowers/sdd/2026-11-05-country-inactive/task-1-brief.md
Decisions:
- Add `EnumCountryStatusCodeError.inactive` (50901) with HTTP 400.
- The public country list keeps returning every country.
- Admin import resolves by alpha-2 code with no active check.
Scope: prisma/schema.prisma; src/modules/country/; test/unit/modules/country/; the fourteen
  test/unit/modules/user/ specs the task's Files list names
Test first: when the task changes src/ behaviour, write the failing spec under test/unit/
  mirroring the subject, run `pnpm test <path filter>` and quote the failing line, then
  implement the minimum; integration and e2e are held (`.claude/rules/testing.md`).
Acceptance: `pnpm db:generate` exit 0; `pnpm typecheck` exit 0;
  `pnpm test test/unit/modules/country test/unit/modules/user` green with
  country.response.dto.spec.ts asserting isActive; the run surface (`.claude/rules/layering.md`,
  The run surface is a call site) repaired where this change moved a command, port, path, or
  script name.
Schema: when prisma/schema.prisma changes, run `pnpm db:generate` and hand back the
  model, field, index, and `pnpm db:migrate` for the owner. Do not run db:migrate,
  migration:*, db:studio, mongosh, or redis-cli.
Seeds: a seed under src/migration/ follows `.claude/skills/ack-work/references/add-seed.md`.
Rules to read:
.claude/rules/activity-log.md
.claude/rules/code-style.md
.claude/rules/concurrency.md
.claude/rules/cross-module.md
.claude/rules/database.md
.claude/rules/discipline.md
.claude/rules/dto.md
.claude/rules/enum.md
.claude/rules/eslint.md
.claude/rules/exceptions.md
.claude/rules/guards.md
.claude/rules/http.md
.claude/rules/layering.md
.claude/rules/naming.md
.claude/rules/null-safety.md
.claude/rules/pagination.md
.claude/rules/service.md
.claude/rules/testing.md
.claude/rules/use-case.md
Report: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED; files changed; the decisive
  test and typecheck lines; open items; on a plan task, also written to
  generated/docs/report-2026-11-05-country-inactive-task-1.md.
Decisions to honour:
- 0004 · Use case, service, repository · chosen: one use case per action, rules in services shared downward on a declared order · rejected: domains as orchestrators, domain events for orchestration, grouped multi-method use cases, a separate `src/application/` tier
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

## Reviewer, after both tasks, at `rules and boot`

```
Agent: reviewer
Depth: rules and boot
Scope: prisma/schema.prisma; src/modules/country/dtos/response/country.response.dto.ts;
  src/modules/country/enums/country.status-code.enum.ts;
  src/modules/country/exceptions/country.inactive.exception.ts;
  src/modules/country/services/country.service.ts; src/languages/en/country.json;
  test/unit/modules/country/exceptions/country.inactive.exception.spec.ts;
  test/unit/modules/country/services/country.service.spec.ts;
  test/unit/modules/country/use-cases/country.get-list-cursor.use-case.spec.ts;
  test/unit/modules/country/dtos/response/country.response.dto.spec.ts; under
  test/unit/modules/user/: dtos/response/user.mobile-number.response.dto.spec.ts,
  dtos/response/user.profile.response.dto.spec.ts, services/user.mobile-number.service.spec.ts,
  services/user.profile.service.spec.ts, services/user.service.spec.ts, and under use-cases/:
  user.add-mobile-number.use-case.spec.ts, user.create-by-admin.use-case.spec.ts,
  user.delete-mobile-number.use-case.spec.ts, user.get-one.use-case.spec.ts,
  user.get-profile.use-case.spec.ts, user.import-by-admin.use-case.spec.ts,
  user.login-with-social.use-case.spec.ts, user.sign-up.use-case.spec.ts,
  user.update-mobile-number.use-case.spec.ts
Requirement: .superpowers/plans/2026-11-05-country-inactive.md
Decisions:
- Add `EnumCountryStatusCodeError.inactive` (50901) with HTTP 400.
- The public country list keeps returning every country.
- Admin import resolves by alpha-2 code with no active check.
Checks: the depth's checks in .claude/agents/reviewer.md (Depth, Checks), the boot when
  the depth includes it; every rule file that binds a changed path, named in the report.
  Never pnpm test at any scope.
Report: only what affects correctness or the stated requirement, each labelled Critical,
  Important, or Minor, with file:line and the rule or requirement it breaks; the rule
  files read; the surfaces checked and found clean; each check command with its exit code
  and decisive output quoted. Do not fix anything.
Rules to read:
.claude/rules/code-style.md
.claude/rules/concurrency.md
.claude/rules/cross-module.md
.claude/rules/database.md
.claude/rules/discipline.md
.claude/rules/dto.md
.claude/rules/enum.md
.claude/rules/eslint.md
.claude/rules/exceptions.md
.claude/rules/i18n.md
.claude/rules/layering.md
.claude/rules/naming.md
.claude/rules/null-safety.md
.claude/rules/service.md
.claude/rules/testing.md
Decisions to honour:
- 0004 · Use case, service, repository · chosen: one use case per action, rules in services shared downward on a declared order · rejected: domains as orchestrators, domain events for orchestration, grouped multi-method use cases, a separate `src/application/` tier
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
