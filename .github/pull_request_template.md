## Summary
<!-- What changed and why (2–5 lines). Name the module(s). -->

## Related Issue
<!-- Closes #123 — or n/a -->

## Scope
<!-- What this PR owns, in plain terms. Skip rows that do not apply. -->

### Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Performance improvement
- [ ] Security improvement
- [ ] Documentation
- [ ] Other (describe):

### Module(s)
<!-- Tick every module this PR owns. Matches `src/modules/*`. -->
- [ ] `activity-log`
- [ ] `api-key`
- [ ] `auth`
- [ ] `country`
- [ ] `device`
- [ ] `feature-flag`
- [ ] `health`
- [ ] `hello`
- [ ] `notification`
- [ ] `password-history`
- [ ] `policy`
- [ ] `role`
- [ ] `session`
- [ ] `term-policy`
- [ ] `user`
- [ ] `common` / shared
- [ ] Other (describe):

### Entry points
- [ ] HTTP / endpoint: …
- [ ] Queue / job: …
- [ ] CLI: …
- [ ] Other (describe):

## Out of scope
<!-- What this PR deliberately does not touch. -->
…

## How Has This Been Tested?
<!-- What you ran and what a reviewer needs to reproduce. Skip rows that do not apply. -->

### Checks (required)
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] Boot (`pnpm start:dev`)

### Tests
<!-- Tick every kind you actually ran. -->
- [ ] Manual test
- [ ] Unit test — scope: …
- [ ] Integration test
- [ ] E2E test
- [ ] Queue / job exercised
- [ ] Other (describe):

### How to run
<!-- Concrete steps to exercise this change locally. -->
1. …
2. …

### Database / seed
- [ ] No seed or DB change required
- [ ] Schema change — still needs owner `pnpm db:migrate` / `pnpm db:generate`: …
- [ ] Seed required — command: …
- [ ] Seed remove / fresh caveat: …

### Environment
- [ ] No new env vars
- [ ] New / changed env vars (also update `.env.example`): …

### Mandatory (when the surface applies)
<!-- Skip only when the PR does not touch that surface. -->

#### Layering
- [ ] Service does **not** inject `DatabaseService` (data access via repository only)
- [ ] Service does **not** open `$transaction` / build Prisma `where` / `select` / `orderBy`
- [ ] Controller holds **no** business rule and does **not** inject a repository
- [ ] Repository does **not** throw module exceptions or build i18n `messagePath`
- [ ] Service has `I*Service` and `implements` it; **no** `I*Repository`
- [ ] Repositories / services injected as classes (no `@Inject(TOKEN)` for a single implementor)
- [ ] Path aliases only — no relative `../` imports in `src/`
- [ ] Controllers registered in `src/router/…`; processors in `src/queues/queue.module.ts`
- [ ] No `forwardRef` between feature modules

#### HTTP / DTO / Swagger
- [ ] Request DTO created with `class-validator` + `@ApiProperty` on every field
- [ ] Response DTO fields intended for the wire carry `@Expose()` (nested needs `@Type`)
- [ ] Swagger doc factory exists for each new/changed endpoint (`*.doc.ts`)
- [ ] Decorator order: Doc → TermPolicy → Policy → Role → ActivityLog → User → JWT → FeatureFlag → ApiKey → HttpCode → Method
- [ ] Controller normalizes `undefined → null` (`?? null`) before service params that are `T | null`
- [ ] `@Response` handlers return `IResponseReturn<T>`; `@ResponsePaging` handlers return `IResponsePagingReturn<T>` — never a bare DTO
- [ ] Paginated lists use `@ResponsePaging` (not `@Response`); `PaginationService` lives in the repository only

#### Types / safety
- [ ] No `any` (param, cast, or generic)
- [ ] No `field?: Type | null`; input boundary uses `?:`, internal layers use `T | null`
- [ ] No credentials in logs, response DTO leakage, or `request.<field>`

#### Status codes
- [ ] New codes reuse an existing member when the meaning already fits
- [ ] New codes are 5-digit and sit in this module's reserved block / next free hundred
- [ ] No collision with another module's range (scan `*.status-code.enum.ts` before claiming)
- [ ] `statusCode` uses the enum member; `statusCodeKey` uses the reverse lookup (no hardcoded string / numeric literal)

#### i18n
- [ ] `messagePath` is nested (`module.error.key`) matching `src/languages/<lang>/<module>.json`
- [ ] No flat keys (`"error.notFound": "..."` as a single string key)
- [ ] New keys added to **every** language file, not only `en`

## Breaking Changes
<!-- What breaks and which call sites / clients must update. n/a if none. -->
…

## Additional Notes
<!-- Anything else for reviewers. -->
