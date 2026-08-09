# Pagination

Full API in `docs/pagination.md`. `PaginationService` is global and offers two strategies: `offset(...)` and `cursor(...)`.

## Where it runs

**`PaginationService` is injected in REPOSITORIES.** Not in services, not in controllers. The repository builds the Prisma call, hands it to the pagination service, and returns `IResponsePagingReturn<T>`. The service passes it through; the controller returns it.

**Database-level only.** No `.slice()` over a preloaded array, no in-memory filtering after a `findMany()`. That is a paginated endpoint that loads the whole collection.

## The controller side

Query parsing is decorator-driven. Compose them; do not hand-parse `@Query`:

```typescript
@PaginationOffsetQuery({ availableSearch: UserDefaultAvailableSearch })
pagination: IPaginationQueryOffsetParams<Prisma.UserSelect, Prisma.UserWhereInput>,
@PaginationQueryFilterInEnum<EnumUserStatus>('status', UserDefaultStatus)
status?: Record<string, IPaginationIn>,
@PaginationQueryFilterEqualString('role')
role?: Record<string, IPaginationEqual>
```

Available decorators: `PaginationOffsetQuery` · `PaginationCursorQuery` · `PaginationQueryFilterInEnum` · `PaginationQueryFilterNinEnum` · `PaginationQueryFilterEqualBoolean` · `PaginationQueryFilterEqualNumber` · `PaginationQueryFilterEqualString` · `PaginationQueryFilterNotEqual` · `PaginationQueryFilterDate`.

`availableSearch` and `availableOrderBy` allow-lists live as PascalCase constants under `<module>/constants/`, in `<module>.list.constant.ts` — the file that holds a module's list-endpoint constants (`UserDefaultAvailableSearch`, `ApiKeyDefaultAvailableSearch`), alongside the enum defaults its filter decorators use (`ApiKeyDefaultType`). A module with no other list constants may keep them in `<module>.constant.ts`, but `.list.constant.ts` is the default and what every existing module does.

**They are an allow-list, not a convenience** — an unrestricted `orderBy` lets a client sort on an unindexed or sensitive column, and omitting them is not a neutral default: both pipes fail CLOSED, so `?search=` and `?orderBy=` are silently ignored rather than rejected. An endpoint that accepts a param and discards it is worse than one that rejects it.

## Filter shape

A filter is a specific, typed structure with named fields, produced by the filter decorators. **FORBIDDEN:** `Record<string, any>`, a raw `filter?: string` query param, or `JSON.parse(rawFilter)` spread into `where`. That is the client throwing a Prisma query at the database.

## Naming

The wire param is `perPage`, the DTO field is `perPage`, the interface field is `perPage`. `per_page` is wrong here — this codebase is uniformly camelCase (`rules/naming.md`).

## Cursor pagination is a live wire contract

The cursor is a base64 encoding of the cursor payload, and the decode path validates the decoded shape by field name. **Renaming a cursor payload field invalidates every cursor a client currently holds** — the shape check rejects it as malformed and clients mid-scroll cannot advance.

Renaming is permitted; renaming silently is not. Ship it in a window where a dead cursor is acceptable, or accept both encodings for a migration period. Nothing here fails at `tsc` — the first signal is a client that cannot page.
