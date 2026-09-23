# GitHub Copilot instructions

`AGENTS.md` at the repository root is the shared digest; this file adds what an inline
suggestion needs beyond it. When this file and a rule in `.claude/rules/` disagree, the rule wins.

## Route decorator order

NestJS evaluates stacked decorators bottom-up: the decorator nearest the method runs first.
Keep this order and omit the lines a route does not need. Rule: `.claude/rules/http.md`.

```typescript
@Doc({ summary: '…' })                 // 1.  OpenAPI operation
@Response('example.action')            // 2.  @Response / @ResponsePagination / @ResponseFile
@TermPolicyAcceptanceProtected(...)    // 3.  Term policy
@PolicyProtected({...})                // 4.  CASL policy
@RoleProtected(...)                    // 5.  Role
@ProjectMemberProtected()              // 6.  Project membership
@ProjectProtected()                    // 7.  Project exists
@WorkspaceMemberProtected(...)         // 8.  Workspace membership
@WorkspaceProtected()                  // 9.  Workspace exists
@UserProtected()                       // 10. User status
@FeatureFlagProtected(...)             // 11. Feature flag
@AuthJwtAccessProtected()              // 12. JWT (access or refresh)
@ApiKeyProtected()                     // 13. API key
@HttpCode(HttpStatus.OK)               // 14. HTTP status, only on @Post
@Get('/endpoint')                      // 15. HTTP method, last
```

`@RequestThrottle(...)` mounts an interceptor and sits outside this order. An admin-scope controller carries no `@Workspace*Protected` or `@Project*Protected` decorator.

## DTOs are zod

A `*.dto.ts` file exports one schema const and its inferred type: `export const XRequestSchema
= z.strictObject({ ... })` and `export type XRequestDto = z.infer<typeof XRequestSchema>`. A
request schema is `z.strictObject`; a response schema is `z.object`. No hand-written interface
beside a schema; no class DTO. Folders: `dtos/request/`, `dtos/response/`. Rule: `.claude/rules/dto.md`.

## A `this.` call lands in a `const` first

Assign `this.x()` or `this.dep.x()` to a `const` before using the value as an argument, an
object property, a condition, a ternary branch, part of a compound expression, a template, a
spread, a `for…of` iterable, an index, or a `throw` operand. Inline stays allowed for
`return this.x()`, an arrow whose whole body is the call, an array element, and
`this.m.bind(this)`. Rule: `.claude/rules/code-style.md`.

## Imports

Alias imports only, from `tsconfig.json` `paths` (`@app/*`, `@common/*`, `@configs/*`,
`@modules/*`, `@router/*`, `@migration/*`, `@queues/*`, `@test/*`, `@generated/*`). No `./` or
`../`, including inside the same module. A class Nest injects is a value import, not `import type`.

## Tests

`pnpm test <module>` scopes the run to a Vitest path filter, for example `pnpm test user`.
Specs live under `test/**/*.spec.ts` (`.claude/rules/testing.md`).

## Prisma schema

Edit `prisma/schema.prisma`; do not apply it. The commands that apply it are the owner's
(`AGENTS.md`).
