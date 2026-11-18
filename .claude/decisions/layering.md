# Layering decisions

## Layers and modules

### One use case per action, logic shared downward in services

Rule: `layering.md`, Roles.

- Domains as orchestrators: a rules class that orchestrates other modules is a use case in disguise.
- Domain events for orchestration: in-memory events add a second, non-durable mechanism whose `suppressErrors` default swallows listener failures.
- Grouped multi-method use cases: a use case is one action called by one entry point.
- A separate `src/application/` tier: it gives the same cycle guarantee as use cases kept in their feature at a larger blast, moving the test hook's module mapping, the layout, the router, knip, and every spec mirror.

### A shared cross-module sequence sits in the highest module's service when its subject is that module's

Rule: `service.md`, Shared transactions.

- Always in the highest participating module's service: it puts a lower module's subject into a higher module's service, `WorkspaceService` creating users.
- A module's statements copied per use case: logic left unshared becomes duplicated code.
- A shared use case: a use case calling another use case brings the private-helper problem back one layer up.

### Every use case implements `IAppUseCase` with its own argument and result types

Rule: `use-case.md`, Shape.

- A single input object: it changes every multi-parameter use case's signature and its callers.
- A marker interface with `execute(...args: never[]): Promise<unknown>`: the `unknown` result is what `null-safety.md` limits, and the type check is weak.

### Each module owns its request context, passed per parameter

Rule: `security.md`, Request store.

- One context type family in the kit, passed whole: the kit must know every feature.
- One store object every guard merges into: the same feature knowledge in the kit, and one type holding every feature.
- An activity-log input shape each caller assembles: every caller repeats the same mapping.
- Services read the CLS store: the store is empty in a job, and the failure surfaces only at runtime.
- A job rebuilds the CLS store from its payload (`ClsService.run`): hidden state another job can forget to set.
- The full context in a job payload: a delayed or retried job decides on rows copied at request time.
- Identity on `request.user`: the request object would mix transport with authentication and authorization, which belong to the context.

### The feature dependency order puts workspace above user, password-history above auth, and mfa between notification and term-policy

Rule: `layering.md`, Dependency order.

- Two-factor kept in `user` and `auth`: the pieces in `auth` had no caller there, and one factor's logic sat in two modules.
- `mfa` above `user`: the login and the re-authentication in `user` call it, so `user` would need a higher module's service.
- User above workspace: workspace services need user lookups and `lastWorkspaceId` writes as their own logic, while the user-side calls into workspace are orchestration that fits a use case.
- Password-history in the kernel: its service injects `AuthPasswordUtil`, so it sits above auth.
- `AuthPasswordUtil` in the kit: it is auth-specific, and the kit takes only a module-agnostic concept with three callers or more.

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

### Only a repository queries the database client; the kit imports no module code or type

Rule: `layering.md`, Roles and Dependency order.

- `databaseService.client` in a service or use case: outside `withTransaction` every statement belongs to the repository that owns the model.
- `import type` from a feature into the kit: the kit still changes with a feature's shape.
- Kit-owned copies a feature extends (`IUser extends IRequestUser`): the kit then holds feature shapes.
- A generic bound at every call site: every annotation repeats one binding.

### Outbound HTTP goes through `@nestjs/http-client`

Rule: `injectable.md`, NestJS idiomatic.

- Global `fetch`: no injectable seam to double in a spec, and no client-wide timeout or redirect policy.
- `axios` or `@nestjs/axios`: each adds axios as a dependency where the NestJS client runs on native `fetch` with none.

## Naming

### A Lua script or a raw query sits in the method that runs it

Rule: `naming.md`, Files.

- The script as a data constant in `constants/`: the script reads apart from the call that runs it.

### The `<module>.` file prefix stays

Rule: `naming.md`, Files.

- Short names (`sign-up.use-case.ts`): the prefix keeps every file findable by a search on its module name, matches the tree, and keeps the spec mirror unambiguous.

### A slug is refused, never converted

Rule: `naming.md`, Identifiers.

- Lower-casing the slug in the request schema: the slug stored would differ from the slug sent.

## Lint and tests

### Lint enforces the layer matrix only

Rule: `layering.md`, Dependency order.

- Lint derives the module graph, per-feature policies, and cycles: about 230 lines of config for what the boot and the reviewer catch.
- The dependency order hard-coded in the config: it drifts from the module files.
- `dependency-cruiser` as a second runner: a separate script and pre-commit step where the plugin runs inside `pnpm lint`.
- Rules text alone for the layer matrix: carve-outs are written one by one instead of following from a declared order.
- The dependency order in a separate data file: the feature names only move to another file.

### The typed lint rules are the four promise and exhaustiveness rules

Rule: `eslint.md`, Typed rules.

- `recommendedTypeChecked`: its `no-unsafe-*` family reports on every third-party boundary.

### The pre-commit hook lints, type-checks, and runs the related specs; CI is the gate

Rule: `testing.md`, Layout and runs.

- The full gate on every commit: it is slow enough that agents were told to skip it.
- lint-staged alone: a type error or a red spec surfaces only after the push.
- A `pre-push` hook: a second copy of what CI runs.

### A caller spec names an exception by `module` and `statusCode`

Rule: `testing.md`, Unit.

- Four fields in every caller block: the exception's own spec already pins every field, so a caller repeats them and catches nothing more.

## Logging line shape

### A line carrying an error or fields is object-first

Rule: `injectable.md`, Logger.

- Message-first with the error as an extra argument: nestjs-pino drops the error.
- Every level object-first: it changes call sites that carry no error.
