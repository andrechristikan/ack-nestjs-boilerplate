New names in this example, not in the checkout: the `country-inactive` feature folder, `country.set-inactive.use-case.ts` and its spec, `CountryService.setInactiveInTx`, `CountryRepository.updateInTx`, `CountryCache`, and the `PATCH /admin/country/:id/inactive` route.

# The review file

`reviewer` writes `.scratch/<feature>/review.md` at the end of `/ack-build`. `/ack-review` reads it and adds the owner's answers and `## Fixes`; each `reviewer` dispatched with `Fixed` appends a `## Re-review` section.

## Shape

```markdown
# Review: country-inactive

**Spec:** .scratch/country-inactive/spec.md **Plan:** .scratch/country-inactive/plan.md

## Results

| Check | Result |
| --- | --- |
| `pnpm typecheck` | exit 0, no `error TS` line |
| `pnpm lint` | exit 0, no output |
| `pnpm deadcode` | exit 0, no issue listed |
| `pnpm spell` | exit 0, no output |
| `pnpm test country` | exit 0, `Tests  12 passed (12)` |
| `pnpm test:cov country` | exit 0, each changed file at 100 |
| boot | `App name` line quoted |
| `PATCH /admin/country/:id/inactive` | 200 |
| MongoDB `Country` row | R1 |
| queue job | held: the `redis-queue` MCP server does not answer |

### R1. The row stays active

- **Where:** `src/modules/country/services/country.service.ts:54`
- **Decisive line:** `isActive: true` on the `Country` row after the 200
- **Cause:** `CountryService.setInactiveInTx` at `country.service.ts:54` passes the loaded row's `isActive` to `CountryRepository.updateInTx`, so the write keeps `true`.
- **Change:** at `country.service.ts:54`, pass `isActive: false` to `updateInTx`.
- **First failing spec:** `country.service.spec.ts`: `setInactiveInTx` calls `CountryRepository.updateInTx` with `isActive: false`.

## Acceptance

| Ticket | Criterion | Proof | Status |
| --- | --- | --- | --- |
| 01 | the route sets `isActive: false` | Results: MongoDB `Country` row | R1 |
| 01 | the cache invalidation runs as a queued job | `country.set-inactive.use-case.ts:41` | 1 |

## Coverage

| Read | Result |
| --- | --- |
| `.claude/rules/effects.md` | 1 |
| `.claude/rules/service.md` | pass |
| decision: Cache invalidation is a job | 1 |
| flow: `PATCH /admin/country/:id/inactive`, beside `PATCH /admin/api-key/:id/inactive` | 1 |

## Findings

### 1. Important: the cache is invalidated inline

- **Where:** `src/modules/country/use-cases/country.set-inactive.use-case.ts:41`
- **Breaks:** `.claude/rules/effects.md`, "Its use case opens `DatabaseService.withTransaction` over the `*InTx` write, which adds `CacheQueue.invalidateEffect(keys)`"; decision: Cache invalidation is a job.
- **Cause:** `execute` awaits `cacheService.invalidate(keys)` after the transaction. Its sibling, `ApiKeyService.addInvalidateEffectInTx`, adds the effect on `tx`.
- **Change:** remove the `cacheService.invalidate` call from `execute`. In `CountryService.setInactiveInTx`, build the keys with `CountryCache`, then `await this.outboxService.addInTx(tx, this.cacheQueue.invalidateEffect(keys))`. `execute` opens `DatabaseService.withTransaction` and calls `setInactiveInTx(tx, id)`.
- **First failing spec:** `country.set-inactive.use-case.spec.ts`: `execute` opens `DatabaseService.withTransaction` and never calls `CacheService.invalidate`.
```

## Rules

- Results has one row per command (its exit code and decisive line), per endpoint call (its status), and per data check (the row, key, or job read against its criterion). A held check reads `held:` and why.
- A red result is numbered `R<n>` and has its own section with **Where**, **Decisive line**, **Cause** at `file:line`, **Change**, and **First failing spec** where a spec can guard it, the last three in a finding's shape. A cause the output and the code do not show reads `**Cause:** unknown`, with no **Change** and no **First failing spec**. `Fixed:` names a red result as it names a finding.
- Acceptance has one row per acceptance criterion of each ticket; its proof is the spec, the Results row, or the `file:line` that proves it. A criterion with no proof is a red result.
- Coverage has one row per rule file the dispatch pasted, one per decision entry it named, and one per endpoint and job the change adds or changes. A flow row names the sibling flow it was read beside.
- An Acceptance status or a Coverage result reads `pass` or the finding and result numbers. A rule file that was not read whole has no `pass`.
- A finding is numbered and labeled Critical, Important, or Minor. Its five lines are all present.
- **Change** names files, classes, methods, and the shape of the result. Where two fixes would work, the reviewer picks one and says which; `coder` reads no option.
- **First failing spec** names the spec file and the behavior its first assertion states.
- No finding without a clause or a spec line under **Breaks**.

## What the session adds

- `**Owner:** kept | dropped | changed: <how>` as the last line of each finding.
- `## Fixes`, a table: `#`, `Finding`, `Route`, `Status`.

## Re-review

Each dispatch with `Fixed` appends its own section, headed with the findings and results it covers: the checks it ran again, as rows of the Results shape, then one line per finding or result, `closed` with its evidence or `open` with what is left.

```markdown
## Re-review: 1, R1

| Check | Result |
| --- | --- |
| `pnpm typecheck` | exit 0, no `error TS` line |
| `pnpm lint` | exit 0, no output |
| `pnpm deadcode` | exit 0, no issue listed |
| `pnpm spell` | exit 0, no output |
| `pnpm test country` | exit 0, `Tests  14 passed (14)` |
| `pnpm test:cov country` | exit 0, each changed file at 100 |
| boot | `App name` line quoted |
| `PATCH /admin/country/:id/inactive` | 200 |
| MongoDB `Country` row | `isActive: false`, as the criterion expects |

- 1: closed. `country.set-inactive.use-case.ts:38` adds the effect on `tx`; the spec asserts it.
- R1: closed. The `Country` row reads `isActive: false` after the call.
```
