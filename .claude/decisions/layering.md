# Layering decisions

## Layers and modules

### One use case per action, logic shared downward in services

Rule: `layering.md`, Roles.

- Domains as orchestrators: a rules class that orchestrates other modules is a use case in disguise.
- Domain events for orchestration: in-memory events add a second, non-durable mechanism whose `suppressErrors` default swallows listener failures.
- Grouped multi-method use cases: a use case is one action called by one entry point.
- A separate `src/application/` tier: it gives the same cycle guarantee as use cases kept in their feature at a larger blast, moving the test hook's module mapping, the layout, the router, knip, and every spec mirror.

### A sequence over two modules of one level is sequenced by each use case

Rule: `service.md`, Shared transactions.

- In one participating module's service: it puts another domain's subject into that module's service, `WorkspaceService` creating users.
- A module's statements copied per use case: logic left unshared becomes duplicated code.
- A shared use case: a use case calling another use case brings the private-helper problem back one layer up.
- In the service of the module that owns the subject, calling the other module's `*InTx`: a service then reaches a module on its own level, and two domains are coupled below the use case.

### Join-request accept and reject, the two response interceptors' head, and the two term-policy prepares keep their copies as two subjects each

Rule: `code-style.md`, Types and comments; `service.md`, Methods.

- One body with a mode argument: the two rules of each pair change apart, and one body would branch on the mode at every line where they differ.

### Every use case implements `IAppUseCase` with its own argument and result types

Rule: `use-case.md`, Shape.

- A single input object: it changes every multi-parameter use case's signature and its callers.
- A marker interface with `execute(...args: never[]): Promise<unknown>`: the `unknown` result is what `null-safety.md` limits, and the type check is weak.

### Each module owns its request context, passed per parameter, its row used whole

Rule: `security.md`, Request store; `guards.md`, Contexts; `activity-entry.md`.

- Ids only from the context: every guarded request would read its row twice.
- The database for a displayed resource: the guard read the row on this request, so it is fresh.
- One context type family in the kit, passed whole: the kit must know every feature.
- One store object every guard merges into: the same feature knowledge in the kit, and one type holding every feature.
- An activity-log input shape each caller assembles: every caller repeats the same mapping.
- Services read the CLS store: the store is empty in a job, and the failure surfaces only at runtime.
- A job rebuilds the CLS store from its payload (`ClsService.run`): hidden state another job can forget to set.
- A context dropped from a receiver that reads none of its fields today: the receiver picks what it reads, and with every receiver taking the same contexts a later reader needs no new parameter at every call site.
- The full context in a job payload: a delayed or retried job decides on rows copied at request time.
- Identity on `request.user`: the request object would mix transport with authentication and authorization, which belong to the context.

### Levels, and a module is a domain

Rule: `layering.md`, Levels.

- A dependency order ranking every feature module, a service injecting any module below it: every new module renegotiates the list, and a service reaching a sibling's service couples two domains below the use case.
- A side effect reached through the owning module's service: the caller then injects a sibling's service; the queue class is the module's side-effect entry.
- A feature util exported to another module's service: the util's rule then changes under a caller its module does not own.
- Two-factor kept in `user` and `auth`: the pieces in `auth` had no caller there, and one factor's logic sat in two modules.

### `device` and `mfa` stay plain modules, and their callers' sequences sit in use cases

Rule: `layering.md`, Levels; `module-files.md`, `@Global()`.

- `device` or `mfa` as `@Global()`: no guard, strategy, interceptor, or decorator injects either, and `@Global()` is for guard-injected modules only.
- A `@Global()` module's service injecting another `@Global()` module's service: two domains of one level then couple below the use case.
- No service injecting any other module's service, a lower level included: a shared piece then has no lower service to move down into (`cross-module.md`, Composition).

### Another module's util logic a service needs is a method of the owner's service on a lower level, else a value its use case passes in

Rule: `layering.md`, Roles.

- The use case always passing the value in: every use case repeats a step a lower module's service, which the service may inject, already holds.
- The logic moved into `src/common/` (`AuthPasswordUtil` in the kit): it is auth-specific, and the kit takes only a module-agnostic concept with three callers or more.

### A processor injects its use cases only

Rule: `queue.md`, Processors; `injectable.md`.

- A processor constructor forwarding `SentryService`, `MessageService`, `CacheService`, and `OutboxService` to `super(...)`: a processor, like a controller, injects nothing but its use cases.

### Two modules per feature, processors registered in the processor router

Rule: `module-files.md`, Module files.

- One module per feature: `UserModule` and `WorkspaceModule` would import each other, a cycle only `forwardRef` resolves.
- Four modules per feature: two suffice once the use-case module is the leaf, and repository and processor modules add files without adding a boundary.
- The processor in its feature's use-case module: the feature module then registers its own worker, unlike a controller.
- A `<module>.processor.module.ts` per feature: one more module file for every feature with a queue.

### `@Global()` only for guard-injected modules, each with a no-argument `forRoot()`

Rule: `module-files.md`, `@Global()`.

- `ActivityLogModule` global: no guard, strategy, interceptor, or decorator injects it.
- Notification global: no guard injects it, and its importers name `NotificationModule` explicitly.
- Everything global: the NestJS modules guide calls it not a recommended design practice.
- `global: true` in `forRoot()`: the scope hides in a return value instead of on the class.
- A static `@Global() @Module({...})`: two shapes for one kind of module.
- A global module imported again by its use-case module or inside another `forRootAsync`: a global provider is already visible there.
- `FirebaseModule` global: three importers name it, as `AwsModule`'s importers do.

### A module exports its services, utils, and queue classes, never a cache

Rule: `module-files.md`, Module files.

- Caches exported beside services and utils: `cross-module.md` lets no other module reach a cache, so an exported cache is surface no importer may use.

### Only a repository queries the database client; the kit imports no module code or type

Rule: `layering.md`, Roles and Levels.

- `databaseService.client` in a service or use case: outside `withTransaction` every statement belongs to the repository that owns the model.
- `import type` from a feature into the kit: the kit still changes with a feature's shape.
- Kit-owned copies a feature extends (`IUser extends IRequestUser`): the kit then holds feature shapes.
- A generic bound at every call site: every annotation repeats one binding.

### Outbound HTTP goes through `@nestjs/http-client`

Rule: `injectable.md`, NestJS idiomatic.

- Global `fetch`: no injectable seam to double in a spec, and no client-wide timeout or redirect policy.
- `axios` or `@nestjs/axios`: each adds axios as a dependency where the NestJS client runs on native `fetch` with none.

### A seed writes through `DatabaseService`

Rule: `seeding.md`, Outside the layering.

- Seeds calling the feature services: a service write takes a request context and adds outbox effects, which a seed command neither has nor wants.

### Analytic stores its generated results; expensive signals are computed by a job

Rule: `analytic.md`, On request or generated.

- Computing every signal in the request behind a cache: the first reader of each window pays for the whole collection, and each later list page pays for it again.
- Analytic as a read-only module: it then has nowhere to keep a result.
- Every one-statement result on request behind a cache: a cache miss under heavy traffic scans the whole live population.
- Every whole-population result generated, a single-collection indexed count or a group answered whole included: it answers within the request, and a snapshot adds a job, an enum member, and a stale `computedAt` for no saving.
- A whole-collection group sorted and paged on request behind a per-page cache: each page miss repeats the group.
- A join per row of a whole live population on request because every lookup is indexed: a cache miss still joins every row.

### Every analytic read lives in the analytic module

Rule: `layering.md`, Levels.

- A per-module analytic service and repository: a metric is spread over fourteen modules, and a cross-collection pipeline has no owner.
- The root collection's module owning a cross-collection pipeline: the risk score would sit in the user module.

## Naming

### A Lua script, a raw query, or a pipeline's stages sit in the class that runs them

Rule: `naming.md`, Files; `analytic.md`, One statement.

- The script or the stages as a data constant in `constants/`: they read apart from the call that runs them.
- One method per pipeline with the shared stages copied: one signal is written twice.

### The `<module>.` file prefix stays

Rule: `naming.md`, Files.

- Short names (`sign-up.use-case.ts`): the prefix keeps every file findable by a search on its module name, matches the tree, and keeps the spec mirror unambiguous.

### A slug is refused, never converted

Rule: `naming.md`, Identifiers.

- Lower-casing the slug in the request schema: the slug stored would differ from the slug sent.

### Every zod schema lives in a dto file with its `Dto` type

Rule: `dto.md`; `naming.md`, Files.

- A cache or pipeline schema in `<module>.constant.ts`: a constant file sits outside the coverage thresholds, so a schema there carries no DTO spec.
- One sub-folder per schema kind (`dtos/cache/`): the kind already ends the file's noun (`-cache`, `-pipeline`), so the folder repeats it, and the sub-folders of `dtos/` name a transport direction.
- One grouped file per kind: it rebuilds the constant file under another name, where a DTO file declares one schema and its type and its spec mirrors that one schema.
- The `Dto` type replacing the `I*` interface: the schema is declared `satisfies z.ZodType<I*>`, so the interface is the contract it is checked against, and every service and repository signature would move onto a zod inference with no behavior gained.
- A piece reused across cache, pipeline, or snapshot schemas as a validation file (`AnalyticPipelineObjectIdSchema` under `validations/`): `validations/` serves the fields of request and environment schemas, and the piece is a schema of its own, like the schemas that reuse it.

### An acronym is a word in every identifier

Rule: `naming.md`, Identifiers.

- Upper-case acronyms from a closed list (`AuthJWTService`): beside a dependency's own name (`JwtService`), a Prisma model (`MfaPasskey`), and a word outside the list (`Base64Url`) the tree mixes two spellings of one word, the casing turns on the word's position in the name, and two acronyms in a row lose their boundary (`AWSSESService`).
- `SES` alone upper-case as the provider spelling: one acronym written apart from the others is an exception a reader remembers name by name.

### One name per analytic metric across route, enum, i18n key, method, and use case, its area singular

Rule: `analytic.md`.

- Singular routes over plural code names (`/user/churn` served by `usersChurn`): one metric then has two spellings, and a search for one misses the other.

## Lint and tests

### Lint enforces the layer matrix and six boundary policies, reading the `@Global()` set from the module files

Rule: `eslint.md`, Boundaries; `layering.md`, Levels.

- Lint derives the module graph and its cycles: about 230 lines of config for what the boot and the reviewer catch.
- The levels or the `@Global()` set written in the config: it drifts from the module files.
- `dependency-cruiser` as a second runner: a separate script and pre-commit step where the plugin runs inside `pnpm lint`.
- Rules text alone for the layer matrix: carve-outs are written one by one instead of following from a declared order.
- The levels in a separate data file: the feature names only move to another file.
- The level left to the reviewer: a breach waits for a review instead of failing the lint.

### Lint refuses the global number functions and, in `src/modules`, `@Inject(<queue enum>)`, leaves `Math.random` free, and keeps each message neutral

Rule: `eslint.md`; `queue.md`, Where things live; `security.md`, Cryptography; `eslint.config.mjs`, `numberGlobalRestrictions` and `injectQueueRestriction`.

- `Math.random` refused in every file: it is fine to use, and only out of place for an auth value, which `security.md`, Cryptography, already covers.
- The `@Inject(<queue enum>)` restriction on `src/common` and `src/app` too: the restriction binds feature code; the kit resolves a queue class by its token in `OutboxService` alone and no kit or app class injects one, so there it guards no code.
- A lint message naming the rule file that holds its rule: a message stays neutral, saying what is refused and what to do.

### Each section and each top-level constant of the lint config carries a one-line JSDoc

Rule: `code-style.md`, Types and comments.

- `eslint.config.mjs` dropped from the `paths:` of `code-style.md`: every other code-style rule would stop binding the file, where only the JSDoc limit differs for it.

### The typed lint rules are the four promise and exhaustiveness rules

Rule: `eslint.md`, Typed rules.

- `recommendedTypeChecked`: its `no-unsafe-*` family reports on every third-party boundary.

### The pre-commit hook lints, type-checks, and runs the related specs; CI is the gate

Rule: `testing.md`, Layout and runs.

- The full gate on every commit: it is slow enough that agents were told to skip it.
- lint-staged alone: a type error or a red spec surfaces only after the push.
- A `pre-push` hook: a second copy of what CI runs.

### Analytic pipelines are proven by review and a boot

Rule: `analytic.md`, One statement.

- Repository unit specs asserting the stages: a spec that repeats the stages passes on a pipeline MongoDB rejects.
- Testcontainers integration tests: integration is held (`testing.md`).

### A caller spec names an exception by `module` and `statusCode`

Rule: `testing.md`, Unit.

- Four fields in every caller block: the exception's own spec already pins every field, so a caller repeats them and catches nothing more.

### A unit spec runs the helpers and utils for real

Rule: `test-doubles.md`.

- Every collaborator doubled: a spec then asserts its own stub, and a helper bug passes every caller's spec.
- A real `MessageService`: it needs the i18n runtime and its language files.
- A real `PaginationService`: it runs the page query on the Prisma delegate it is handed.
- A real repository or `DatabaseService`: that is the held integration suite.
- A `vi.spyOn` stub on a deterministic helper method to reach a `src/` branch: the branch no real input reaches is dead code, and the stub hides it (`AuthJwtService.remainingSeconds`).

### Mock reset and restore come from the unit project config, and a spec may still call the three `vi` mock calls

Rule: `testing.md`, Unit.

- A `vi.resetAllMocks()` and `vi.restoreAllMocks()` hook in every spec: order independence then rests on each of several hundred files remembering it.
- A lint ban on `vi.clearAllMocks()`, `vi.resetAllMocks()`, and `vi.restoreAllMocks()`: calling them is style only, since the unit project already resets and restores every mock.

### Each unit spec file runs isolated, on the default pool with four workers

Rule: `testing.md`, Unit.

- `isolate: false`: a module mock in one file leaked into the next file a worker ran, failing an unrelated spec under a shuffled order, and only a hand-written cleanup rule guarded it.
- An isolated project only for the specs that mock modules: the config would scan spec contents to split two projects, for a few seconds per run.
- The `threads` pool: a few seconds faster, but the default `forks` pool is the most compatible with native modules and `process` APIs.
- The `vmThreads` and `vmForks` pools: `instanceof` breaks across VM contexts, and the exception filters and Prisma error mapping rely on it.
- More workers: measured barely faster, since loading each file's modules dominates, and they slow the machine.

## Logging line shape

### A line carrying an error or fields is object-first

Rule: `injectable.md`, Logger.

- Message-first with the error as an extra argument: nestjs-pino drops the error.
- Every level object-first: it changes call sites that carry no error.
