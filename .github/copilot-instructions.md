# GitHub Copilot instructions

Where this file and a `.claude/rules/` rule differ, the rule wins.

## Route decorator order

The decorator nearest the method runs first. Keep this order, skipping what a route lacks. Rule: `.claude/rules/guards.md`.

```typescript
@Doc({ summary: '…' })                 // 1.  OpenAPI operation + error kit
@Response('example.action')            // 2.  @Response / @ResponsePagination / @ResponseFile
@Header(name, value)                   // 3.  Static response header
@TermPolicyAcceptanceProtected(...)    // 4.  Term policy
@PolicyProtected({...})                // 5.  CASL policy, admin routes
@RoleProtected(...)                    // 6.  Role, admin routes
@ProjectProtected(...)                 // 7.  Project and the caller's member; pass roles to gate by role
@WorkspaceProtected(...)               // 8.  Workspace and the caller's member; pass roles to gate by role
@UserProtected()                       // 9.  User status
@FeatureFlagProtected(...)             // 10. Feature flag; reads RequestActorStoreKey, so above JWT
@RequestThrottleProtected({ user: true }) // 11. Per-user throttle; runs after JWT
@AuthJwtAccessProtected()              // 12. JWT; a social login guard sits above 10
@ApiKeyProtected()                     // 13. API key; @ApiKeySystemProtected() on every system route
@FileUploadSingle() @RequestTimeout(RequestUploadTimeout) // 14. Upload routes: multipart interceptor, then timeout
@HttpCode(HttpStatus.OK)               // 15. @Post only
@Get('/endpoint')                      // 16. HTTP method, last
```

`@RequestThrottleProtected` takes `{ user: true, route? }` on a JWT route and `{ route }` only on `public` and `system`. A `@Post` that creates a row keeps 201. An admin-scope controller carries no `Workspace*` or `Project*` guard. An endpoint body is `return this.<module>[<Concern>]<Action>UseCase.execute(...);`: the use case builds every envelope, `{}` included.

## DTOs are zod

A `*.dto.ts` file exports one schema const and its type: `export const XRequestSchema = z.strictObject({ ... })`, `export type XRequestDto = z.infer<typeof XRequestSchema>`. A response schema is `z.object`. Rule: `.claude/rules/dto.md`.

## Concurrency

Independent calls run concurrently in `Promise.all([...])` or `Promise.allSettled([...])`, statements on one `tx` included. Rule: `.claude/rules/concurrency.md`.

## Imports

A class Nest injects is a value import, not `import type`. Rule: `.claude/rules/code-style.md`.

## Tests

Behavior is built test-first; a spec mirrors its subject's `src/` path under `test/unit/`. Rule: `.claude/rules/testing.md`.

## Errors

A request failure extends `AppBaseException`, a job failure `QueueException`, anything else `AppUnknownException`; a caught error is wrapped, never swallowed. Rule: `.claude/rules/exceptions.md`.

## Hard rules

From `.claude/rules/discipline.md`, which outranks every other rule:

- A flow whose writes span more than one table or include an outbox row commits them in one transaction (one per chunk of a paging job) its use case opens; services and repositories join through `*InTx` methods.
- Validation fails fast, before the transaction opens; the write still carries its guard.
- A side effect is an outbox row written in the causing action's transaction, enqueued after the commit through the owning module's queue class; a scheduler job has no row.
- A service injects no other module's util or same-level service; a use case sequences them.
- A result is one statement, never a first query whose rows drive a second.
- A row a guard loaded comes from its context, whole, never read again.
- Every instance is interchangeable: shared state lives in MongoDB or Redis, never in process memory or on local disk; a recurring job is a BullMQ job scheduler.
