---
paths:
    - 'src/common/pagination/**'
    - '**/*list.request.dto.ts'
    - '**/*.list.constant.ts'
    - '**/*.http.service.ts'
    - '**/*.repository.ts'
---

# Pagination

- `/admin/**` is offset; every other scope is cursor, with no `count`, `page`, or `totalPage`. `includeCount` is a repository-side argument.
- `PaginationService` (`src/common/pagination/services/pagination.service.ts`: `offset`, `cursor`, `offsetPage`) is injected in repositories, which return `IResponsePaginationReturn<T>`. Database-level only; the one exception is a computed result the domain scores in memory and pages with `offsetPage`.
- `PaginationOffsetQuerySchema` and `PaginationCursorQuerySchema` (`src/common/pagination/dtos/`) carry paging and `search` (trimmed, at most `PaginationDefaultMaxSearchLength`), no `orderBy`. A list query DTO `.extend`s one, overriding the `search` meta to name its allow-list, plus filters; a list with no search drops it with `.omit({ search: true })`. A sortable list declares `orderBy` inline, no schema factory: a union of `z.templateLiteral([z.enum(<AllowList>), ':', z.enum(EnumPaginationOrderDirectionType)])`, its `z.array`, and `z.literal('')`, `.optional().meta({ … })` (`src/modules/user/dtos/request/user.list.request.dto.ts:21-41`); an unlisted field or direction answers 422 from zod. The controller binds one `@Query({ schema })`; the HTTP service passes the DTO to `PaginationQueryUtil.offset` / `.cursor` (`src/common/pagination/utils/pagination.query.util.ts:311`, `:358`) with `availableSearch` and `availableOrderBy` (`[]` for a list with no sort), builds filters with the util's helpers, and merges `storePatch` into `RequestStoreService` under `PaginationStoreKey`. The util stores both lists for the response metadata only, validates no `orderBy`, and injects no store. Domain and repository take `IPaginationQuery*Params`.
- Allow-lists live in `<module>.list.constant.ts` as `as const` tuples `z.enum` accepts: a Prisma-backed list holds `Prisma.<Model>ScalarFieldEnum.<field>` members and `satisfies ReadonlyArray<Prisma.<Model>ScalarFieldEnum>`; a computed list `satisfies ReadonlyArray<keyof I<Row>>`. A filter helper takes `Prisma.<Model>ScalarFieldEnum.<field>`. An `orderBy` key names a field the row carries.
- `availableOrderBy` in the response pagination metadata is mandatory (`src/common/response/dtos/response.pagination-metadata.dto.ts:96`). Every `availableOrderBy` field on a cursor route is immutable; the test is whether a write path exists. Split `<Module>CursorAvailableOrderBy` from `<Module>DefaultAvailableOrderBy` only when the sets differ.
- A filter is a typed structure from the helpers; no `Record<string, unknown>`, no raw `filter` string, no `JSON.parse` into `where`. the util output types carry no `include`, `select`, or `includeCount`; `select` and `include` are exclusive; a row narrower than the model takes a `*Select` constant pinned by `Prisma.<Model>GetPayload<{ select: typeof <Const> }>`.
- The cursor token carries `{ cursor, fingerprint }` only, the fingerprint a hash of the canonicalized `{ where, orderBy }` (`pagination.service.ts:53`); a mismatch raises `PaginationInvalidCursorPaginationParamsException`. `cursor` appends the cursor field as the final ordering term; a tiebreaker fixes ties, not a mutating key.
- Date bounds use `EnumPaginationFilterDateBetweenType`; the interceptor reads `EnumPaginationType` off the return. OpenAPI list params come only from the zod schema.
