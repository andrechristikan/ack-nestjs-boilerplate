# Pagination

`PaginationService` is global and offers two strategies: `offset(...)` and `cursor(...)`.
Flow narrative: `docs/pagination.md` — explorer or planner.

## The route scope decides the strategy

**`/admin/**` is offset. Every other scope — `/user`, `/shared`, `/system`, `/public` — is cursor.**

Not a per-endpoint judgement. There is no exception list and no "unless the collection is bounded". A new paginated endpoint takes the strategy of the prefix it is registered under in `src/router/http/`, and nothing else decides it.

An admin console is the only consumer that needs a total, a page number and a jump-to-page; `IPaginationCursorReturn` has none of those. Offset also cannot reach past row 2000 (`PaginationDefaultMaxPage` × `PaginationDefaultMaxPerPage`), so it is a narrow-then-browse tool, never a scan tool — which is why no other scope may use it.

Consequences that are part of the rule, not side effects:

- A non-admin list has **no `count`, no `page`, no `totalPage`**. `includeCount` is a repository-side argument, never a query param; set it only when a concrete screen needs the number.
- **Every field in a cursor route's `availableOrderBy` must be immutable.** A row whose sort key changes mid-scroll genuinely moves, and no tiebreaker can stabilise it. `updatedAt`, `lastActiveAt`, an `expiredAt` a resend rewrites, and a `name` the owner can edit are all illegal on a cursor route and legal on an offset one. **Split the constant only when a field is legal on one side and illegal on the other** — `<Module>DefaultAvailableOrderBy` for the offset route, `<Module>CursorAvailableOrderBy` for the narrowed cursor one. When every field is immutable, both routes share the one constant; duplicating an identical list is the waste, not the safety. A list whose sortable keys belong to one endpoint alone is named for that endpoint — `<Module><Endpoint>AvailableOrderBy`, as the computed analytic lists are.
- **The test is whether a WRITE PATH exists, not what the field is called.** Grep every repository for a write to that column before you allow it. `country.name` sits on a cursor route legally because the module is seeded reference data with no write path anywhere; `workspace.name` is illegal because a rename endpoint exists. Where a field passes only because nothing writes it, say so in a comment on the constant — otherwise the next reader reads it as a violation.

## Where it runs

**`PaginationService` is injected in REPOSITORIES.** Not in HTTP services, not in controllers. The repository builds the Prisma call, hands it to the pagination service, and returns `IResponsePaginationReturn<T>`. The HTTP service passes it through; the controller returns it.

**Database-level only.** No `.slice()` over a preloaded array, no in-memory filtering after a `findMany()`. That is a paginated endpoint that loads the whole collection.

The exception is a COMPUTED result — a fraud or anomaly signal assembled from several reads and scored in the domain, where no single Prisma query can express the page. There the domain slices the computed set and builds the envelope with `PaginationService.offsetPage`, so the response still reports the same page arithmetic as every other route. A plain read never qualifies: if Prisma can page it, Prisma pages it.

## Query parse — zod + `PaginationQueryUtil`

List query parsing is **not** pipe-driven and **not** on `PaginationService`.

1. **Kit base schemas** `PaginationOffsetQuerySchema` (`page`/`perPage`) and `PaginationCursorQuerySchema` (`cursor`/`perPage`) live under `src/common/pagination/dtos/`. Modules `.extend` `search` / `orderBy` only when their allow-lists are non-empty, plus any filter fields. No factory functions in `*.dto.ts`.
2. The controller binds **one** `@Query({ schema })` and passes the whole DTO to the HTTP service (`rules/architecture.md`, `rules/http.md`).
3. The HTTP service calls **`PaginationQueryUtil.offset` / `.cursor`** (plus filter helpers) to produce `IPaginationQueryOffsetParams` / `IPaginationQueryCursorParams` and a store patch; it merges the patch into `RequestStoreService` (`PaginationStoreKey`) for response metadata. Domain and repository keep receiving `IPaginationQuery*Params`.

**`PaginationQueryUtil` is a pure util** under `src/common/pagination/utils/`. It **MUST NOT** inject `RequestStoreService`. There is no "mapper" name for this kit.

Filter helpers on the util (mirror the former filter operators; the HTTP service chooses which to apply per field):

`equalBoolean` · `equalString` · `equalNumber` · `inEnum` · `ninEnum` · `notEqual` · `dateBetween`

Date bounds use `EnumPaginationFilterDateBetweenType` — never a raw `'start'` / `'end'` string.

```typescript
// controller — pass the DTO through
@Query({ schema: UserAdminListQuerySchema })
query: UserAdminListQueryDto

// HTTP service — derive
const { params, storePatch } = this.paginationQueryUtil.offset(query, {
    availableSearch: UserDefaultAvailableSearch,
    availableOrderBy: UserDefaultAvailableOrderBy,
    filters: [
        this.paginationQueryUtil.inEnum(
            Prisma.UserScalarFieldEnum.status,
            query.status,
            UserDefaultStatus
        ),
        this.paginationQueryUtil.equalString(
            Prisma.UserScalarFieldEnum.roleId,
            query.roleId
        ),
    ],
});
```

`availableSearch` and `availableOrderBy` allow-lists live as PascalCase constants in `<module>/constants/<module>.list.constant.ts` (`UserDefaultAvailableSearch`, `ApiKeyDefaultAvailableSearch`), beside enum defaults the filters use (`ApiKeyDefaultType`). That file holds a module's list-endpoint constants and nothing else (`rules/naming.md`).

Wire / query DTO param names are the camelCase query fields (`status`, `roleId`). Only the Prisma field argument at an allow-list or filter-helper call site is the enum member.

`PaginationQueryUtil` filter helpers are model-agnostic: `field: TField extends string` (or plain `string`). The kit never imports a feature's Prisma model types (`rules/common.md`).

### Allow-lists and schema shape (HARD)

| Allow-list | Schema / OpenAPI | Parse behaviour |
|---|---|---|
| `undefined` or `[]` | module **does not** `.extend` `search` / `orderBy` — Swagger must not advertise them | no search predicate; order falls to `PaginationDefaultOrderBy` (`createdAt` desc) |
| non-empty | module `.extend`s optional field with `.meta` describing the allow-list | search → `contains` `OR`; `orderBy` outside the list → `PaginationOrderByNotAllowedException`; bad direction → `PaginationOrderDirectionNotAllowedException` |

**Set an allow-list wherever the endpoint has a defensible sort order or a real search column — and leave it out where it does not.** A device list, a join-request list, or a member list whose searchable identity lives on the joined `user` has nothing worth a `contains` search. An allow-list added so a field is non-empty is speculative generality.

Schema naming: one shared general name when several endpoints share the shape; a per-endpoint name when shapes differ (`rules/dto.md`, `rules/naming.md`).

**An `availableOrderBy` names keys the returned row carries, and the layer that pages the rows
applies them.** A key absent from the response schema is not sortable and does not belong in the
allow-list, and a list assembled in memory sorts before it slices. `PaginationDefaultOrderBy`
(`createdAt desc`) reaches the pager on every request that omits `orderBy`, whatever the
allow-list holds, so an in-memory sort applies only the terms whose key the row declares and
leaves the order it was given when none survives.

**Allow-list field typing is dual (HARD):**

| List kind | Allow-list typing | Filter helper `field` argument |
|---|---|---|
| Prisma-backed model list | `Prisma.<Model>ScalarFieldEnum` members with `as const satisfies ReadonlyArray<Prisma.<Model>ScalarFieldEnum>` (or an equivalent typed const) | `Prisma.<Model>ScalarFieldEnum.<field>` — never a bare magic string |
| Computed / analytic list (row is a declared `I*` interface) | `(keyof I<Row>)[]` | N/A when there is no Prisma column; sorter takes `sortableKeys: (keyof T)[]` |

```typescript
export const UserDefaultAvailableSearch = [
    Prisma.UserScalarFieldEnum.name,
    Prisma.UserScalarFieldEnum.username,
    Prisma.UserScalarFieldEnum.email,
] as const satisfies ReadonlyArray<Prisma.UserScalarFieldEnum>;

export const AnalyticNearLockoutAvailableOrderBy: (keyof IAnalyticNearLockout)[] =
    ['createdAt', 'id'];
```

An untyped list makes a typo compile: the key matches no field, the comparison reads `undefined`
on both sides, every row ties, and the sort degrades to a silent no-op while the document still
advertises the misspelled field. Nothing in `tsc`, the suite or the emitted document catches
that; the type does.

OpenAPI for list query params comes **only** from the zod schema on `@Query({ schema })`
(`standardSchemaConverter`). `@ResponsePagination` does **not** emit `ApiQuery` for page,
cursor, `perPage`, `search`, or `orderBy` (`rules/http.md`).

## Two protections, and only one of them is the allow-lists

Keep these apart.

| Protection | Defends against | Needs an allow-list? |
|---|---|---|
| the util / zod schema admit **named keys only** (strict list DTO) | client-invented query keys reaching Prisma — `?where=`, `?select=`, `?include=`, `?includeCount=` | **no — unconditional** |
| the allow-lists | a client sorting or searching on a column the endpoint never sanctioned | yes, that is what they are |

**When you compose a search predicate, guard the empty allow-list.** `availableSearch.map(...)` over an empty array yields `{ OR: [] }`, which is a Prisma predicate matching **zero rows** — a list that silently answers an empty page instead of a full one. Empty allow-lists omit `search` from the schema, so that path does not run.

The types enforce it structurally, in two tiers:

| Tier | Type | Carries |
|---|---|---|
| HTTP-service output of `PaginationQueryUtil` | `IPaginationQueryOffsetParams<TArgsWhere>` · `IPaginationQueryCursorParams<TArgsWhere>` | `limit`, `orderBy`, `where?`, plus `skip` or `cursor?`/`cursorField?` |
| repository args | `IPaginationOffsetArgs<TArgsWhere>` · `IPaginationCursorArgs<TArgsWhere>` | the above **plus** `include?` OR `select?`, and `includeCount?` on cursor |

`include`, `select` and `includeCount` are repository-side arguments. They are absent from the util-output types on purpose, so a client cannot address them from the query string.

**`select` and `include` are mutually exclusive**, through the `IPaginationShape` union the args types intersect: passing both fails `tsc` rather than Prisma at runtime. `select` reaches `findMany` only — never `count`, which needs no shape.

**A paginated read whose row is narrower than the model takes a `select`.** `include` restricts relations and nothing else, so a root scalar the row never declares still leaves the database — a password hash, a session `jti`, an API key hash. The read names the fields its row declares, through a `*Select` constant whose row type is pinned by `Prisma.<Model>GetPayload<{ select: typeof <Const> }>`, so dropping a field from the constant breaks the build rather than the response. A read that genuinely needs the whole model keeps `include`.

`PaginationService.offsetPage(items, count, { skip, limit })` builds the offset envelope for a result the caller already paged — a `groupBy` distribution, say. The page it reports is 1-based, like every other paginated route.

## Filter shape

A filter is a specific, typed structure with named fields, produced by the util filter helpers. **FORBIDDEN:** `Record<string, any>`, `Record<string, unknown>`, a raw `filter?: string` query param, or `JSON.parse(rawFilter)` spread into `where`. That is the client throwing a Prisma query at the database.

The wire schema validates types; the helper chooses the operator (`equals`, `in`, date `gte`/`lte`, …).

## Naming

The wire param is `perPage`, the DTO field is `perPage`, the interface field is `perPage`. `per_page` is wrong here — this codebase is uniformly camelCase (`rules/naming.md`).

## The cursor payload carries a fingerprint, never the query

The cursor is URL-safe base64 over exactly two fields:

```
{ "cursor": "<row id>", "fingerprint": "<16 hex chars — sha256 of the canonicalized { where, orderBy }>" }
```

`fingerprint` exists so `PaginationService.cursor` can tell that the client did not change the query mid-scroll. It is compared as a string; the composed `where` and the resolved `orderBy` are never carried in the token. A mismatch is `PaginationInvalidCursorPaginationParamsException` — deliberate, not a bug.

Two obligations follow:

- **Never put a value in the payload.** A `where` carried inside the token publishes the scope IDs, the soft-delete convention and the search field names to anyone holding a cursor, and grows the token with the filter until it passes `PaginationMaxCursorLength`. The payload stays fixed-size regardless of filter complexity.
- **Canonicalize before hashing.** Object keys are sorted recursively and `Date` is normalised to ISO before the hash. `JSON.stringify` is key-order dependent; without this, a reordered `where` would read as a changed query, and an un-normalised `Date` would hash to `{}` and let a changed date filter slip through the guard.

Renaming a payload field still invalidates every cursor a client holds. **This repo has no consumer**, so that is free here — take the clean shape and change every call site (`.claude/CLAUDE.md` → "How to work here"). Nothing about it fails at `tsc`.

## Cursor ordering always ends with the cursor field

`PaginationService.cursor` appends `{ [cursorField]: <direction of the last ordering term> }` to the resolved `orderBy` before it queries and before it fingerprints. Prisma positions the window at the cursor row *in the given ordering*, so without a unique final term the row after it is undefined — rows are silently skipped or repeated between pages, and the response is still a 200.

The tiebreaker lives in `PaginationService`, not in the util or a controller, so it cannot be forgotten per endpoint. `offset()` does not need it and does not have it.

A tiebreaker fixes ties. It cannot fix a **mutating** sort key — see the immutability obligation above.

## Response envelope

Paginated handlers use `@ResponsePagination` and return `IResponsePaginationReturn<T>`. The
interceptor reads strategy from the handler return via `EnumPaginationType.offset` / `.cursor`
— never string literals (`rules/enum.md`, `rules/http.md`, `rules/dto.md`). OpenAPI success
documents the page with `baseSchema: ResponsePaginationSchema` on that entry.
