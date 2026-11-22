Every path, line, and name in this example exists in the checkout. Example value, not in the checkout: the `DELETE` row's unreachable claim, because no `src/modules/country/` line is unreachable and an unseeded database reaches that branch.

# Example: sweep rows

## Two open rows

Each row sits under its heading in `generated/report-src-sweep.md`, in the row shape `sweep-log.md` gives: the `file:line`, then one sentence stating what the code does, no proposal. The other three headings stay as they are.

- The `CHANGE` row is a decision the owner has not made: a status code.
- The `DELETE` row is a line no input can reach.

```markdown
## CHANGE

- [ ] `src/modules/country/exceptions/country.not-found.exception.ts:10`: `CountryNotFoundException` answers HTTP 404, and `getOne` throws it for the `countryId` a sign-up body carries (`src/modules/user/use-cases/user.sign-up.use-case.ts:243`), so a sign-up naming an unknown country answers 404.

## DELETE

- [ ] `src/modules/country/services/country.service.ts:22`: the `countryId === null` branch of `getIdByAlpha2Code` throws `CountryNotFoundException`, and its one caller (`src/modules/user/use-cases/user.process-import-by-admin.use-case.ts:169`) passes `user.default.country`, the constant `'ID'` (`src/configs/user.config.ts:38`) that the country seed writes (`src/migration/data/migration.country.data.ts:7`).
```

At the end of the run, each row is re-read against the file it names (`sweep-log.md`, the state table): a fixed defect deletes its row, a moved line updates its `file:line`.

## Coverage scope

In scope for the coverage bar: the service, the use case, the DTOs, and the exception. The controller, the repository, the constants, the enum, the interface, and the two module files sit in `vitest.config.ts` `coverage.exclude` and get no spec (`sweep-log.md`, Coverage reading).
