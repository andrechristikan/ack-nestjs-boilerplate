# GitHub Copilot instructions

The root `AGENTS.md` is the shared digest; this file adds what an inline suggestion needs beyond it. When this file and a `.claude/rules/` rule disagree, the rule wins.

## Route decorator order

The decorator nearest the method runs first. Keep this order; omit what a route does not need. Rule: `.claude/rules/guards.md`.

```typescript
@Doc({ summary: '…' })                 // 1.  OpenAPI operation + global error kit
@Response('example.action')            // 2.  @Response / @ResponsePagination / @ResponseFile
@Header(name, value)                   // 3.  Static response header, when set
@TermPolicyAcceptanceProtected(...)    // 4.  Term policy
@PolicyProtected({...})                // 5.  CASL policy, admin routes
@RoleProtected(...)                    // 6.  Role, admin routes
@ProjectProtected(...)                 // 7.  Project and the caller's project member; pass roles to gate by role
@WorkspaceProtected(...)               // 8.  Workspace and the caller's member; pass roles to gate by role
@UserProtected()                       // 9.  User status
@FeatureFlagProtected(...)             // 10. Feature flag; reads RequestActorStoreKey, so above JWT
@RequestThrottle({ user: true })       // 11. Per-user throttle guard; runs after JWT
@AuthJwtAccessProtected()              // 12. JWT; a social login guard sits above 10, so the flag runs first
@ApiKeyProtected()                     // 13. API key; @ApiKeySystemProtected() on every system route
@FileUploadSingle() @RequestTimeout(RequestUploadTimeout) // 14. Upload routes: multipart interceptor, then timeout
@HttpCode(HttpStatus.OK)               // 15. @Post only
@Get('/endpoint')                      // 16. HTTP method, always last
```

`@RequestThrottle` takes `{ user: true, route? }` on a JWT route and `{ route }` only on `public` and `system`. A creating `@Post` keeps 201. An admin-scope controller carries no `Workspace*` or `Project*` guard. An endpoint body is `return this.<module>[<Concern>]<Action>UseCase.execute(...);`: the use case builds every envelope, `{}` included.

## DTOs are zod

A `*.dto.ts` file exports one schema const and its type: `export const XRequestSchema = z.strictObject({ ... })`, `export type XRequestDto = z.infer<typeof XRequestSchema>`. A response schema is `z.object`. No hand-written interface beside a schema, no class DTO. Folders: `dtos/request/`, `dtos/response/`. Rule: `.claude/rules/dto.md`.

## Concurrency

Async-first: independent calls run concurrently in `Promise.all([...])` or `Promise.allSettled([...])`; a held promise or a sequential `await` of independent work only where `.claude/rules/concurrency.md` allows.

## Imports

Aliases: `tsconfig.json` `paths`. A class Nest injects is a value import, not `import type`. Rule: `.claude/rules/code-style.md`.

## Tests

A spec mirrors its subject's `src/` path under `test/unit/`; `pnpm test user` filters. Reused logic is a helper. Rule: `.claude/rules/testing.md`.

## Errors

A request failure extends `AppBaseException`, a job failure `QueueException`, anything else `AppUnknownException`. Rethrow only inside an `instanceof` guard of our own exception, else wrap: `AppUnknownException`, in a processor `throwUnknownException`. Rule: `.claude/rules/exceptions.md`.

## Discipline

Suggest the minimum the change needs: no unrequested option or abstraction, no handling for a case the types exclude, nothing beside the change. Rule: `.claude/rules/discipline.md`.

## Prisma schema

Edit `prisma/schema.prisma`; applying it is the owner's (`AGENTS.md`).
