# Layering

One reason to change per role: `Controller → HTTP Service → Domain → Repository → DatabaseService`, with `Processor → Processor Service` joining at the domain. New module: `.claude/skills/ack-build/references/add-module.md`. `src/migration/` sits outside this layering (`seeding.md`).

## Roles

- Repository (`repositories/<module>[.<concern>].repository.ts`): data access on one Prisma model and its satellites (`cross-module.md`), plus `null → {}` filter normalization. A statement runs on `this.databaseService.client`, an `*InTx` method's `tx`, or its own `withTransaction` (`database.md`). Returns Prisma models, `I<Module>*` shapes, `IResponsePaginationReturn<T>`, or primitives. Takes a request DTO only when no layer above derives from it. Implements `I<Module>[<Concern>]Repository`, alone in its file and the only header interface a class gets; callers inject by class, a DI token only for a real seam. Reads `ConfigService` for write mechanics only. Injects no repository.
- Analytic repository (`<module>[.<concern>].analytic.repository.ts`): read-only aggregates over a model its module's write repository owns, injected only by that module's `*.analytic.domain.ts`.
- Domain (`domains/<module>[.<concern>].domain.ts`): its module's business rules and typed exceptions. Injects its own module's repositories, domains, utils, caches, and queue classes, another module's util (`src/modules/user/domains/user.password.domain.ts:38`), and the kit (`ConfigService`, `DatabaseService` for `withTransaction` across its own repositories, each as `*InTx(tx, ...)`). Never another module's domain, cache, queue class, or repository, `@Global()` or not; stages no activity-log row. No `IRequestApp`, `Job`, response envelope, or response DTO in a signature; a model query on `client` is the defect.
    - A method, private included, that calls no repository, cache, queue, domain, `RequestStoreService`, `FileService`, `AwsS3Service`, `JwtService`, or `SentryService` and returns a value is a util method once it exceeds three lines or has two call sites; the same shape inline in two methods or two domains is one util method.
    - An assert is a util predicate plus the throw: `if (!this.roleUtil.outranks(actor, target)) throw new RoleRankForbiddenException()`.
    - A method returning its argument or a single util call is deleted.
- Aggregation domain (`src/modules/analytic/`): reads only. Injects other modules' analytic domains, any module's util, its own module's domains, utils, and caches (`src/modules/analytic/domains/analytic.fraud.domain.ts:96-97`), and the kit; never a repository, a queue class, or `DatabaseService`. Injected only by `analytic`'s own HTTP services.
- HTTP service (`services/<module>[.<concern>].http.service.ts`): the controller's only collaborator. Translates a request DTO into domain calls and the result into the envelope (`dto.md`), `{}` or `{ metadata }` with no data. Composes in sequence: a cross-module gate (`RoleDomain.assertActorOutranks`), then the subject domain or the cross-module write transaction it owns; prepares and stages activity-log rows around that call (`security.md`, Activity log); awaits another module's queue class for a post-commit side effect (`QueueBase.addSideEffect`). It and the processor service alone own that transaction, each feature domain joining as `*InTx(tx, ...)` and a guarded transition's write conflict mapped to that transition's exception (`database.md`, Transactions). No repository or business rule: it sequences, deciding nothing a domain decides, and throws only that mapped exception.
- Processor service (`services/<module>[.<concern>].processor.service.ts`): the same sequencing on the queue side, activity log excepted; translates a job payload, returns `IQueueResponse`, throws only `QueueException` (`queue.md`) and a mapped write conflict.
- Controller: one endpoint returning one HTTP service call (`http.md`).
- Util (`utils/<module>[.<concern>].util.ts`): pure shaping, arguments in and a value out. Injects `ConfigService` and the in-memory kit only (`Helper*`, `MessageService`, `DatabaseUtil`), never `DatabaseService`, `AwsS3Service`, `SentryService`, `JwtService`, a domain, or a `src/modules/` util. Every method is synchronous or awaits only a `Helper*` call, contains no `throw` (`PaginationQueryUtil` excepted), and is private or called outside its file. Maps an error to an exception and returns it; the caller throws. A builder needing request state or running writes is a factory (`database.md`, Access). An empty util is deleted with its provider entries.
- Queue class (`queues/<module>[.<concern>].queue.ts`): extends `QueueBase`, holds the `@InjectQueue`, builds and encrypts the payload, enqueues (`queue.md`, Enqueuing). Injected by its own module's domain or an HTTP or processor service; never by a controller. The one other `@InjectQueue` is the health indicator (`src/modules/health/indicators/health.queue.indicator.ts:14`).

## Tiers

| Tier | What | Who may inject it from another module |
| --- | --- | --- |
| 1 kit | the `src/common/` modules `common.module.ts` composes | anyone; a util takes the in-memory part only |
| 2 global feature | a domain module carrying `@Global()` | an HTTP service, processor service, guard, interceptor, or decorator; the aggregation domain its analytic domain and util; a feature domain its util |
| 3 feature | the rest of `src/modules/` | what its domain module exports, by an HTTP or processor service; its analytic domain and util by the aggregation domain; its util by a feature domain |

Read tier 2 from `@Global()`. `AwsModule` is imported where used. `src/common/` reaches a feature only through `common.module.ts` and `import type` (`src/common/request/interfaces/request.interface.ts:2`). Promote only a module-agnostic concept with three callers or more; an exported, complete member of a used family is kit surface, its `pnpm deadcode` warning no finding. YAGNI rejects a base, token, knob, branch, or stub.

## Module files

- `<module>.repository.module.ts`: repositories, `imports: []`, imported only by its own domain module.
- `<module>.domain.module.ts`: domains, utils, caches, queue classes, factories, strategies, interceptors, indicators; imports its repository module plus each non-`@Global()` feature domain module whose util it uses, nothing else; registers its queues with `BullModule.registerQueueAsync`, exports `BullModule`. `AnalyticDomainModule` imports the domain modules whose analytic domains it reads.
- `<module>.http.module.ts` and `<module>.processor.module.ts`: leaves imported only by `src/router/`, importing the domain modules their services inject.
- `src/router/http/router.http.<scope>.module.ts` imports each mounted controller's `<Module>HttpModule` plus the domain module of every non-`@Global()` feature whose guard those controllers carry (`src/router/http/router.http.user.module.ts:26-34`).

Only files with something to provide exist. A `@Module({})` lists `controllers` (`[]` in these four), `providers`, `exports`, `imports`, in that order. `forRoot()` runs once, in a root module: `src/app/app.module.ts`, `src/common/common.module.ts`, `src/router/router.module.ts`. A feature module imports neither the composed kit nor `QueueModule`. `tsc` and Vitest pass a broken `imports:`; boot to verify wiring (a cycle raises `ReferenceError`, a missing provider `UnknownDependenciesException`); `forwardRef` is no fix (`cross-module.md`).

## The run surface is a call site

A command, port, path, or script a change moves also moves in `package.json`, `scripts/`, `ci/`, the root `dockerfile` and `docker-compose.yml`, `.dockerignore`, `.env.example`, `.github/workflows/`, `.github/dependabot.yml`, `nest-cli.json`, `.swcrc`, `vitest.config.ts`, `knip.json`, `cspell.json`, `tsconfig*.json`, `eslint.config.mjs`, `.husky/`, and `.gitignore`.
