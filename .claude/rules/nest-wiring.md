# Nest wiring

What a module may reach for is `rules/cross-module.md`. This file is the mechanics: providers,
imports, exports, global modules, and the registration sites.

## The composition roots

There are exactly three, and no fourth is invented:

| Root | Owns |
|---|---|
| `src/app/app.module.ts` | the `APP_FILTER` chain; imports `CommonModule` and `RouterModule` |
| `src/common/common.module.ts` | every global infrastructure module and the app-wide feature modules |
| `src/router/router.module.ts` | the five HTTP prefix modules and `RouterProcessorModule` |

`src/router/http/router.http.<scope>.module.ts` registers controllers under their prefix
(`rules/router.md`); `src/router/processor/router.processor.module.ts` aggregates every
`<feature>.processor.module.ts` and provides nothing itself (`rules/queue.md`); and
`src/queues/queue.register.module.ts` is `@Global()` and holds every
`BullModule.registerQueueAsync` with its job defaults.

## Global modules are imported once

`RedisCacheModule`, `CacheMainModule`, `QueueRegisterModule`, `DatabaseModule`, `MessageModule`,
`LoggerModule`, `RequestModule`, `ResponseModule`, `HelperModule`, `PaginationModule`,
`FileModule`, `FirebaseModule` are composed inside `common.module.ts` through their `forRoot()`
/ `forRootAsync()` and are `global: true`.

**A feature module never imports one of them.** Injecting `DatabaseService` or
`PaginationService` needs no `imports:` entry, and adding one is drift that reads as if the
module owned a second instance. The same holds for a `@Global()` feature module: it is tier 2
(`rules/architecture.md`), reachable without an import.

`forRoot()` is called ONCE, at the composition root. A `forRoot()` inside a feature module is a
second instance of something that is supposed to be shared.

## The four module files of a feature

One feature, one folder, up to four modules — each owning exactly one layer:

```
src/modules/<feature>/
├── <feature>.repository.module.ts   <Feature>RepositoryModule   repositories
├── <feature>.module.ts              <Feature>Module             domain services + utils
├── <feature>.http.module.ts         <Feature>HttpModule         HTTP services
└── <feature>.processor.module.ts    <Feature>ProcessorModule    processors + processor services
```

**Only the files with something to provide exist.** A feature with no queue work has no
`<feature>.processor.module.ts`; one with no route has no `<feature>.http.module.ts`. An empty
`providers:` array is the signal that the file should not have been created.

**A util is provided by `<feature>.module.ts`**, beside the domain services, and exported by it
when another module injects it. A repository therefore never injects a util from its own
feature — what the util built arrives as a parameter (`rules/architecture.md`).

The import graph is fixed, and it is acyclic by construction:

```ts
@Module({ providers: [WorkspaceRepository], exports: [WorkspaceRepository], imports: [] })
export class WorkspaceRepositoryModule {}          // repositories only, imports nothing

@Module({ imports: [WorkspaceRepositoryModule], providers: [WorkspaceService, WorkspaceUtil], exports: [WorkspaceService, WorkspaceUtil] })
export class WorkspaceModule {}                    // domain services and utils

@Module({ imports: [WorkspaceModule], providers: [WorkspaceHttpService], exports: [WorkspaceHttpService] })
export class WorkspaceHttpModule {}                // HTTP services only

@Module({ imports: [WorkspaceModule], providers: [WorkspaceProcessor, WorkspaceProcessorService] })
export class WorkspaceProcessorModule {}           // processor classes + their services
```

- **`<feature>.repository.module.ts` imports NOTHING.** It is the bottom of the graph:
  `imports: []`, providers and exports carrying the feature's repositories and nothing else.
  Everything a repository injects is tier 1 or tier 2 (`rules/architecture.md`), and both are
  reachable with no import.
- **`<feature>.repository.module.ts` is imported by its OWN feature only (HARD).** The one
  importer is `<feature>.module.ts`. Another feature reaches the data through the owning
  DOMAIN service, never through the repository module (`rules/cross-module.md`).
- **`<feature>.module.ts` is what another feature consumes.** It exports its domain services,
  and its utils where another module injects them.
- **`<feature>.http.module.ts` and `<feature>.processor.module.ts` are LEAVES.** Nothing imports
  them except `src/router/`. A feature module that imports another feature's HTTP or processor
  module has reached for the wrong layer — it wants the domain service.
- **`controllers:` stays empty in every one of the four.** A controller is registered by
  `router.http.<scope>.module.ts` (`rules/router.md`). A controller registered in a feature
  module mounts OUTSIDE the route prefix, so the endpoint exists at the wrong path with nothing
  failing.
- **A processor class is provided by `<feature>.processor.module.ts`**, beside the processor
  service it dispatches to (`rules/queue.md`).
- **`exports` is a contract.** Export what another module consumes, plus a service a guard in
  another module needs. Internal helpers stay unexported.
- **`imports` lists what this module actually injects.** An import nobody uses is noise that
  makes a real cycle harder to see.

## What a cross-module import may target

| You need | Import |
|---|---|
| another feature's business behaviour | `<Feature>Module` |
| another feature's data | `<Feature>Module` — its domain service reads and writes it |
| another feature's util, feature not `@Global()` | `<Feature>Module`, which exports it |
| anything from a `@Global()` feature, or from `src/common/` | nothing — it is already reachable |

`<Feature>RepositoryModule`, `<Feature>HttpModule` and `<Feature>ProcessorModule` are never a
legitimate import target outside their own feature — the first stops at its own
`<feature>.module.ts`, the other two at `src/router/`.

## Never `forwardRef` between feature modules (HARD)

A circular import is a broken boundary to re-architect, not a hazard to work around. See
`rules/cross-module.md` for the three ways out.

## Injection is by class

Inject services and repositories as CLASSES. No `@Inject`, no string token, no interface token
— a repository has exactly one implementation and a feature service has one too. A DI token is
only for a real swappable seam, and then it is PascalCase wrapped in `Symbol()`
(`rules/naming.md`).

A service still `implements I<Feature>Service`; a repository gets no header interface
(`rules/architecture.md`).

## Wiring defects surface only at boot

`tsc` and jest both pass with a broken `imports:` array in place. Two failures live there and
neither has a compile-time symptom:

- a **cycle** — a runtime `ReferenceError` or `Cannot access '…' before initialization` during
  bootstrap;
- an **unresolvable provider** — `UnknownDependenciesException: Nest can't resolve dependencies
  of the <Class> (…, ?, …)`, raised when a class injects something no module in its context
  provides. An `import` of a module, a `provider` and an `export` of it are three separate
  obligations, and satisfying two of them still fails.

**Any change to an `imports:`, `providers:`, or `exports:` array is verified by BOOTING the
app**, not by a green type-check.
