# Pagination

Full API in `docs/pagination.md`. `PaginationService` is global and offers two strategies: `offset(...)` and `cursor(...)`.

## The route scope decides the strategy

**`/admin/**` is offset. Every other scope — `/user`, `/shared`, `/system`, `/public` — is cursor.**

Not a per-endpoint judgement. There is no exception list and no "unless the collection is bounded". A new paginated endpoint takes the strategy of the prefix it is registered under in `src/router/routes/`, and nothing else decides it.

An admin console is the only consumer that needs a total, a page number and a jump-to-page; `IPaginationCursorReturn` has none of those. Offset also cannot reach past row 2000 (`PaginationDefaultMaxPage` × `PaginationDefaultMaxPerPage`), so it is a narrow-then-browse tool, never a scan tool — which is why no other scope may use it.

Consequences that are part of the rule, not side effects:

- A non-admin list has **no `count`, no `page`, no `totalPage`**. `includeCount` is a repository-side argument, never a query param; set it only when a concrete screen needs the number.
- **Every field in a cursor route's `availableOrderBy` must be immutable.** A row whose sort key changes mid-scroll genuinely moves, and no tiebreaker can stabilise it. `updatedAt`, `lastActiveAt`, an `expiredAt` a resend rewrites, and a `name` the owner can edit are all illegal on a cursor route and legal on an offset one. **Split the constant only when a field is legal on one side and illegal on the other** — `<Module>DefaultAvailableOrderBy` for the offset route, `<Module>CursorAvailableOrderBy` for the narrowed cursor one. When every field is immutable, both routes share the one constant; duplicating an identical list is the waste, not the safety.
- **The test is whether a WRITE PATH exists, not what the field is called.** Grep every repository for a write to that column before you allow it. `country.name` sits on a cursor route legally because the module is seeded reference data with no write path anywhere; `workspace.name` is illegal because a rename endpoint exists. Where a field passes only because nothing writes it, say so in a comment on the constant — otherwise the next reader reads it as a violation.

## Where it runs

**`PaginationService` is injected in REPOSITORIES.** Not in services, not in controllers. The repository builds the Prisma call, hands it to the pagination service, and returns `IResponsePagingReturn<T>`. The service passes it through; the controller returns it.

**Database-level only.** No `.slice()` over a preloaded array, no in-memory filtering after a `findMany()`. That is a paginated endpoint that loads the whole collection.

## The controller side

Query parsing is decorator-driven. Compose them; do not hand-parse `@Query`:

```typescript
@PaginationOffsetQuery({
    availableSearch: UserDefaultAvailableSearch,
    availableOrderBy: UserDefaultAvailableOrderBy,
})
pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
@PaginationQueryFilterInEnum<EnumUserStatus>('status', UserDefaultStatus)
status?: Record<string, IPaginationIn>,
@PaginationQueryFilterEqualString('role')
role?: Record<string, IPaginationEqual>
```

Every pagination type takes **one generic — the `Where` type**. `availableOrderBy` in the snippet is recommended, not required.

Available decorators: `PaginationOffsetQuery` · `PaginationCursorQuery` · `PaginationQueryFilterInEnum` · `PaginationQueryFilterNinEnum` · `PaginationQueryFilterEqualBoolean` · `PaginationQueryFilterEqualNumber` · `PaginationQueryFilterEqualString` · `PaginationQueryFilterNotEqual` · `PaginationQueryFilterDate`.

`availableSearch` and `availableOrderBy` allow-lists live as PascalCase constants under `<module>/constants/`, in `<module>.list.constant.ts` — the file that holds a module's list-endpoint constants (`UserDefaultAvailableSearch`, `ApiKeyDefaultAvailableSearch`), alongside the enum defaults its filter decorators use (`ApiKeyDefaultType`). A module with no other list constants may keep them in `<module>.constant.ts`, but `.list.constant.ts` is the default and what every existing module does.

**Both allow-lists are OPTIONAL.** Absent, `null` and `[]` all mean the same thing, and a bare `@PaginationOffsetQuery()` compiles:

| Configured? | `?search=` | `?orderBy=` |
|---|---|---|
| no | dropped — no search predicate, nothing added to `where` | dropped — ordering falls to `PaginationDefaultOrderBy` (`createdAt desc`) |
| yes | field list drives the `contains` `OR` | field outside it → `PaginationOrderByNotAllowedException`; missing or unrecognised direction → `PaginationOrderDirectionNotAllowedException` |

**Set one wherever the endpoint has a defensible sort order or a real search column — and leave it out where it does not.** A device list, a join-request list, or a member list whose searchable identity lives on the joined `user` has nothing worth a `contains` search. An allow-list added so a field is non-empty is speculative generality.

**The Swagger doc factory imports the SAME constant the controller does.** `DocResponsePaging` documents the `search` query param only when it receives `availableSearch`, and the `orderBy` param only when it receives `availableOrderBy` — so a route whose doc omits them advertises nothing while the pipe still accepts the value. Both sides use the identical option names and the identical constant; **never inline a literal array into a `*.doc.ts`.** Two copies of one allow-list is how the docs and the route drift apart, and it is how 16 routes ended up silently undocumented.

**`DocResponsePaging` also requires `type`** — `EnumPaginationType.offset` or `.cursor`, matching the route's query decorator. It is a required field, so a block that omits it does not compile. Every paginated route has a strategy; there is no meaningful default, and a silent fallback would let a route mis-document itself with no compile error and no runtime signal.

## Two protections, and only one of them is the allow-lists

Keep these apart. Conflating them is how this rule went wrong once already.

| Protection | Defends against | Needs an allow-list? |
|---|---|---|
| the pipes build their output from **named keys only** | client-invented query keys reaching Prisma — `?where=`, `?select=`, `?include=`, `?includeCount=` | **no — unconditional** |
| the allow-lists | a client sorting or searching on a column the endpoint never sanctioned | yes, that is what they are |

The query decorators bind `@Query()` with no key, so each pipe in the chain receives the **whole raw query object**. Every pipe therefore builds its return value from a **literal, named key list** — never `{ ...value }`. The raw `search` string is consumed by the first pipe and never forwarded; the raw `orderBy` string is replaced by the parsed array. **Both hold with zero allow-lists configured** — that is why the allow-lists do not need to be mandatory to keep the pipes safe.

Unknown keys are dropped, not rejected: the pagination pipes cannot see the route's own filter decorators, so a global unknown-key rejection would 400 every legitimate `?status=` / `?role=` filter. An unsupported `?search=` / `?orderBy=` is dropped for the same reason — the endpoint answers 200 with its default page.

**When you compose a search predicate, guard the empty allow-list.** `availableSearch.map(...)` over an empty array yields `{ OR: [] }`, which is a Prisma predicate matching **zero rows** — a list that silently answers an empty page instead of a full one.

The types enforce it structurally, in two tiers:

| Tier | Type | Carries |
|---|---|---|
| controller param, produced by the pipes | `IPaginationQueryOffsetParams<TArgsWhere>` · `IPaginationQueryCursorParams<TArgsWhere>` | `limit`, `orderBy`, `where?`, plus `skip` or `cursor?`/`cursorField?` |
| service args, produced by the REPOSITORY | `IPaginationOffsetArgs<TArgsWhere>` · `IPaginationCursorArgs<TArgsWhere>` | the above **plus** `include?`, and `includeCount?` on cursor |

`include` and `includeCount` are repository-side arguments. They are absent from the pipe-output types on purpose, so a client cannot address them from the query string.

There is **no `select`** anywhere in the pagination types. Shape a paginated read with `include` and a nested select constant (`include: { user: { select: UserRefSelect } }`) — that is what every repository does.

## Filter shape

A filter is a specific, typed structure with named fields, produced by the filter decorators. **FORBIDDEN:** `Record<string, any>`, a raw `filter?: string` query param, or `JSON.parse(rawFilter)` spread into `where`. That is the client throwing a Prisma query at the database.

## Naming

The wire param is `perPage`, the DTO field is `perPage`, the interface field is `perPage`. `per_page` is wrong here — this codebase is uniformly camelCase (`rules/naming.md`).

## The cursor payload carries a fingerprint, never the query

The cursor is URL-safe base64 over exactly two fields:

```
{ "cursor": "<row id>", "fingerprint": "<16 hex chars — sha256 of the canonicalized { where, orderBy }>" }
```

`fingerprint` exists so `PaginationService.cursor` can tell that the client did not change the query mid-scroll. It is compared as a string; the composed `where` and the resolved `orderBy` are never carried in the token. A mismatch is `PaginationInvalidCursorPaginationParamsException` — deliberate, not a bug.

Two obligations follow:

- **Never put a value in the payload.** The `where` used to be embedded, which published the scope IDs, the soft-delete convention and the search field names to anyone holding a cursor, and made the token grow with the filter until it blew past `PaginationMaxCursorLength`. The payload is now fixed-size regardless of filter complexity. Keep it that way.
- **Canonicalize before hashing.** Object keys are sorted recursively and `Date` is normalised to ISO before the hash. `JSON.stringify` is key-order dependent; without this, a reordered `where` would read as a changed query, and an un-normalised `Date` would hash to `{}` and let a changed date filter slip through the guard.

Renaming a payload field still invalidates every cursor a client holds. **This repo has no consumer**, so that is free here — take the clean shape and change every call site, per `.claude/CLAUDE.md` #7. Nothing about it fails at `tsc`.

## Cursor ordering always ends with the cursor field

`PaginationService.cursor` appends `{ [cursorField]: <direction of the last ordering term> }` to the resolved `orderBy` before it queries and before it fingerprints. Prisma positions the window at the cursor row *in the given ordering*, so without a unique final term the row after it is undefined — rows are silently skipped or repeated between pages, and the response is still a 200.

The tiebreaker lives in the SERVICE, not in a pipe or a controller, so it cannot be forgotten per endpoint. `offset()` does not need it and does not have it.

A tiebreaker fixes ties. It cannot fix a **mutating** sort key — see the immutability obligation above.
