# DTOs

A DTO is the module's transport shape, and here a DTO is a **zod schema plus the type inferred
from it**. A request DTO enters at the controller and travels as far down as the shape is still
unchanged — that can be the repository (`rules/architecture.md`); a response shape is declared
on the route and applied by `ResponseInterceptor`. Request-side validation is
`rules/validation.md`; OpenAPI annotation is `rules/http.md`; this file is the shape and
placement rule set. Flow narrative: `docs/request-validation.md`, `docs/response.md` —
explorer or planner.

## Placement

| Shape | Location |
|---|---|
| Request only | `dtos/request/<module>[.<concern>].request.dto.ts` |
| Response only | `dtos/response/<module>[.<concern>].response.dto.ts` |
| Shared by both, or a nested value object | `dtos/<module>.<noun>.dto.ts` |

**The folders are SINGULAR** — `dtos/request/`, `dtos/response/`. Never `requests/`.

`<concern>` is optional and is an action or a noun; it is **absent when the DTO is the module's
canonical request or response shape** (`device.request.dto.ts`). The direction segment is the
part that is never optional, and the file and its exports must agree on it. Full grammar in
`rules/naming.md`.

**Do not introduce a third model between the controller and the HTTP service.** A DTO in, a DTO or
an `I*` interface out — no "domain model" layer, no mapper class per endpoint.

## One file exports a schema and its inferred type (HARD)

```ts
export const UserUpdateProfileRequestSchema = z.strictObject({ … });

export type UserUpdateProfileRequestDto = z.infer<
    typeof UserUpdateProfileRequestSchema
>;
```

- **One `*.dto.ts` file declares exactly one zod schema const** — the exported one — and its
  `z.infer` type. No file-local helper schema and no second exported schema beside it. A
  nested shape is inlined into the parent object. A piece reused across schemas is a custom
  schema in `src/common/request/validations/request.<name>.validation.ts`
  (`RequestUuidSchema`, `RequestBooleanStringSchema`). A second top-level schema is its own
  file.
- The schema is the source of truth; the type is `z.infer` of it and is never hand-written
  beside it. A hand-written interface mirroring a schema drifts (`rules/code-style.md`).
- The `Schema` const is what a decorator and a pipe receive. The `Dto` type is
  what a signature is annotated with.
- **A request schema is `z.strictObject`; a response schema is `z.object`.** An unknown key
  entering is a caller error and is rejected; an undeclared key leaving is stripped, which is
  what makes the response fail closed. Neither is ever a top-level `z.array` or `z.record`: an
  array declares nothing to strip at its root, and a record declares nothing at all. A payload
  that is a LIST is a paginated route (`@ResponsePagination`, `rules/pagination.md`), whose schema
  is the row — the one shape that is a whole collection in a single response is the one nothing
  grows: a fixed enum's members, and even that carries its rows inside a declared object.
- Compose with the zod combinators rather than restating fields: `.extend()`, `.omit()`,
  `.pick()`, `.partial()`, `.nullable()`. A base shape such as `DatabaseResponseSchema` or a
  module's own base request schema is extended, not copied.

## A response schema is what reaches the wire (HARD)

A route declares its payload shape on `@Response(messagePath, { schema })` or
`@ResponsePagination(messagePath, { schema })`, and the matching interceptor validates the
handler's payload against it before the envelope is sent.

- **A field absent from the schema is absent from the response.** `z.object` strips what it
  does not declare, so a column added to the Prisma model does not leak just because someone
  forgot to think about it — the shape is opt-in and fails closed.
- **A payload with no declared schema is refused.** `@Response()` without `options.schema`
  declares a route that returns no data; a handler that returns one anyway raises
  `ResponseSerializationException`, and so does a payload the schema rejects.
- `@ResponsePagination` takes the schema of ONE item; the interceptor wraps the page around it.
  Options carry **schema only** — no pagination `type` field. OpenAPI success uses
  `DocResponseError` with `baseSchema: ResponsePaginationSchema` (`rules/pagination.md`,
  `rules/http.md`).
- Never hand a response schema to a domain. It belongs to the transport
  (`rules/architecture.md`).

## The envelope, not the schema

A handler that returns data returns `IResponseReturn<T>`, `IResponsePaginationReturn<T>`, or
`IResponseFileReturn` — **never a bare payload**. The interceptor reads `metadata` off the
returned object, and a bare payload has none. A handler with nothing to return is
`Promise<void>` (`rules/http.md`).

## Optionality

- Request schemas are the ONE layer where `undefined` is legal: `.optional()`.
- A response field is `.optional()` when it is genuinely absent, and `.nullable()` when the
  value is always present-or-null.
- Do not combine the two on new code (`rules/null-safety.md`).

## Field names

Field names are the JSON keys, and they are camelCase (`rules/naming.md`). **Rename
them freely when the current name is wrong** — no client compatibility is owed here. A body
field MUST NOT duplicate a path param; the path is authoritative (`rules/http.md`).

## Never mirror a shape that has a name

A response schema restating three fields of another schema inline is a mirror that drifts. Pick
from the named schema instead (`rules/code-style.md`).

## Specs

A DTO spec asserts that parsing returns exactly the declared fields, that an undeclared field
is stripped, and that nothing sensitive rides along. That spec is the executable form of the
opt-in rule, and DTOs are inside the coverage set (`rules/testing.md`).
