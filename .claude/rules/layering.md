# Layering

One reason to change per role: `Controller → Use case → Service → Repository → DatabaseService`, with `Processor → Use case` on the queue side. New module: `.claude/skills/ack-build/references/add-module.md`. `src/migration/` sits outside this layering (`seeding.md`).

## Roles

- Repository (`repositories/<module>[.<concern>].repository.ts`): data access on one Prisma model and its satellites (`cross-module.md`), plus `null → {}` filter normalization. A statement runs on `this.databaseService.client`, an `*InTx` method's `tx`, or its own `withTransaction` (`database.md`). Returns Prisma models, `I<Module>*` shapes, `IResponsePaginationReturn<T>`, or primitives. Takes a request DTO only when no layer above derives from it. Implements `I<Module>[<Concern>]Repository`, alone in its file and the only header interface a class gets; callers inject by class, a DI token only for a real seam. Reads `ConfigService` for write mechanics only. Injects no repository.
- Analytic repository (`<module>[.<concern>].analytic.repository.ts`): read-only aggregates over a model its module's write repository owns, injected only by that module's `*.analytic.service.ts`.
- Service (`services/<module>[.<concern>].service.ts`): its module's application logic: its operations and the invariants it keeps (`service.md`). Injects its own module's repositories, services, utils, and caches; the services and utils Dependency order allows, `UserPasswordService` injecting `AuthPasswordUtil` (`src/modules/user/services/user.password.service.ts`); and the kit (`ConfigService`, `DatabaseService` for `withTransaction`, `database.md`). Never a use case, a controller, another module's repository, cache, or queue class, or a service or util Dependency order does not allow.
- Use case (`use-cases/<module>[.<concern>].<action>.use-case.ts`): the business logic of one user- or job-facing action: which application operations run, in which order, across which modules, inside which transaction, with which outbox effects; it assembles services and writes no module's operation; one public method, `execute` (`use-case.md`). Injects any module's services and utils, and the kit; never a repository, a cache, or another use case.
- Controller (`controllers/`): one endpoint returning one use case's `execute` (`http.md`). Injects use cases of its own feature only.
- Processor (`processors/`): one job case awaiting one use case's `execute` (`queue.md`, Processors); a kit processor awaits its kit service (`CacheProcessor`, `OutboxProcessor`). Injects use cases of its own feature, plus the services `QueueProcessorBase` takes (`OutboxService` among them), forwarded to `super(...)`.
- Util (`utils/<module>[.<concern>].util.ts`): pure shaping a module shares, arguments in and a value out: a public method with two or more callers (each a class, the util itself included) or one caller outside the module (another module, a seed); a method only the util itself calls is private; any other pure method lives in its module's service (`service.md`, Methods). Injects `ConfigService` and the in-memory kit only (`Helper*`, `MessageService`, `DatabaseUtil`), never `DatabaseService`, `AwsS3Service`, `SentryService`, `JwtService`, a service, or a `src/modules/` util; `PaginationQueryUtil` also injects its sibling pagination utils (`PaginationCursorUtil`, `PaginationOffsetUtil`). Every method is synchronous or awaits only a `Helper*` call and contains no `throw` (`PaginationQueryUtil` and `PaginationFilterUtil` excepted). Maps an error to an exception and returns it; the caller throws. A builder needing request state or running writes is a factory (`database.md`, Access). An empty util is deleted with its provider entries.
- Queue class (`queues/<module>[.<concern>].queue.ts`): holds the `@InjectQueue` and schedules its module's recurring jobs from `onModuleInit` (`queue.md`, Enqueuing). Provided by its own module, injected by none.

A use case is a verb for one action, crosses modules, and only its own feature's entry points call it; a service is a noun for one module, holds application logic, and serves many use cases and higher modules' services. Logic two use cases share moves down into a service; a service needing a higher module's service is a use case and moves up.

## Dependency order

Lower and higher come from `imports:`: a module is lower than every module whose `<Module>Module` imports it, directly or transitively, and a cycle fails the boot (`ReferenceError`). A `@Global()` module, which no module file but `common.module.ts` imports, takes its place from the services that inject it, and the list below records it. A service injects the services and utils of its own module, of a module its module file imports, and of a lower `@Global()` module. Lowest first:

1. kernel: `country`, `feature-flag`, `role`, `policy`, `api-key`, `activity-log`, `hello`, `health`
2. `device`
3. `session`
4. `auth`
5. `password-history`
6. `notification`
7. `term-policy`
8. `user`
9. `workspace`
10. `project`
11. `analytic`

- A kernel module's services inject no other feature's service or util.
- Controllers, processors, and use cases sit above the whole order.
- `analytic` reads only: its services inject lower modules' analytic services and utils and its own services, utils, and caches; never a repository, a queue class, or `DatabaseService`.
- The kit, the `src/common/` modules `common.module.ts` composes, sits below every feature; anyone injects it.
- Lint enforces the layer matrix only (`eslint.md`, Config blocks): a new edge adds an import, and `reviewer` checks the module files against this list.

`src/common/` and `src/app/` import no module code or type outside `common.module.ts` and `app.module.ts`; other code imports anything. Promote only a module-agnostic concept with three callers or more; an exported, complete member of a used family is kit surface, its `pnpm deadcode` warning no finding. YAGNI rejects a base, token, knob, branch, or stub.

## `@Global()`

- A global module carries `@Global()` and a no-argument `forRoot()` with no `global` key; only `src/common/common.module.ts` imports it, once, as `<Module>.forRoot()`.
- A feature `<Module>Module` is global only when a guard, strategy, interceptor, or decorator injects its classes: `ApiKeyModule`, `AuthModule`, `FeatureFlagModule`, `PolicyModule`, `RoleModule`, `SessionModule`, `TermPolicyModule`. A use-case module is never global.
- Every kit module `common.module.ts` composes is global but `LoggerModule`, which exports nothing. `AwsModule` and `FirebaseModule` sit outside it, imported where used.
- `@Global()` removes the import, never the rank (`cross-module.md`).

## Module files

- `<module>.module.ts`, `<Module>Module`: services, repositories, utils, caches, queue classes, factories, strategies, interceptors, indicators in `providers`; its services, utils, and caches in `exports`, never a repository or a queue class; imports the `<Module>Module` of each non-`@Global()` feature whose services or utils its services inject, plus one `BullModule.registerQueueAsync` for the queues it owns, each with its factory, nothing else.
- `<module>.use-case.module.ts`, `<Module>UseCaseModule`: the feature's use cases in `providers` and `exports`, never a processor; imports each non-`@Global()` `<Module>Module` its use cases inject, its own included. A leaf: only `src/router/` imports it.
- `src/router/http/router.http.<scope>.module.ts` declares the scope's controllers and imports each `<Module>UseCaseModule` whose use cases they inject, plus the `<Module>Module` of every non-`@Global()` feature whose guard they carry (`src/router/http/router.http.user.module.ts`).
- `src/router/processor/router.processor.module.ts` lists every processor in `providers` and imports each `<Module>UseCaseModule` whose use cases they inject.
- In `@Module({ imports: [...] })`, every `<Module>UseCaseModule` comes first, then one blank line, then every other module (`<Module>Module`, kit modules, `forRootAsync(...)` calls); a file with one group carries none.
- Each `<module>.module.ts` registers its own queues, once however many modules import it; the queue kit registers none, the cache kit only `cache`, the outbox kit only `outbox` (`queue.md`, Where things live).

Only files with something to provide exist. A `@Module({})`, or a global module's `forRoot()` after `module` with its `@Module({})` empty, lists `controllers` (`[]` in both), `providers`, `exports`, `imports`, in that order. `forRoot()` runs once, in a root module: `src/app/app.module.ts`, `src/common/common.module.ts`, `src/router/router.module.ts`. `tsc` and Vitest pass a broken `imports:`; boot to verify wiring (a cycle raises `ReferenceError`, a missing provider `UnknownDependenciesException`).

## The run surface is a call site

A command, port, path, or script a change moves also moves in `package.json`, `scripts/`, `ci/`, the root `dockerfile` and `docker-compose.yml`, `.dockerignore`, `.env.example`, `.github/workflows/`, `.github/dependabot.yml`, `nest-cli.json`, `.swcrc`, `vitest.config.ts`, `knip.json`, `cspell.json`, `tsconfig*.json`, `eslint.config.mjs`, `.husky/`, and `.gitignore`.
