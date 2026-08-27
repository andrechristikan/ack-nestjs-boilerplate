# Swagger docs

Detail in `docs/doc.md`. The document is built in `src/swagger.ts` and served under the
configured `doc.prefix`. This file is the rule set for annotating an endpoint.

## One doc factory per endpoint

- Every endpoint has a matching decorator factory in `<module>/docs/<module>.<scope>.doc.ts`,
  named `<Module><Scope><Action>Doc`, composed with `applyDecorators` from the `Doc*`
  primitives.
- **The doc file mirrors the controller.** One exported factory per endpoint, in the same
  order. A route with no factory is undocumented, and nothing fails.
- The factory sits at the TOP of the decorator stack, above `@Response` (`rules/http.md`).

## The primitives

`Doc` · `DocAuth` · `DocGuard` · `DocRequest` · `DocRequestFile` · `DocResponse` ·
`DocResponsePaging` · `DocResponseFile` · `DocDefault` · `DocOneOf` · `DocAnyOf` · `DocAllOf`,
all from `src/common/doc/decorators/doc.decorator.ts`.

Use them. A bare `@ApiOperation` / `@ApiResponse` on a handler bypasses the shared shape — the
error responses, the auth headers, and the guard annotations the primitives add come from one
place so every route documents them identically.

## Query and param options are constants, never inline (HARD)

`@ApiQuery` / `@ApiParam` arrays live as PascalCase constants in
`<module>/constants/<module>.doc.constant.ts` — `UserDocParamsMobileNumberId`,
`UserDocQueryList` — and are referenced by the doc function.

**Never an inline array literal inside the doc call**, and never generated from the request
DTO. Two copies of one list is how the docs and the route drift apart.

## Three names must agree or the route breaks at RUNTIME with `tsc` green

The route template, the `@Param('…')` key, and the `name` in the Swagger param constant. A
mismatch between the first two makes the param silently `undefined` (`rules/http.md`).

## Paginated routes

`DocResponsePaging` takes the SAME allow-list constants the controller's `@Pagination*Query`
decorator takes:

- It documents the `search` query param only when it receives `availableSearch`, and the
  `orderBy` param only when it receives `availableOrderBy`. A doc that omits them advertises
  nothing while the pipe still accepts the value.
- **`type` is REQUIRED** — `EnumPaginationType.offset` or `.cursor`, matching the route's query
  decorator. A block that omits it does not compile, deliberately: there is no meaningful
  default and a silent fallback would let a route mis-document itself with no signal.

Both sides use the identical option names and the identical constant. Never inline a literal
array into a `*.doc.ts` (`rules/pagination.md`).

## Response schemas come from the DTO

`DocResponse<T>` / `DocResponsePaging<T>` take the response DTO type. A hand-written schema
object beside a DTO that already describes the shape is a mirror that drifts
(`rules/code-style.md`). A field that is not `@Expose()`d is not in the response, so it does
not belong in the schema either (`rules/dto.md`).

## Hiding

A field hidden from the JSON with `@Exclude()` also carries `@ApiHideProperty()` — both, so the
response and the schema agree (`rules/dto.md`).

## Comments

Doc factories carry no method JSDoc (`rules/comments.md`).
