# Layering

`Controller → Use case → Service → Repository → DatabaseService`, with `Processor → Use case` on the queue side. New module: `.claude/skills/ack-build/references/add-module.md`. Module files and `@Global()`: `module-files.md`. `src/migration/` sits outside this layering (`seeding.md`).

## Roles

- Repository (`repositories/<module>[.<concern>].repository.ts`): data access on one Prisma model and its satellites (`cross-module.md`), plus `null → {}` filter normalization. A statement runs on `this.databaseService.client`, an `*InTx` method's `tx`, or its own `withTransaction` (`transaction.md`). Returns Prisma models, `I<Module>*` shapes, `IResponsePaginationReturn<T>`, or primitives. Takes a request DTO only when no layer above derives from it. Implements `I<Module>[<Concern>]Repository`, alone in its file and the only header interface a class gets; callers inject by class, a DI token only for a real seam. Reads `ConfigService` for write mechanics only. Injects no repository.
- Analytic repository (`repositories/analytic.<area>.repository.ts`): read-only statements over any module's model, the builder or one `aggregateRaw` pipeline (`analytic.md`). Implements `IAnalytic<Area>Repository`. Injects `DatabaseService`, `AnalyticPipelineUtil`, `PaginationOffsetUtil` where a pipeline list pages, `PaginationService` where a builder list pages, and the in-memory kit (`Helper*`); never `ConfigService`. Injected only by its area's `analytic.<area>.service.ts`. `AnalyticSnapshotRepository` alone writes.
- Service (`services/<module>[.<concern>].service.ts`): its module's application logic: its operations and the invariants it keeps (`service.md`). Injects its own module's repositories, services, utils, and caches; the services and utils Dependency order allows, `UserPasswordService` injecting `AuthPasswordUtil` (`src/modules/user/services/user.password.service.ts`); and the kit (`ConfigService`, `DatabaseService` for `withTransaction`, `transaction.md`). Never a use case, a controller, another module's repository, cache, or queue class, or a service or util Dependency order does not allow.
- Use case (`use-cases/<module>[.<concern>].<action>.use-case.ts`): the business logic of one user- or job-facing action: which application operations run, in which order, across which modules, inside which transaction, with which outbox effects; it assembles services and writes no module's operation; one public method, `execute` (`use-case.md`). Injects any module's services and utils, and the kit; never a repository, a cache, or another use case.
- Controller (`controllers/`): one endpoint returning one use case's `execute` (`http.md`). Injects use cases of its own feature only.
- Processor (`processors/`): one job case awaiting one use case's `execute` (`queue.md`, Processors); a kit processor awaits its kit service (`CacheProcessor`, `OutboxProcessor`). Injects use cases of its own feature only.
- Util (`utils/<module>[.<concern>].util.ts`): pure shaping a module shares, arguments in and a value out: a public method with two or more callers (each a class, the util itself included) or one caller outside the module (another module, a seed); a method only the util itself calls is private; any other pure method lives in its module's service (`service.md`, Methods). Injects `ConfigService` and the in-memory kit only (`Helper*`, `MessageService`, `DatabaseUtil`, `LoggerUrlUtil`), never `DatabaseService`, `AwsS3Service`, `SentryService`, `JwtService`, a service, or a `src/modules/` util; `PaginationQueryUtil` also injects its sibling pagination utils (`PaginationCursorUtil`, `PaginationOffsetUtil`). Every method is synchronous or awaits only a `Helper*` call and contains no `throw` (`PaginationQueryUtil` and `PaginationFilterUtil` excepted). Maps an error to an exception and returns it; the caller throws. A builder needing request state or running writes is a factory (`database.md`). An empty util is deleted with its provider entries.
- Queue class (`queues/<module>[.<concern>].queue.ts`): holds the `@InjectQueue` and schedules its module's recurring jobs from `onModuleInit` (`queue.md`, Enqueuing). Provided by its own module, injected by none.

Logic two use cases share moves down into a service; a service needing a higher module's service is a use case and moves up.

## Dependency order

Lower and higher come from `imports:`: a module is lower than every module whose `<Module>Module` imports it, directly or transitively. A `@Global()` module, which no module file but `common.module.ts` imports, takes its place from the services that inject it, and the list below records it. A service injects the services and utils of its own module, of a module its module file imports, and of a lower `@Global()` module (`module-files.md`, `@Global()`). Lowest first:

1. kernel: `country`, `feature-flag`, `role`, `policy`, `api-key`, `activity-log`, `hello`, `health`
2. `device`
3. `session`
4. `auth`
5. `password-history`
6. `notification`
7. `mfa`
8. `term-policy`
9. `user`
10. `workspace`
11. `project`
12. `analytic`

- A kernel module's services inject no other feature's service or util.
- Controllers, processors, and use cases sit above the whole order.
- `analytic` owns every analytic read: no other module has an analytic service or repository. Its services inject its own repositories, services, utils, and caches, and `FeatureFlagService`; never another module's repository or a queue class. Only its refresh job writes its snapshots (`analytic.md`).
- The kit, the `src/common/` modules `common.module.ts` composes, sits below every feature; anyone injects it.
- Lint enforces the layer matrix only (`eslint.config.mjs`, `ts/boundaries`): a new edge adds an import, and `reviewer` checks the module files against this list.

`src/common/` and `src/app/` import no module code or type outside `common.module.ts` and `app.module.ts`; other code imports anything. Promote only a module-agnostic concept with three callers or more; an exported, complete member of a used family is kit surface and carries `/** @public */`, which `pnpm deadcode` skips. YAGNI rejects a base, token, knob, branch, or stub; the one stub is a provider adapter whose provider is not chosen, a no-op that logs and returns (`NotificationSmsDeliveryService`).

## The run surface is a call site

A command, port, path, or script a change moves also moves in `package.json`, `scripts/`, `ci/`, the root `dockerfile` and `docker-compose.yml`, `.dockerignore`, `.env.example`, `.github/workflows/`, `.github/dependabot.yml`, `nest-cli.json`, `.swcrc`, `vitest.config.ts`, `knip.json`, `cspell.json`, `tsconfig*.json`, `eslint.config.mjs`, `.husky/`, and `.gitignore`. The release workflow attaches `sbom.cdx.json`, built by `pnpm sbom` from the lockfile.
