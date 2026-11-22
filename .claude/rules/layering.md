# Layering

`Controller → Use case → Service → Repository → DatabaseService`, with `Processor → Use case` on the queue side. New module: `.claude/skills/ack-build/references/add-module.md`. Module files and `@Global()`: `module-files.md`. `src/migration/` sits outside this layering (`seeding.md`).

## Roles

- Repository (`repositories/<module>[.<concern>].repository.ts`): data access on one Prisma model and its satellites (`cross-module.md`), plus `null → {}` filter normalization. A statement runs on `this.databaseService.client` or an `*InTx` method's `tx` (`transaction.md`). Returns Prisma models, `I<Module>*` shapes, `IResponsePaginationReturn<T>` or its cursor half `IPaginationCursorReturn<T>` for an internal cursor read, or primitives. Takes a request DTO only when no layer above derives from it. Implements `I<Module>[<Concern>]Repository`, alone in its file; a class gets no other project-declared header interface but `IAppUseCase` on a use case (`use-case.md`) and `IMigrationSeed` on a seed (`seeding.md`); callers inject by class, a DI token only for a real seam. Reads `ConfigService` for write mechanics only. Injects no repository.
- Analytic repository (`repositories/analytic.<area>.repository.ts`): read-only statements over any module's model, the builder or one `aggregateRaw` pipeline (`analytic.md`). Implements `IAnalytic<Area>Repository`. Injects `DatabaseService`, `AnalyticPipelineUtil`, `PaginationOffsetUtil` where a pipeline list pages, `PaginationService` where a builder list pages, and the in-memory kit (`Helper*`); never `ConfigService`. Injected only by its area's `analytic.<area>.service.ts`. `AnalyticSnapshotRepository` alone writes.
- Service (`services/<module>[.<concern>].service.ts`): its module's application logic: its operations and the invariants it keeps (`service.md`). Injects its own module's repositories, services, utils, caches, factories, and indicators; the services of a lower level (Levels); the queue class of any module (`effects.md`); `ConfigService`; and the kit's services and utils. Never another module's repository or cache.
- Use case (`use-cases/<module>[.<concern>].<action>.use-case.ts`): the business logic of one user- or job-facing action: which application operations run, in which order, across which modules, inside the transaction it alone opens (`transaction.md`), with which outbox effects; it assembles services and writes no module's operation; one public method, `execute` (`use-case.md`). Injects any module's services, utils, and queue classes, `ConfigService`, and the kit's services and utils.
- Controller (`controllers/`): one endpoint returning one use case's `execute` (`http.md`). The use cases it injects are its own feature's.
- Processor (`processors/`): one job case awaiting one use case's `execute` (`queue.md`, Processors); a kit processor awaits its kit service (`CacheProcessor`, `OutboxProcessor`). Injects use cases of its own feature only.
- Util (`utils/<module>[.<concern>].util.ts`): pure shaping a module shares, arguments in and a value out: a public method with two or more callers (each a class, the util itself included) or one caller outside the module (a use case, a seed); a method only the util itself calls is private; any other pure method lives in its module's service (`service.md`, Methods). Another module's util logic a service needs is a method of that module's service when it sits on a lower level, and otherwise a value its use case passes in. A kit util (`src/common/`) is the kit's own split and exempt from the caller count; an unused member of a used family carries `/** @public */`. Injects `ConfigService` and the in-memory kit only (`Helper*`, `MessageService`, `DatabaseUtil`, `LoggerUrlUtil`), never `DatabaseService`, `AWSS3Service`, `SentryService`, or `JwtService`; `PaginationQueryUtil` also injects its sibling pagination utils (`PaginationCursorUtil`, `PaginationOffsetUtil`). Every method is synchronous or awaits only a `Helper*` call and contains no `throw` (`PaginationQueryUtil` and `PaginationFilterUtil` excepted). Maps an error to an exception and returns it; the caller throws. A builder needing request state or running writes is a factory (`database.md`). An empty util is deleted with its provider entries.
- Queue class (`queues/<module>[.<concern>].queue.ts`): the module's side-effect entry. It holds the `@InjectQueue`, builds the module's effects (`<action>Effect`, `effects.md`), enqueues its committed outbox rows (`outbox.md`, Dispatch), and schedules its recurring jobs (`queue.md`, Enqueuing). Injects its own module's utils, `ConfigService`, and the kit's services and utils, never a feature module's service or another queue class. Provided and exported by its own module; a service or a use case of any module injects it.

Logic two use cases share over one module moves down into that module's service; a step that needs another module on its level is a use case's and moves up.

## Levels

A level imports the levels below it and never a higher one, a queue class aside. Lowest first:

1. the kit: `src/common/` and `src/app/`
2. the `@Global()` feature modules (`module-files.md`, `@Global()`)
3. every other feature module
4. use cases, then controllers and processors

- A module is a domain: what two modules do together is a use case's sequence (`use-case.md`, Transactions).
- A queue class is the one class a service injects from a module on its own level or above: a side effect belongs to the module that owns its job, whoever causes it (`effects.md`).
- No import cycle at any level (`cross-module.md`, Composition).
- `analytic` owns every analytic read: no other module has an analytic service or repository. Its services inject its own repositories, services, utils, and caches, and `FeatureFlagService`; never another module's repository or a queue class. Only its refresh job writes its snapshots (`analytic.md`).
- The kit, every `src/common/` module (those `common.module.ts` composes, and `AWSModule` and `FirebaseModule`, imported where used), sits below every feature; anyone injects it.
- Lint enforces the layer matrix and the service and util edges of `eslint.md`, Boundaries: a new edge adds an import, and `reviewer` checks the module files' imports against these levels.

Promote only a module-agnostic concept with three callers or more; an exported, complete member of a used family is kit surface and carries `/** @public */`, which `pnpm deadcode` skips. YAGNI rejects a base, token, knob, branch, or stub; the one stub is a provider adapter whose provider is not chosen, a no-op that logs and returns (`NotificationSMSDeliveryService`).

## The run surface is a call site

A command, port, path, or script a change moves also moves in `package.json`, `scripts/`, `ci/`, the root `dockerfile` and `docker-compose.yml`, `.dockerignore`, `.env.example`, `.github/workflows/`, `.github/dependabot.yml`, `nest-cli.json`, `.swcrc`, `vitest.config.ts`, `knip.json`, `cspell.json`, `tsconfig*.json`, `eslint.config.mjs`, `.husky/`, and `.gitignore`. The release workflow attaches `sbom.cdx.json`, built by `pnpm sbom` from the lockfile.
