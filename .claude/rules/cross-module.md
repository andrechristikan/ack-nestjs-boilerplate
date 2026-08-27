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
| its exported service | yes — inject the class |
| its repository | yes when the feature module imports the owning module, and the repository is exported |
| its enums, interfaces, constants, DTOs | yes — compile-time only, no wiring needed |
| its exceptions | **no** — a module throws its OWN typed exception |
| a service it did not export | no |
| its Prisma model through your own `DatabaseService` | no — that bypasses the owning repository |

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

A controller is registered by `src/router/routes/routes.<scope>.module.ts`
(`rules/router.md`) and a BullMQ processor by `src/queues/queue.module.ts`
(`rules/queue.md`). The FILES live in the feature module; only the registration is external.
A feature module that registers its own controller is drift.

## Workspace scoping crosses modules too

A workspace-scoped route in ANY module resolves its subject from the `x-workspace-id` header
through the workspace guards, and carries `@FeatureFlagProtected('workspace')`
(`rules/http.md`). That obligation follows the SURFACE, not the module — a project, user, or
notification route that is workspace-scoped carries it exactly as a workspace route does.
