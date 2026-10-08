# GitHub Copilot instructions

`AGENTS.md` at the repository root is the shared digest; this file adds what an inline suggestion needs beyond it. When this file and a rule in `.claude/rules/` disagree, the rule wins.

## Route decorator order

The decorator nearest the method runs first. Keep this order; omit what a route does not need. Rule: `.claude/rules/http.md`.

```typescript
@Doc({ summary: '…' })                 // 1.  OpenAPI operation + global error kit
@Response('example.action')            // 2.  @Response / @ResponsePagination / @ResponseFile
@Header(name, value)                   // 3.  Static response header, when set
@TermPolicyAcceptanceProtected(...)    // 4.  Term policy
@PolicyProtected({...})                // 5.  CASL policy, admin routes
@RoleProtected(...)                    // 6.  Role, admin routes
@ProjectMemberProtected()              // 7.  Project membership
@ProjectProtected()                    // 8.  Project exists
@WorkspaceMemberProtected(...)         // 9.  Workspace membership; pass roles to also gate by role
@WorkspaceProtected()                  // 10. Workspace exists
@UserProtected()                       // 11. User status
@FeatureFlagProtected(...)             // 12. Feature flag; reads request.user, so above JWT
@AuthJwtAccessProtected()              // 13. JWT; a social login guard sits above 12, so the flag runs first
@ApiKeyProtected()                     // 14. API key; @ApiKeySystemProtected() on every system route
@FileUploadSingle() @RequestTimeout('1m') // 15. Upload routes: multipart interceptor, then timeout
@RequestThrottle({ user: true })       // 16. Throttle interceptor
@HttpCode(HttpStatus.OK)               // 17. @Post only
@Get('/endpoint')                      // 18. HTTP method, always last
```

`@RequestThrottle` takes `{ user: true, route? }` on a JWT route and `{ route }` only on `public` and `system`. A creating `@Post` keeps 201. An admin-scope controller carries no `Workspace*` or `Project*` guard. An endpoint body is `return this.<module>HttpService.<method>(...);`: the HTTP service builds every envelope, `{}` included.

## DTOs are zod

A `*.dto.ts` file exports one schema const and its type: `export const XRequestSchema = z.strictObject({ ... })`, `export type XRequestDto = z.infer<typeof XRequestSchema>`. A response schema is `z.object`. No hand-written interface beside a schema, no class DTO. Folders: `dtos/request/`, `dtos/response/`. Rule: `.claude/rules/dto.md`.

## Concurrency

Async-first: independent operations run concurrently, each call written directly as an element of `Promise.all([...])` (one failure fails the whole) or `Promise.allSettled([...])` (each outcome handled on its own). A `const` holds a promise, and a sequential `await` runs independent work, only in the cases `.claude/rules/code-style.md` lists.

## Imports

Aliases: `tsconfig.json` `paths`. A class Nest injects is a value import, not `import type`. Rule: `.claude/rules/code-style.md`.

## Tests

A spec mirrors its subject's `src/` path under `test/unit/`, `test/integration/`, or `test/e2e/`; an e2e flow across several routes is `test/e2e/flows/<module>.<flow>.spec.ts`. `pnpm test user` filters unit specs, and `pnpm test:integration` and `pnpm test:e2e` need Docker. Functions and arrows in a spec: the `ts/test-spec` block in `eslint.config.mjs`; reused logic is a helper. Rule: `.claude/rules/testing.md`.

## Prisma schema

Edit `prisma/schema.prisma`; do not apply it. The commands that apply it are the owner's (`AGENTS.md`).
