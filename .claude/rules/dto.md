---
paths:
  - "**/dtos/**"
  - "**/*.dto.ts"
  - "src/common/request/**"
  - "src/common/response/**"
  - "src/common/pagination/**"
---

# DTOs, validation, pagination

A DTO is a zod schema plus `z.infer` of it, in one `*.dto.ts` file declaring exactly one schema const and its
`Dto` type (`naming.md`). A request DTO enters at the controller and travels down as far as the shape is
unchanged; a response schema is declared on the route. No third model between controller and HTTP service.

## Shape

- A request schema is `z.strictObject`; a response schema is `z.object`. Neither is a top-level
  `z.array` or `z.record`; a list is a paginated route whose schema is the row.
- Compose with `.extend()`, `.omit()`, `.pick()`, `.partial()`, `.nullable()`; a base such as
  `DatabaseResponseSchema` is extended, not copied. A piece reused across schemas is a validation in
  `src/common/request/validations/request.<name>.validation.ts` or `<module>/validations/`.
- Every request field carries its constraints (`.min()`, `.email()`, `.regex()`, `z.enum()`) and
  normalization (`.trim()`, `.toLowerCase()`); a bare `z.string()` is an unvalidated wire input.
  Every field carries `.meta({ description, example })`, the OpenAPI source.
- Request schemas are the one layer where `.optional()` is legal; a response field is `.optional()`
  when genuinely absent and `.nullable()` when present-or-null. A date-shaped request field is typed as a
  date on the schema. Field names are camelCase and renamed freely; a body field never duplicates a path param.
- `AppEnvSchema` (`src/app/dtos/app.env.dto.ts:13`) validates `process.env` at boot; a new env var
  lands there, in its config file, and in `.env.example`. An env boolean is
  `RequestBooleanStringSchema`; an encryption root is `RequestEncryptionSecretSchema`.

## The pipe and the interceptor

`RequestSchemaValidationPipe` (`src/common/request/pipes/request.schema-validation.pipe.ts:13`) is
the single `APP_PIPE`; a body with no schema attached raises `RequestSchemaMissingException`, so a
body is always `@Body({ schema })`. The response schema is what reaches the wire: `z.object` strips
undeclared keys, `@Response()` with no schema declares a route returning no data, and a payload the
schema rejects raises `ResponseSerializationException`. A handler returns an envelope
(`IResponseReturn<T>`, `IResponsePaginationReturn<T>`, `IResponseFileReturn`) or `Promise<void>`. A
response schema never reaches a domain.

## Pagination

- `/admin/**` is offset; every other scope is cursor, with no `count`, `page`, or `totalPage`.
  `includeCount` is a repository-side argument.
- `PaginationService` (`src/common/pagination/services/pagination.service.ts`: `offset`, `cursor`,
  `offsetPage`) is injected in repositories, which return `IResponsePaginationReturn<T>`. Database-level
  only; the one exception is a computed result the domain scores in memory and pages with `offsetPage`.
- A list query DTO is `PaginationOffsetQuerySchema` or `PaginationCursorQuerySchema`
  (`src/common/pagination/dtos/`) `.extend`ed with `search` and `orderBy` only when the allow-lists
  are non-empty, plus filters. The controller binds one `@Query({ schema })`; the HTTP service calls
  `PaginationQueryUtil.offset` / `.cursor` (`src/common/pagination/utils/pagination.query.util.ts:357`)
  with the filter helpers (`equalBoolean equalString equalNumber inEnum ninEnum notEqual
  dateBetween`) and merges `storePatch` into `RequestStoreService` under `PaginationStoreKey`. The
  util injects no store. Domain and repository take `IPaginationQuery*Params`.
- Allow-lists live in `<module>.list.constant.ts`: a Prisma-backed list is typed `as const satisfies
  ReadonlyArray<Prisma.<Model>ScalarFieldEnum>` and passes `Prisma.<Model>ScalarFieldEnum.<field>` to
  a helper; a computed list is `(keyof I<Row>)[]`. An untyped key sorts as a silent no-op. An
  `orderBy` key names a field the row carries. An empty allow-list omits the field; a search over an
  empty list is `{ OR: [] }` and matches nothing.
- Every `availableOrderBy` field on a cursor route is immutable; the test is whether a write path
  exists. Split `<Module>CursorAvailableOrderBy` from `<Module>DefaultAvailableOrderBy` only when
  the sets differ.
- A filter is a typed structure from the helpers; no `Record<string, unknown>`, no raw `filter` string, no
  `JSON.parse` into `where`. `include`, `select`, and `includeCount` are absent from the util output types by
  design; `select` and `include` are exclusive; a row narrower than the model takes a `*Select` constant
  pinned by `Prisma.<Model>GetPayload<{ select: typeof <Const> }>`.
- The cursor token carries `{ cursor, fingerprint }` only, the fingerprint a hash of the
  canonicalized `{ where, orderBy }` (`pagination.service.ts:56`); a mismatch raises
  `PaginationInvalidCursorPaginationParamsException`. `cursor` appends the cursor field as the final
  ordering term; a tiebreaker fixes ties, not a mutating key.
- Direction is `Prisma.SortOrder` or `EnumPaginationOrderDirectionType`; date bounds use
  `EnumPaginationFilterDateBetweenType`; the interceptor reads `EnumPaginationType` off the return.
  OpenAPI list params come only from the zod schema.

## Specs

A DTO spec parses a payload and asserts exactly the declared fields survive, an undeclared key is
stripped by a response schema and rejected by a request schema, and nothing sensitive rides along.
