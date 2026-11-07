# Layering

One reason to change per role: `Controller → Use case → Service → Repository → DatabaseService`, with `Processor → Use case` on the queue side. Use cases compose modules; services share rules downward along the dependency order. New module: `.claude/skills/ack-work/references/add-module.md`. `src/migration/` sits outside this layering (`seeding.md`).

## Roles

- Repository (`repositories/<module>[.<concern>].repository.ts`): data access on one Prisma model and its satellites (`cross-module.md`), plus `null → {}` filter normalization. A statement runs on `this.databaseService.client`, an `*InTx` method's `tx`, or its own `withTransaction` (`database.md`). Returns Prisma models, `I<Module>*` shapes, `IResponsePaginationReturn<T>`, or primitives. Takes a request DTO only when no layer above derives from it. Implements `I<Module>[<Concern>]Repository`, alone in its file and the only header interface a class gets; callers inject by class, a DI token only for a real seam. Reads `ConfigService` for write mechanics only. Injects no repository.
- Analytic repository (`<module>[.<concern>].analytic.repository.ts`): read-only aggregates over a model its module's write repository owns, injected only by that module's `*.analytic.service.ts`.
- Service (`services/<module>[.<concern>].service.ts`): its module's business rules, typed exceptions, asserts, and `*InTx` methods (`service.md`). Injects its own module's repositories, services, utils, caches, and queue classes; the services and utils of lower-ranked modules (Dependency order), `UserPasswordService` injecting `AuthPasswordUtil` (`src/modules/user/services/user.password.service.ts`); and the kit (`ConfigService`, `DatabaseService` for `withTransaction`, `database.md`). Never a use case, a controller, another module's repository, cache, or queue class, or a service of another module ranked at or above its own.
- Use case (`use-cases/<module>[.<concern>].<action>.use-case.ts`): one user- or job-facing action with one public method, `execute` (`use-case.md`). Injects any module's services, utils, and queue classes, `DatabaseService` for `withTransaction`, and the kit; never a repository, a cache, or another use case.
- Controller (`controllers/`): one endpoint returning one use case's `execute` (`http.md`). Injects use cases of its own feature only.
- Processor (`processors/`): one job case awaiting one use case's `execute` (`queue.md`, Processors). Injects use cases of its own feature, plus `SentryService` and `MessageService` forwarded to `QueueProcessorBase`.
- Util (`utils/<module>[.<concern>].util.ts`): pure shaping, arguments in and a value out. Injects `ConfigService` and the in-memory kit only (`Helper*`, `MessageService`, `DatabaseUtil`), never `DatabaseService`, `AwsS3Service`, `SentryService`, `JwtService`, a service, or a `src/modules/` util; `PaginationQueryUtil` also injects its sibling pagination utils (`PaginationCursorUtil`, `PaginationOffsetUtil`). Every method is synchronous or awaits only a `Helper*` call, contains no `throw` (`PaginationQueryUtil` and `PaginationFilterUtil` excepted), and is private or called outside its file. Maps an error to an exception and returns it; the caller throws. A builder needing request state or running writes is a factory (`database.md`, Access). An empty util is deleted with its provider entries.
- Queue class (`queues/<module>[.<concern>].queue.ts`): holds the `@InjectQueue`, builds and encrypts the payload, enqueues (`queue.md`, Enqueuing). Injected by a service of its own module or by a use case; never by a controller.

A use case is a verb for one action, crosses modules, and only its own feature's entry points call it; a service is a noun for one module, holds rules, and serves many use cases and higher-ranked services. Logic two use cases share moves down into a service; a service needing a higher-ranked service is a use case and moves up.

## Dependency order

Lowest first. A service injects services and utils only of its own module or of a module strictly lower in this list:

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
- `analytic` reads only: its services inject lower modules' analytic services and utils and its own services, utils, and caches (`src/modules/analytic/services/analytic.fraud.service.ts`); never a repository, a queue class, or `DatabaseService`.
- The kit, the `src/common/` modules `common.module.ts` composes, sits below every feature; anyone injects it.
- `eslint-plugin-boundaries` enforces the layer matrix and this order (`eslint.md`, Config blocks).

`AwsModule` is imported where used. `src/common/` reaches a feature only through `common.module.ts` and `import type` (`src/common/request/interfaces/request.interface.ts:2`). Promote only a module-agnostic concept with three callers or more; an exported, complete member of a used family is kit surface, its `pnpm deadcode` warning no finding. YAGNI rejects a base, token, knob, branch, or stub.

## `@Global()`

- A `<Module>Module` carries `@Global()` only when a guard, strategy, interceptor, or decorator injects its classes: `ActivityLogModule`, `ApiKeyModule`, `AuthModule`, `FeatureFlagModule`, `PolicyModule`, `RoleModule`, `SessionModule`, `TermPolicyModule`. A use-case module is never global.
- In the kit, `RequestThrottleModule` and `QueueModule` (its `forRoot()`) carry `@Global()`, so a feature module imports no queue module.
- `@Global()` removes the import, never the rank: a global module's services keep their place in the dependency order (`cross-module.md`).
- `src/common/common.module.ts` imports each global module once, and `RequestMiddlewareModule` imports `RequestThrottleModule` into `ThrottlerModule.forRootAsync`; beyond that, no module imports a `@Global()` module except its own use-case module.

## Module files

- `<module>.module.ts`, `<Module>Module`: services, repositories, utils, caches, queue classes, factories, strategies, interceptors, indicators in `providers`; its services, utils, caches, and queue classes in `exports`, never a repository; imports the `<Module>Module` of each lower-ranked, non-`@Global()` feature whose services or utils its services inject, nothing else.
- `<module>.use-case.module.ts`, `<Module>UseCaseModule`: the feature's use cases and processors in `providers`, its use cases in `exports`; imports each non-`@Global()` `<Module>Module` its use cases inject, its own included. A leaf: only `src/router/` imports it.
- `src/router/http/router.http.<scope>.module.ts` declares the scope's controllers and imports each `<Module>UseCaseModule` whose use cases they inject, plus the `<Module>Module` of every non-`@Global()` feature whose guard they carry (`src/router/http/router.http.user.module.ts`).
- `src/router/processor/router.processor.module.ts` imports each `<Module>UseCaseModule` that provides a processor.
- `QueueModule.forRoot()` registers every queue with its factory (`queue.md`, Where things live); a feature module registers none.

Only files with something to provide exist. A `@Module({})` lists `controllers` (`[]` in both), `providers`, `exports`, `imports`, in that order. `forRoot()` runs once, in a root module: `src/app/app.module.ts`, `src/common/common.module.ts`, `src/router/router.module.ts`. A feature module imports neither the composed kit nor `QueueModule`. `tsc` and Vitest pass a broken `imports:`; boot to verify wiring (a cycle raises `ReferenceError`, a missing provider `UnknownDependenciesException`).

## The run surface is a call site

A command, port, path, or script a change moves also moves in `package.json`, `scripts/`, `ci/`, the root `dockerfile` and `docker-compose.yml`, `.dockerignore`, `.env.example`, `.github/workflows/`, `.github/dependabot.yml`, `nest-cli.json`, `.swcrc`, `vitest.config.ts`, `knip.json`, `cspell.json`, `tsconfig*.json`, `eslint.config.mjs`, `.husky/`, and `.gitignore`.
