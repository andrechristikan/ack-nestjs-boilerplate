---
paths:
    - 'src/common/pagination/**'
    - '**/*list.request.dto.ts'
    - '**/*.list.constant.ts'
    - '**/*list*.use-case.ts'
    - '**/*export*.use-case.ts'
    - 'src/modules/analytic/use-cases/**'
    - '**/*.repository.ts'
---

# Pagination

The cursor token, the kit utils, and the keyset read: `pagination-kit.md`.

- `/admin/**` is offset; every other scope is cursor, with no `page` or `totalPage`, and no `count` unless a repository passes `includeCount`, a repository-side argument a client never sets.
- `PaginationService` (`src/common/pagination/services/pagination.service.ts`: `offset`, `cursor`) is injected in repositories, which return `IResponsePaginationReturn<T>`, and is database-level only. A computed result, scored in memory by a service or grouped by an analytic repository, pages with `PaginationOffsetUtil.page`.
- A repository calls `paginationService.cursor(client.<model>, args)` or `.offset(...)` in one statement with no generic arguments; the delegate is typed (`IPaginationDelegate`), and `where`, `select`, `include`, and the row type infer from the Prisma delegate.
- `PaginationOffsetQuerySchema` and `PaginationCursorQuerySchema` (`src/common/pagination/dtos/`) carry paging and `search` (trimmed, at most `PaginationDefaultMaxSearchLength`), no `orderBy`. A list query DTO `.extend`s one, overriding the `search` meta to name its allow-list, plus filters; a list with no search drops it with `.omit({ search: true })`. A sortable list declares `orderBy` inline, no schema factory: a union of `z.templateLiteral([z.enum(<AllowList>), ':', z.enum(EnumPaginationOrderDirectionType)])` and `z.literal('')`, `.optional().meta({ … })`, with no array member (`UserListRequestSchema` `orderBy`, `src/modules/user/dtos/request/user.list.request.dto.ts`). A request carries at most one `orderBy`; an unlisted field or direction or a repeated parameter answers 422 from zod. The controller binds one `@Query({ schema })`; the use case passes the whole DTO to `PaginationQueryUtil.offset` / `.cursor` (`src/common/pagination/utils/pagination.query.util.ts`) for params, with `availableSearch`, `availableOrderBy` (`[]` for a list with no sort), and, on `.cursor`, the required `options.scope`, builds filters with `PaginationFilterUtil`, and merges `storePatch` into `RequestStoreService` under `PaginationStoreKey`. `PaginationQueryUtil` stores both lists for the response metadata only, validates no `orderBy`, and injects no store. Service and repository take `IPaginationQuery*Params`, which carry no type argument: `where` is the search `IPaginationSearchWhere`, and the repository merges it into its model's `where`.
- Allow-lists live in `<module>.list.constant.ts` as `as const` tuples `z.enum` accepts: a Prisma-backed list holds `Prisma.<Model>ScalarFieldEnum.<field>` members and `satisfies ReadonlyArray<Prisma.<Model>ScalarFieldEnum>`; a computed list `satisfies ReadonlyArray<keyof I<Row>>`. A filter helper takes `Prisma.<Model>ScalarFieldEnum.<field>`. An `orderBy` key names a field the row carries.
- `availableOrderBy` in the response pagination metadata is mandatory (`ResponsePaginationMetadataSchema`, `src/common/response/dtos/response.pagination-metadata.dto.ts`). Every `availableOrderBy` field on a cursor route is immutable and non-null on every row the route's `where` returns; the test for immutable is whether a write path exists. Split `<Module>CursorAvailableOrderBy` from `<Module>DefaultAvailableOrderBy` only when the sets differ.
- A multi-field sort a client names is custom per module and per case, usually outside `PaginationService`; the kit holds no alias mechanism. `metadata.orderBy` is an array because a backend sort may hold more terms than the request.
- A filter is a typed structure from `PaginationFilterUtil` (`src/common/pagination/utils/pagination.filter.util.ts`: `equalBoolean`, `equalString`, `equalNumber`, `notEqual`, `inEnum`, `ninEnum`, `dateBetween`); no `Record<string, unknown>`, no raw `filter` string, no `JSON.parse` into `where`. The util output types carry no `include`, `select`, or `includeCount`; `select` and `include` are exclusive; a row narrower than the model takes a `*Select` constant pinned by `Prisma.<Model>GetPayload<{ select: typeof <Const> }>`.
- `scope` is one constant per cursor endpoint, so a token issued at one endpoint answers 422 at another even when its payload matches.
- A mismatch raises `PaginationInvalidCursorPaginationParamsException` (422). A client sends the same filter, sort, and search on every page; one that changes any of them sends no cursor and restarts at the first page; the server never resets it.
- Server-built `where` (owner id, workspace, a clock) is outside the fingerprint and applies on every page. A clock filter in a cursor `where` reads `HelperDateService` on each page.
- A read that skips `PaginationQueryUtil` (a processor or analytic loop) has no client request and passes its scope constant directly as `fingerprint`; its token stays a local variable, never sent to a client or persisted.
- A cursor `select` carries every sort field and the tiebreak `id`; `PaginationService` adds nothing to `select`.
- `PaginationService` appends the tiebreak to every `offset` and `cursor` `orderBy` (`PaginationQueryUtil.resolveTiebreak`): an empty `orderBy` becomes `PaginationDefaultOrderBy`, then `{ id: <direction of the last term> }` (`PaginationDefaultCursorField`) follows, skipped when a term already names it. A repository, service, or use case never adds its own tiebreak term to `orderBy`; `metadata.orderBy` omits it.
- A query param filtered against an enum is a field on the list schema; the use case applies `PaginationFilterUtil.inEnum` / `.ninEnum` with the default set as a PascalCase constant in `<module>.list.constant.ts` (`UserDefaultStatus`, `src/modules/user/constants/user.list.constant.ts`). Never a hand-parsed `@Query` plus a manual `includes`.
