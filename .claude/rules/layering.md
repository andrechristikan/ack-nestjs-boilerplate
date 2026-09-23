# Layering

Five roles on the request path, one reason to change each:
`Controller → HTTP Service → Domain → Repository → DatabaseService`, with
`Processor → Processor Service` joining at the domain. Two supporting classes: a util, which shapes data,
and a queue class, the one place a job is enqueued. Procedure for a new module: the `ack-add-module` skill.

## Roles

- Repository (`repositories/<module>[.<concern>].repository.ts`): data access only. Injects `DatabaseService`
  as a class; every statement runs on `this.databaseService.client` or on the `tx` of an `*InTx` method. Owns
  one Prisma model plus satellite models with no repository of their own, and `null → {}` filter
  normalization. Returns Prisma models, `I<Module>*` shapes, or primitives; never a response DTO, never
  `unknown`. Takes a request DTO only when no layer above derived from it. Implements
  `I<Module>[<Concern>]Repository` from `interfaces/`. Reads `ConfigService` for write mechanics only; a
  business value arrives as a parameter. Does not inject another repository.
- Domain (`domains/<module>[.<concern>].domain.ts`): business rules, typed exceptions, orchestration across
  its own repositories and other domains. No `IRequestApp`, no `Job`, no response envelope, no response
  DTO in a signature. Injects `DatabaseService` only to call `withTransaction`; a model query on `client`
  here is the defect. The only layer another feature consumes.
- HTTP service (`services/<module>[.<concern>].http.service.ts`): the controller's only collaborator.
  Translates a request DTO into the domain call and the result into a response DTO or pagination
  envelope. No business rule, no repository.
- Processor service (`services/<module>[.<concern>].processor.service.ts`): the same shape on the queue
  side; translates a job payload and returns `IQueueResponse` (`queue.md`).
- Controller: one endpoint, one HTTP service method. Decorators and param extraction only.
- Util (`utils/<module>[.<concern>].util.ts`): pure shaping, arguments in and a value out. Injects
  `ConfigService` and the in-memory kit only (`Helper*`, `MessageService`, `DatabaseUtil`); no cache,
  repository, `Queue`, `RequestStoreService`, `FileService`, or another module's util. Maps an error to
  an exception and returns it; the caller throws. An empty util is deleted with its provider entries.
- Queue class (`queues/<module>[.<concern>].queue.ts`): holds the `@InjectQueue`, builds the payload,
  encrypts sensitive fields, calls `add` / `upsertJobScheduler`. Injected by a domain or processor
  service, never by a controller or HTTP service.

## Header interfaces

A repository has one, alone in its file, and callers inject the class. Domain, HTTP service, processor
service, util, cache, queue, factory, and every `src/common/` service get none. Data shapes (`IUser`,
payloads, option bags) and framework contracts stay. Inject by class; a DI token is only for a real seam.

## Tiers

| Tier | What | Who may inject it |
|---|---|---|
| 1 kit | the `src/common/` modules `common.module.ts` composes | anyone; a util takes the in-memory part only |
| 2 global feature | a `src/modules/<x>` domain module carrying `@Global()` | anyone, same carve-out |
| 3 feature | the rest of `src/modules/` | its own layers; from another module only what its domain module exports, injected by a domain, HTTP service, or processor service |

Read tier 2 from `@Global()` in the code. `AwsModule` is imported where used. A util never injects another
module's util in any tier. `src/common/` never imports a feature's runtime code; `common.module.ts` composition
and compile-time enums are the only crossings. Promote only a module-agnostic concept with three or more callers.

## Module files

`<module>.repository.module.ts` (repositories, `imports: []`, imported only by its own domain module and
`MigrationModule`); `<module>.domain.module.ts` (domains, utils, caches, queue classes, factories; registers
its queues with `BullModule.registerQueueAsync` and exports `BullModule`); `<module>.http.module.ts` (HTTP
services); `<module>.processor.module.ts` (processors and processor services). The last two are leaves
imported only by `src/router/`. Only files with something to provide exist. `controllers: []` in all four:
`src/router/http/router.http.<scope>.module.ts` registers controllers and
`src/router/processor/router.processor.module.ts` aggregates processor modules. Composition roots:
`src/app/app.module.ts`, `src/common/common.module.ts`, `src/router/router.module.ts`; `forRoot()` runs once,
there. A feature module imports none of the composed kit and never `QueueModule`.

## Boot-only defects

`tsc` and Vitest pass with a broken `imports:` array. A cycle raises `ReferenceError` at bootstrap; a
missing provider raises `UnknownDependenciesException`; a class injected through `import type` compiles and
fails DI under `verbatimModuleSyntax`. Verify a wiring change by booting. `forwardRef` is not a fix (`cross-module.md`).

## Kit breadth is not YAGNI

An exported, complete member of a family with a used member is kit surface whatever its call-site count; a
`pnpm deadcode` warning on it is not a finding. YAGNI rejects structure: a base, a token, a knob, a branch, a stub.

## The run surface is a call site

A command, port, path, or script a change moves also moves in `package.json`, `scripts/`, `ci/`,
`docker-compose.yml`, `.github/workflows/`, `.github/dependabot.yml`, `nest-cli.json`, `vitest.config.ts`,
`knip.json`, `tsconfig*.json`, `eslint.config.mjs`, and `.husky/`.
