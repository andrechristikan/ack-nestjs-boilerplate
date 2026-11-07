New names in this example, not in the checkout: the plan in `example-plan.md`, the report path, the `.superpowers/sdd/` ledger, and `Country.isActive`.

# Example: a coder task report

`coder` writes its hand-back for task 1 of `example-plan.md` to `generated/docs/report-2026-11-05-country-inactive-task-1.md` and replies with the same text. The items follow `.claude/agents/coder.md`, Hand back, in that order. Counts that depend on the run stay in angle brackets.

```markdown
# Task 1: `isActive` on the model, the response schema, and every `Country` fixture

**Status:** DONE

## Files changed

- `prisma/schema.prisma`: `isActive Boolean @default(true)` on `Country`.
- `src/modules/country/dtos/response/country.response.dto.ts`: `isActive: z.boolean()` with its description.
- `test/unit/modules/country/dtos/response/country.response.dto.spec.ts`: the row carries `isActive: true`.
- `isActive: true` added to the `Country` fixture in `test/unit/modules/country/services/country.service.spec.ts`, `test/unit/modules/country/use-cases/country.get-list-cursor.use-case.spec.ts`, and the fourteen `test/unit/modules/user/` specs the task names.

## Rule files read

`activity-log.md`, `code-style.md`, `concurrency.md`, `cross-module.md`, `database.md`, `discipline.md`, `dto.md`, `enum.md`, `eslint.md`, `exceptions.md`, `guards.md`, `http.md`, `layering.md`, `naming.md`, `null-safety.md`, `pagination.md`, `service.md`, `testing.md`, `use-case.md`, all under `.claude/rules/`.

## Specs watched fail, then pass

- Red, `pnpm test test/unit/modules/country/dtos/response`:
    - `FAIL  test/unit/modules/country/dtos/response/country.response.dto.spec.ts > CountryResponseSchema > parses a row into exactly the declared fields`
    - `AssertionError: expected { …(11) } to deeply equal { …(12) }`
- Green, `pnpm test test/unit/modules/country test/unit/modules/user`:
    - `Test Files  <n> passed (<n>)`
    - `Tests  <n> passed (<n>)`
- `pnpm db:generate`: exit 0, `Generated Prisma Client`.
- `pnpm typecheck`: exit 0, no output.

## Run surface

`package.json`, `.env.example`, `docker-compose.yml`, `vitest.config.ts`: checked, unchanged; no command, port, path, or script name moved.

## Status codes

None allocated.

## Schema delta

- Model: `Country`.
- Field: `isActive Boolean @default(true)`.
- Index: none.
- The owner runs `pnpm db:migrate`.

## Deviations from the plan

None.

## Open items

None.

## Noticed outside the scope

- `src/modules/country/dtos/response/country.response.dto.ts:12`: the `name` example `faker.location.country()` and the `alpha2Code` example (`:19`) draw independently, so the Swagger example pairs a name with another country's code.
```

The session reads this file after the hand-back, appends the task's line to `.superpowers/sdd/2026-11-05-country-inactive/progress.md`, and marks task 1 `- [x]` once every acceptance line is quoted green (`SKILL.md`, step 4).
