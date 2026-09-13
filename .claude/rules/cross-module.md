# Crossing a module boundary

Wiring mechanics are `rules/nest-wiring.md`. This file is about what one feature module may
reach for in another, and what it must not.

## What a module exports

A feature module exports what other modules consume — normally its service, sometimes a
guard-backing service. **Internal helpers stay unexported.** An export is a contract; adding
one because "someone might need it" is how a module's private shape becomes load-bearing
elsewhere.

## What you may reach for

| From another module | Allowed? |
|---|---|
| its exported DOMAIN service | yes — inject the class, import `<Feature>Module` |
| its exported queue class, from your SERVICE layer | yes — import `<Feature>Module`, which exports it; a domain or processor service enqueues, a controller never does (`rules/queue.md`) |
| its exported util, from your SERVICE layer | yes — import `<Feature>Module`, which provides utils too |
| its exported util, from your REPOSITORY | **no** unless the owning module is `@Global()` — tier 3 stops at the service layer (`rules/architecture.md`) |
| its exported util, from YOUR util | **no**, `@Global()` or not — a util never injects another module's util, and what it needs arrives as an argument (`rules/architecture.md`) |
| its repository | **no** — `<Feature>RepositoryModule` is private to its own feature |
| its HTTP service or processor service | **no** — those are leaves the router consumes; you want the domain service |
| its enums, interfaces, constants, schemas | yes — compile-time only, no wiring needed |
| its exceptions | yes — when the missing or invalid subject is ITS entity (`rules/exceptions.md`) |
| a service it did not export | no |
| its Prisma model through your own `DatabaseService` | yes — when the statement belongs to a unit of work yours owns; no when the owning domain service already answers it |

## Reaching another module's MODEL

A repository holds `DatabaseService`, and that client exposes every model. What decides the
crossing is whether the statement belongs to a unit of work this repository OWNS.

- **A cascade over the rows your own aggregate owns is one `$transaction`, and every statement
  in it is issued by the repository that owns that transaction.** Soft-deleting a workspace also
  soft-deletes its projects, its pending invites and its members. Splitting those statements
  across the owning repositories either breaks atomicity or passes a transaction client across a
  module boundary, and both cost more than the crossing.
- **An audit row travels with the change it records** — written through the actor's
  `activityLogs` relation, or as an `activityLog` create, in the same statement or the same
  transaction as the change itself. A call issued afterwards can succeed against a change that
  rolled back.
- **A read that the same unit of work depends on** — resolving the row a write is about to use,
  inside the transaction that writes it.

Outside a unit of work of your own, the answer comes from the owning DOMAIN service. A policy
write confirming that its role exists calls `RoleService`; it does not read `client.role` for
itself, because nothing about that read has to be atomic with the write that follows. The other
module's REPOSITORY class stays closed either way.

## A repository module belongs to its own feature (HARD)

`<Feature>RepositoryModule` has exactly one importer: the `<feature>.module.ts` beside it. Data
that another module needs is reached through the owning DOMAIN service, which is the layer that
holds that feature's invariants — a caller holding the repository class skips every one of them,
and the owning module can no longer change its own query shapes without hunting call sites in
modules it does not know about. The model itself is a separate question, and it is answered
above.

When the domain service has no method for what the caller needs, ADD one there. A method on the
owning service is the correct answer even when it is three lines long; importing the repository
module to save those three lines is what this rule forbids.

**`src/migration/` is outside this rule.** The seeder CLI is its own composition root
(`MigrationModule`), it writes baseline rows rather than serving a request, and it reaches any
feature's repository module and repositories directly. A seed does not go through a domain
service to get there (`rules/seeding.md`).

**Importing a feature module pulls in more than a repository module does, so it can CREATE a
cycle.** The three ways out below apply exactly as they do to any other cycle; `forwardRef` is
not one of them.

**Everything a `@Global()` module exports is reachable with no import at all**, on the same
terms as `src/common/`, including from a repository. That is tier 2 in
`rules/architecture.md`, and it is the only way a util reaches another module's repository.
When a util genuinely belongs in several modules' repositories, move it to the module that owns
the concept and make that module global — do not inject it across a tier 3 boundary.

**That reach runs one way.** `@Global()` decides who may inject the util; it never widens what
the util may inject. A util injects no other module's util in either tier, and the value it
would have asked for is passed in by the service that called it (`rules/architecture.md`).

**An exception names the SUBJECT that failed, not the module that noticed.** The project module
throwing `WorkspaceNotFoundException` when the workspace is what is missing is correct: the
caller asked about a workspace, and the workspace module owns that answer, its status code and
its i18n path (`rules/status-code.md`). It throws `ProjectNotFoundException` when the project is
the missing one. What is wrong is a SECOND exception for another module's entity, allocated in
your own block — one missing workspace with two status codes depending on which route hit it.

## Never `forwardRef` between feature modules (HARD)

A circular import between two feature modules is a broken boundary to re-architect, not a
hazard to work around. `forwardRef` makes it boot; it does not make it correct, and it hides
the cycle from every later reader.

Three ways out, in order of preference:

1. **One direction is wrong.** Usually only one module genuinely needs the other; the reverse
   dependency is a convenience call that belongs on the caller's side.
2. **The shared piece has a third owner.** Extract it into the module that actually owns the
   concept, and let both import that.
3. **The coupling is event-shaped.** A fire-and-forget hand-off is a queue job, not a direct
   call (`rules/queue.md`).

## The shared kit is not a boundary crossing

`src/common/` is imported by everyone by design (`rules/common.md`). Reaching for
`HelperDateService` or `PaginationService` is not a cross-module dependency and needs no import in
the feature module — those modules are global.

## Registration lives outside the feature module

A controller is registered by `src/router/http/router.http.<scope>.module.ts`
(`rules/router.md`). A BullMQ processor is provided by its own feature's
`<feature>.processor.module.ts`, which `src/router/processor/router.processor.module.ts`
aggregates (`rules/queue.md`). The controller FILE lives in the feature module; only its
registration is external, and a feature module that registers its own controller is drift.

## Workspace scoping crosses modules too

A workspace-scoped route in ANY module resolves its subject from the `x-workspace-id` header
through the workspace guards, and carries `@FeatureFlagProtected('workspace')`
(`rules/http.md`). That obligation follows the SURFACE, not the module — a project, user, or
notification route that is workspace-scoped carries it exactly as a workspace route does.
