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
| its repository | yes — import `<Feature>RepositoryModule`; from your repository or your domain service |
| its util, from your SERVICE layer | yes — import `<Feature>UtilModule` |
| its util, from your REPOSITORY | **no** unless the owning module is `@Global()` — tier 3 stops at the service layer (`rules/architecture.md`) |
| its HTTP service or processor service | **no** — those are leaves the router consumes; you want the domain service |
| its enums, interfaces, constants, DTOs | yes — compile-time only, no wiring needed |
| its exceptions | **no** — a module throws its OWN typed exception |
| a service it did not export | no |
| its Prisma model through your own `DatabaseService` | no — that bypasses the owning repository |

**Everything a `@Global()` module exports is reachable with no import at all**, on the same
terms as `src/common/`, including from a repository. That is tier 2 in
`rules/architecture.md`, and it is the only way a util reaches another module's repository.
When a util genuinely belongs in several modules' repositories, move it to the module that
owns the concept and make that module global — do not inject it across a tier 3 boundary.

**A module throws its own exceptions.** Catching `WorkspaceNotFoundException` in the project
module and rethrowing it is fine; constructing one from outside the workspace module is not —
the status code and the i18n path belong to the module that owns the enum
(`rules/status-code.md`).

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
`HelperService` or `PaginationService` is not a cross-module dependency and needs no import in
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
