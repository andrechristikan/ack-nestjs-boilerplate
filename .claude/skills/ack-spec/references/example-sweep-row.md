Every path, line, and name in this example exists in the checkout. Example value, not in the checkout: the `DELETE` row's unreachable claim, because no `src/modules/country/` line is unreachable and an unseeded database reaches that branch.

# Example: sweep rows and a Tester dispatch

## Two open rows

Each row sits under its heading in `generated/docs/report-src-sweep.md`, in the row shape `sweep-log.md` gives: the `file:line`, then one sentence stating what the code does, no proposal. The other three headings stay as they are.

- The `CHANGE` row is a decision the owner has not made: a status code.
- The `DELETE` row is a line no input can reach.

```markdown
## CHANGE

- [ ] `src/modules/country/exceptions/country.not-found.exception.ts:10`: `CountryNotFoundException` answers HTTP 404, and `getOne` throws it for the `countryId` a sign-up body carries (`src/modules/user/use-cases/user.sign-up.use-case.ts:220`), so a sign-up naming an unknown country answers 404.

## DELETE

- [ ] `src/modules/country/services/country.service.ts:22`: the `countryId === null` branch of `getIdByAlpha2Code` throws `CountryNotFoundException`, and its one caller (`src/modules/user/use-cases/user.import-by-admin.use-case.ts:166`) passes `user.default.country`, the constant `'ID'` (`src/configs/user.config.ts:41`) that the country seed writes (`src/migration/data/migration.country.data.ts:7`).
```

At the end of the run, each row is re-read against the file it names (`sweep-log.md`, the state table): a fixed defect deletes its row, a moved line updates its `file:line`.

## Tester dispatch, step 4

The template is `SKILL.md`, step 4. The Every dispatch block follows the body with `Decisions: none`, because a fork has no plan file, and `Decisions to honour: none`, because the specs change no recorded choice. `Rules to read:` is the output of `bash .claude/hooks/rules.sh src/modules/country/ test/unit/modules/country/`.

```
Agent: tester
Scope: src/modules/country/ and test/unit/modules/country/
Kind: unit
Bar: 100% statements, branches, functions, and lines on every file in scope
Source of truth: the code as it is on disk, including repairs this run landed
Mode: cover
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
Report: specs written or repaired; per-file coverage rows; every line that cannot be
  covered without changing src/, with file:line and why; defects noticed, each with
  file:line, unfixed.
Decisions: none
Decisions to honour: none
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

In scope for the coverage bar: the service, the use case, the DTOs, and the exception. The controller, the repository, the constants, the enum, the interface, and the two module files sit in `vitest.config.ts` `coverage.exclude` and get no spec (`sweep-log.md`, Coverage reading).
