New names in this example, not in the checkout: the `country-inactive` feature folder, `country.set-inactive.use-case.ts` and its spec, `CountryService.setInactiveInTx`, `CountryCache`, and the `PATCH /admin/country/:id/inactive` route.

# The review file

`reviewer` writes `.scratch/<feature>/review.md` at `Depth: review`. `/ack-review` reads it, adds the owner's answers and `## Fixes`, and a second `reviewer` appends `## Re-review`.

## Shape

```markdown
# Review: country-inactive

**Spec:** .scratch/country-inactive/spec.md **Plan:** .scratch/country-inactive/plan.md

## Coverage

| Read | Result |
| --- | --- |
| spec: 6 acceptance criteria | pass |
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

- Coverage has one row per rule file the dispatch pasted, one per decision entry it named, one for the spec, and one per endpoint and job the change adds or changes. A flow row names the sibling flow it was read beside.
- A row reads `pass` or the finding numbers. A rule file that was not read whole has no `pass`.
- A finding is numbered and labeled Critical, Important, or Minor. Its five lines are all present.
- **Change** names files, classes, methods, and the shape of the result. Where two fixes would work, the reviewer picks one and says which; `coder` reads no option.
- **First failing spec** names the spec file and the behavior its first assertion states.
- No finding without a clause or a spec line under **Breaks**.

## What the session adds

- `**Owner:** kept | dropped | changed: <how>` as the last line of each finding.
- `## Fixes`, a table: `#`, `Finding`, `Route`, `Coder`, `Status`.

## Re-review

The second `reviewer` appends:

```markdown
## Re-review

- 1: closed. `country.set-inactive.use-case.ts:38` adds the effect on `tx`; the spec asserts it.
```

A finding still open reads `open:` and what is left.
