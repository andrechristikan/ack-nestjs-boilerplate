# Pagination Module Documentation

This documentation explains the features and usage of the **Pagination Module** located at `src/common/pagination`.

## Overview

The Pagination module provides a comprehensive solution for handling paginated data throughout the application. It supports:
- **Offset-based pagination**: Traditional page number and limit approach
- **Cursor-based pagination**: Efficient traversal using cursor tokens
- **Advanced filtering**: Enum, equality, date range, and custom filters
- **Field ordering**: Validation and transformation of sort parameters
- **Error handling**: Consistent error responses with detailed context

Ordering support is split across two levels:
- **HTTP query level**: `orderBy` uses `field:direction` format in a single query parameter (e.g., `name:asc`, `createdAt:desc`). Multiple entries can be sent as repeated params.
- **Service level**: `orderBy` is always an array of order objects (`IPaginationOrderBy[]`), which is the shape Prisma receives.
- **Response metadata level**: `metadata.orderBy` is a string array in the same `field:direction` format as the query (e.g., `["createdAt:desc"]`), symmetric with `metadata.availableOrderBy`. `ResponsePagingInterceptor` performs the conversion; an empty order renders `[]`.

The module uses a pipe-based architecture with factory functions for maximum flexibility and type safety.

## Related Documents

- [Response Documentation][ref-doc-response]
- [Request Validation Documentation][ref-doc-request-validation]
- [Database Documentation][ref-doc-database]
- [Doc Documentation][ref-doc-doc]

## Table of Contents


- [Overview](#overview)
- [Related Documents](#related-documents)
- [Table of Contents](#table-of-contents)
- [Module](#module)
    - [PaginationService](#paginationservice)
        - [offset<TReturn>()](#offsettreturn)
        - [cursor<TReturn>()](#cursortreturn)
    - [Input Validation (Pipes)](#input-validation-pipes)
    - [Decorators](#decorators)
        - [Pagination Query Decorators](#pagination-query-decorators)
            - [@PaginationOffsetQuery](#paginationoffsetquery)
            - [@PaginationCursorQuery](#paginationcursorquery)
        - [Filter Decorators](#filter-decorators)
            - [@PaginationQueryFilterInEnum<T>](#paginationqueryfilterinenumt)
            - [@PaginationQueryFilterNinEnum<T>](#paginationqueryfilterninenumt)
            - [@PaginationQueryFilterEqualBoolean](#paginationqueryfilterequalboolean)
            - [@PaginationQueryFilterEqualNumber](#paginationqueryfilterequalnumber)
            - [@PaginationQueryFilterEqualString](#paginationqueryfilterequalstring)
            - [@PaginationQueryFilterNotEqual](#paginationqueryfilternotequal)
            - [@PaginationQueryFilterDate](#paginationqueryfilterdate)
        - [Ordering Configuration](#ordering-configuration)
- [Pagination Strategies](#pagination-strategies)
    - [Choosing a Strategy](#choosing-a-strategy)
    - [Offset-Based](#offset-based)
    - [Cursor-Based](#cursor-based)
- [Filtering System](#filtering-system)
    - [Enum Filters](#enum-filters)
    - [Equality Filters](#equality-filters)
    - [Date Filters](#date-filters)
- [Ordering](#ordering)
- [Usage Examples](#usage-examples)
    - [Basic Offset Pagination](#basic-offset-pagination)
    - [Cursor Pagination](#cursor-pagination)
    - [With Filters](#with-filters)
    - [Complete Example](#complete-example)
- [Integration with Doc Module](#integration-with-doc-module)
- [Implementation Notes](#implementation-notes)
    - [Performance Considerations](#performance-considerations)

## Module

### PaginationService

Core service that processes pagination operations without redundant validation (pipes already validated input).

**Two tiers of parameter types.** The controller-facing types carry only what a client may influence; the repository-facing types add what only server code may set:

| Tier | Type | Fields |
|---|---|---|
| Controller param, produced by the pipes | `IPaginationQueryOffsetParams<TArgsWhere>` | `limit`, `orderBy?`, `where?`, `skip` |
| Controller param, produced by the pipes | `IPaginationQueryCursorParams<TArgsWhere>` | `limit`, `orderBy?`, `where?`, `cursor?`, `cursorField?` |
| Service args, produced by the repository | `IPaginationOffsetArgs<TArgsWhere>` | the offset params above, plus `include?` |
| Service args, produced by the repository | `IPaginationCursorArgs<TArgsWhere>` | the cursor params above, plus `include?` and `includeCount?` |

Every one of these types takes a single generic, `TArgsWhere`. `include` and `includeCount` exist only on the repository tier, so a controller signature cannot express them and a client cannot reach them.

There is no `select` in the pagination types. A repository shapes its reads with `include` and a nested select constant, never through a pagination argument.

**Methods:**

#### offset\<TReturn\>()

Executes offset-based pagination.

```typescript
async offset<TReturn, TArgsWhere = unknown>(
    repository: IPaginationRepository,
    args: IPaginationOffsetArgs<TArgsWhere>
): Promise<IPaginationOffsetReturn<TReturn>>
```

**Type Parameters:**
- `TReturn` — shape of each item in the returned `data` array
- `TArgsWhere` — Prisma `where` type for the model (e.g. `Prisma.UserWhereInput`). Defaults to `unknown`

**Parameters:**
- `repository`: Repository instance implementing IPaginationRepository
- `args`: the pipe-validated `IPaginationQueryOffsetParams<TArgsWhere>` the controller received, widened by the repository with `include`

**`args.orderBy` Support:**
- Always an array: `[{ createdAt: 'desc' }]`, `[{ createdAt: 'desc' }, { name: 'asc' }]`

**Default Values:**
- `orderBy`: `[{ createdAt: 'desc' }]` - Sort by creation date descending
- If omitted, defaults to `PaginationDefaultOrderBy`

**Returns:**
```typescript
{
    type: 'offset',
    count: number,           // Total items
    perPage: number,         // Items per page
    page: number,           // Current page
    totalPage: number,      // Total pages
    hasNext: boolean,       // Has next page
    hasPrevious: boolean,   // Has previous page
    nextPage?: number,      // Next page number (if hasNext)
    previousPage?: number,  // Previous page number (if hasPrevious)
    data: TReturn[]        // Paginated items
}
```

#### cursor\<TReturn\>()

Executes cursor-based pagination.

```typescript
async cursor<TReturn, TArgsWhere = unknown>(
    repository: IPaginationRepository,
    args: IPaginationCursorArgs<TArgsWhere>
): Promise<IPaginationCursorReturn<TReturn>>
```

**Type Parameters:**
- `TReturn` — shape of each item in the returned `data` array
- `TArgsWhere` — Prisma `where` type for the model (e.g. `Prisma.UserWhereInput`). Defaults to `unknown`

**Parameters:**
- `repository`: Repository instance
- `args`: the pipe-validated `IPaginationQueryCursorParams<TArgsWhere>` the controller received, widened by the repository with `include` and `includeCount`

**`args.orderBy` Support:**
- Always an array: `[{ createdAt: 'desc' }]`, `[{ createdAt: 'desc' }, { name: 'asc' }]`

**Default Values:**
- `orderBy`: `[{ createdAt: 'desc' }]` - Sort by creation date descending
- If omitted, defaults to `PaginationDefaultOrderBy`
- `cursorField`: `'id'` - Field used for cursor positioning

**Cursor Payload:**

The encoded cursor is URL-safe base64 over exactly two fields, and nothing else:

```typescript
{
    cursor: string,      // the cursor row's `cursorField` value
    fingerprint: string  // fingerprint of the query the cursor was issued for
}
```

- `fingerprint` is the first 16 hex characters (the leading 64 bits, `PaginationCursorFingerprintLength`) of a sha256 over the canonicalized `{ where, orderBy }`. Canonicalization sorts object keys at every depth and converts `Date` values to ISO strings, so two equivalent filters hash the same.
- The composed `where` is **not** carried on the wire. The cursor stays around 94 characters no matter how large or deeply nested the filter is, and the filter itself is never exposed to the client.

**Cursor Validation:**
- Each request recomputes the fingerprint from its own `where` and `orderBy`, then compares it to the `fingerprint` in the supplied cursor. A mismatch throws `PaginationInvalidCursorPaginationParamsException` (50203, 422).
- A cursor that is empty or not a string throws `PaginationInvalidCursorFormatException` (50205). One that decodes to an object missing `cursor` or `fingerprint` throws `PaginationInvalidCursorDataException` (50212), and one whose base64 or JSON cannot be parsed at all throws `PaginationFailedToDecodeCursorException` (50214).
- A cursor is bound to the filter, the search term, and the ordering it was issued for. Changing any of them invalidates it, and the client starts again from the first page.
- For multi-field ordering, the array order feeds the fingerprint, so the same sequence of `orderBy` entries produces a matching cursor and a different sequence does not.

**Cursor Field Tiebreaker:**
- Before it queries and before it fingerprints, `cursor()` appends `{ [cursorField]: <direction> }` to the resolved `orderBy`. The direction is copied from the last ordering term, so the tiebreaker never fights the primary sort.
- It is skipped when the client already sorts on `cursorField`.
- The tiebreaker is what makes the position stable. When the sort key is not unique (several rows sharing one `createdAt`), the cursor row has no deterministic place in the result set, and pages can repeat or skip records. `offset()` does not do this; it anchors on a row count, not on a row.
- Because the tiebreaker is part of the `orderBy` that gets fingerprinted, it is also part of what a cursor is bound to.

**Returns:**
```typescript
{
    type: 'cursor',
    cursor?: string,        // Encoded cursor for next page
    perPage: number,        // Items per page
    hasNext: boolean,       // Has next page
    count?: number,         // Total count (if includeCount: true)
    data: TReturn[]        // Paginated items
}
```

### Input Validation (Pipes)

**Architecture:**
```
Client Request
    ↓
Pipes (Validation & Transformation)
    ├─ Format validation (integer, ISO date, etc.)
    ├─ Range validation (min/max)
    ├─ Value validation (allowed enum values)
    └─ Transformation (to service format)
    ↓
Service (Business Logic)
    ├─ Assumes valid input
    ├─ No redundant checks
    └─ Processes data
```

**Key Principle:** Pipes validate ALL input. Service assumes valid input.

**Pipe Chain:** `@PaginationOffsetQuery` binds `PaginationSearchPipe` → `PaginationOffsetPipe` → `PaginationOrderPipe`, and `@PaginationCursorQuery` binds `PaginationSearchPipe` → `PaginationCursorPipe` → `PaginationOrderPipe`. The first two pipes carry the raw `orderBy` query value through untouched; `PaginationOrderPipe` runs last and is the one that turns it into `IPaginationOrderBy[]`, which is why the handler parameter type is `IPaginationQueryOffsetParams` / `IPaginationQueryCursorParams` rather than the pipe-level shape.

**Query Allow-List:** Every pipe in the chain builds its return value from a fixed list of named keys and never spreads the incoming query object. Anything a client sends that is not on that list is dropped before the handler runs, so `?where=`, `?select=`, `?include=`, and `?includeCount=` cannot reach Prisma. `include` and `includeCount` are set by the repository or not at all.

**Absent Allow-Lists Ignore, They Do Not Reject:** both `availableSearch` and `availableOrderBy` are optional. Absent, `null`, and `[]` all behave identically, and a bare `@PaginationOffsetQuery()` with no options at all compiles and runs.

- `?search=` against an absent or empty `availableSearch` returns 200 and applies no search predicate. The term still appears in the response `metadata.search`.
- `?orderBy=` against an absent or empty `availableOrderBy` returns 200 and orders by the default `[{ createdAt: 'desc' }]`.

A **configured** allow-list is still enforced. Once `availableOrderBy` is non-empty, the pipe validates against it:

- A field outside the list throws `PaginationOrderByNotAllowedException` (50200, 422).
- A direction that is neither `asc` nor `desc`, including a missing one, throws `PaginationOrderDirectionNotAllowedException` (50215, 422).

### Decorators

#### Pagination Query Decorators

##### @PaginationOffsetQuery

Decorator for offset-based pagination with search and ordering.

**Options:** the `options` argument is optional, and so is every key in it.
- `availableOrderBy`: Array of fields available for ordering. Leave it out to accept `orderBy` without validating it and fall back to the default ordering
- `availableSearch`: Array of searchable fields. Leave it out to ignore `search` on the route
- `defaultPerPage`: Items per page (default: 20, max: 100)

**Default Behavior:**
- If no `orderBy`: sorts by `createdAt: DESC`
- Page defaults to 1
- PerPage defaults to PaginationDefaultPerPage (20)

**Public Query Contract:**
- `orderBy` uses `field:direction` format (e.g., `name:asc`, `createdAt:desc`) in a single query parameter
- Multiple fields can be sent as repeated params: `?orderBy=name:asc&orderBy=createdAt:desc`
- `PaginationOrderPipe` parses this into an array of order objects (`[{ field: direction }]`)

**Search Behavior:**
- `PaginationSearchPipe` builds a Prisma `OR` condition across `availableSearch` fields.
- Each field uses `Prisma.StringFilter` with `mode: 'insensitive'`, so search is case-insensitive.
- Shape: `{ OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }`.
- With no `availableSearch`, the pipe ignores the parameter and applies no search predicate; the request still returns 200.

**Usage:**
```typescript
@PaginationOffsetQuery({
    availableSearch: UserDefaultAvailableSearch,
    availableOrderBy: UserDefaultAvailableOrderBy,
})
pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
```

**Transformed to:**
```typescript
{
    limit: 20,        // from perPage
    skip: 0,          // (page - 1) * perPage
    orderBy: [...],   // [{ createdAt: 'desc' }] by default
    where: { ... }    // search and filter conditions combined here
}
```

That is the whole surface a handler receives. `include` is absent by design; the repository adds it when it calls `PaginationService`.

##### @PaginationCursorQuery

Decorator for cursor-based pagination.

**Options:** the `options` argument is optional, and so is every key in it.
- `availableOrderBy`: Array of fields available for ordering. Leave it out to accept `orderBy` without validating it and fall back to the default ordering
- `availableSearch`: Array of searchable fields. Leave it out to ignore `search` on the route
- `defaultPerPage`: Items per page (default: 20, max: 100)
- `cursorField`: Field for cursor (default: 'id')

**Default Behavior:**
- If no `orderBy`: sorts by `createdAt: DESC`
- Cursor is optional (undefined = first page)
- PerPage defaults to PaginationDefaultPerPage (20)

**Public Query Contract:**
- `orderBy` uses `field:direction` format (e.g., `name:asc`, `createdAt:desc`) in a single query parameter
- Multiple fields can be sent as repeated params: `?orderBy=name:asc&orderBy=createdAt:desc`
- `PaginationOrderPipe` parses this into an array of order objects (`[{ field: direction }]`)

**Search Behavior:**
- `PaginationSearchPipe` builds a Prisma `OR` condition across `availableSearch` fields.
- Each field uses `Prisma.StringFilter` with `mode: 'insensitive'`, so search is case-insensitive.
- Shape: `{ OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }`.
- With no `availableSearch`, the pipe ignores the parameter and applies no search predicate; the request still returns 200.

**Usage:**
```typescript
@PaginationCursorQuery({
    availableSearch: WorkspaceDefaultAvailableSearch,
    availableOrderBy: WorkspaceCursorAvailableOrderBy,
})
pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
```

No controller overrides `cursorField`; every cursor route positions on `id`.

#### Filter Decorators

##### @PaginationQueryFilterInEnum\<T\>

Filters by comma-separated enum values using 'in' operator.

**Factory Function:**
```typescript
PaginationQueryFilterInEnum<T>(
    field: string,
    defaultEnum: T[],
    options?: { customField?: string }
)
```

**Parameters:**
- `field`: Query parameter name
- `defaultEnum`: Array of valid enum values
- `options.customField`: Database field name (defaults to field)

**Usage:**
```typescript
@PaginationQueryFilterInEnum(
    'status',
    [EnumUserStatus.active, EnumUserStatus.inactive]
)
status?: Record<string, IPaginationIn>
```

**Transforms:**
- Query: `?status=active,inactive`
- To: `{ status: { in: ['active', 'inactive'] } }`

**Validation:**
- Throws `PaginationFilterInvalidValueEnumException` (422) if value not in enum
- Error code: `50201 (filterInvalidValue)`

##### @PaginationQueryFilterNinEnum\<T\>

Filters by comma-separated enum values using 'not in' operator.

**Factory Function:**
```typescript
PaginationQueryFilterNinEnum<T>(
    field: string,
    defaultEnum: T[],
    options?: { customField?: string }
)
```

**Usage:**
```typescript
@PaginationQueryFilterNinEnum(
    'status',
    [EnumUserStatus.blocked, EnumUserStatus.inactive]
)
status?: Record<string, IPaginationNin>
```

**Transforms:**
- Query: `?status=blocked,inactive`
- To: `{ status: { notIn: ['blocked', 'inactive'] } }`

##### @PaginationQueryFilterEqualBoolean

Filters by boolean value ('true'/'false').

**Usage:**
```typescript
@PaginationQueryFilterEqualBoolean('isActive')
isActive?: Record<string, IPaginationEqual>
```

**Transforms:**
- Query: `?isActive=true`
- To: `{ isActive: { equals: true } }`

**Validation:**
- Accepts only 'true' or 'false'
- Throws `PaginationFilterInvalidValueException` (422) for invalid boolean

##### @PaginationQueryFilterEqualNumber

Filters by numeric value.

**Usage:**
```typescript
@PaginationQueryFilterEqualNumber('age')
age?: Record<string, IPaginationEqual>
```

**Transforms:**
- Query: `?age=25`
- To: `{ age: { equals: 25 } }`

**Validation:**
- Parses as float
- Throws `PaginationFilterInvalidValueException` (422) for non-numeric value

##### @PaginationQueryFilterEqualString

Filters by string value.

**Usage:**
```typescript
@PaginationQueryFilterEqualString('roleId')
roleId?: Record<string, IPaginationEqual>
```

**Transforms:**
- Query: `?roleId=507f1f77bcf86cd799439011`
- To: `{ roleId: { equals: '507f1f77bcf86cd799439011' } }`

The field must be a **scalar** column. `equals` is not a valid operator on a Prisma to-one relation (that takes `is` / `isNot`), so filter on the foreign-key scalar (`roleId`, `countryId`) rather than the relation name (`role`, `country`).

##### @PaginationQueryFilterNotEqual

Filters by inequality (not equal).

**Factory Function:**
```typescript
PaginationQueryFilterNotEqual(
    field: string,
    options?: { customField?: string, isBoolean?: boolean, isNumber?: boolean }
)
```

**Usage:**
```typescript
@PaginationQueryFilterNotEqual('status')
status?: Record<string, IPaginationNotEqual>
```

**Transforms:**
- Query: `?status=inactive`
- To: `{ status: { not: 'inactive' } }`

**Supports same type conversions as equality filters.**

##### @PaginationQueryFilterDate

Filters by ISO date string with range operations.

**Factory Function:**
```typescript
PaginationQueryFilterDate(
    field: string,
    options?: IPaginationQueryFilterDateOptions
)
```

**`IPaginationQueryFilterDateOptions`:**
```typescript
{
    customField?: string;
    type?: EnumPaginationFilterDateBetweenType;
    dayOf?: EnumHelperDateDayOf;
}
```

**Parameters:**
- `field`: Query parameter name
- `options.type`:
  - `EnumPaginationFilterDateBetweenType.start`: Greater than or equal (`gte`) — use for start date
  - `EnumPaginationFilterDateBetweenType.end`: Less than or equal (`lte`) — use for end date
  - Undefined: emits the `equal` key — exact date match
- `options.dayOf`: Day adjustment option (`EnumHelperDateDayOf`)

**Usage:**
```typescript
@PaginationQueryFilterDate('createdAt', {
    type: EnumPaginationFilterDateBetweenType.start
})
startDate?: Record<string, IPaginationDate>

@PaginationQueryFilterDate('createdAt', {
    type: EnumPaginationFilterDateBetweenType.end
})
endDate?: Record<string, IPaginationDate>
```

**Transforms:**
- Query: `?startDate=2024-01-01`
- To: `{ createdAt: { gte: new Date('2024-01-01T00:00:00Z') } }`

**Validation:**
- Accepts ISO format (YYYY-MM-DD, ISO 8601 timestamps)
- Throws `PaginationFilterInvalidValueException` (422) for invalid ISO date

#### Ordering Configuration

Ordering is **not** a standalone decorator. It is configured via the `availableOrderBy` option in `@PaginationOffsetQuery` or `@PaginationCursorQuery`. Internally, `PaginationOrderPipe` handles the validation and transformation.

**Configuration:**
```typescript
@PaginationOffsetQuery({
    availableOrderBy: UserDefaultAvailableOrderBy,
})
pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
```

**Default Behavior:**
- If no `orderBy` query param is sent: falls back to `[{ createdAt: 'desc' }]`
- `availableOrderBy` is optional. Absent, `null`, and `[]` behave identically: validation is skipped entirely and any `orderBy` the client sends is discarded in favour of the default ordering
- Once `availableOrderBy` is non-empty it is enforced. If the field part of `orderBy` is not in it: throws `PaginationOrderByNotAllowedException` (422)
- If the direction part of `orderBy` is not `asc` or `desc`: throws `PaginationOrderDirectionNotAllowedException` (422). A bare `?orderBy=field` with no direction hits this same error rather than being reinterpreted

**Query Parameters:**
- `orderBy`: A `field:direction` string (e.g., `name:asc`). Repeat to sort by multiple fields.

**Transforms:**
- Query: `?orderBy=name:asc`
- To: `[{ name: 'asc' }]`

**Internal Service Support:**
- `PaginationOrderPipe` parses repeated `orderBy` query params into a multi-entry array; `PaginationService` accepts that same array format directly, so a handler can also build a multi-field `orderBy` manually without going through the decorator
- Example: `[{ createdAt: 'desc' }, { name: 'asc' }]`

**Validation:**
- Field must be in allowed list
- Invalid field throws error code: `50200 (orderByNotAllowed)`
- Invalid direction throws error code: `50215 (orderDirectionNotAllowed)`

## Pagination Strategies

### Choosing a Strategy

The route prefix decides the strategy, not the endpoint. Every `/admin/**` list is offset; every list under `/user`, `/shared`, `/system`, and `/public` is cursor. There is no per-endpoint exception list.

Two consequences a client has to plan around:

- A non-admin list returns no `count`, no `page`, and no `totalPage`. `includeCount` is a repository-side argument, never a query param, so a client cannot ask for a total.
- Offset cannot reach past row 2000 (`PaginationDefaultMaxPage` × `PaginationDefaultMaxPerPage`). It narrows and browses; it never scans a whole collection.

Cursor routes also constrain what they will sort on: every field in a cursor route's `availableOrderBy` is immutable. A row whose sort key can change mid-scroll genuinely moves position, and no tiebreaker stabilises that. Where a module's offset route allows a mutable field that its cursor route cannot, the two carry separate constants, `<Module>DefaultAvailableOrderBy` and `<Module>CursorAvailableOrderBy`. When every field is immutable both routes share one constant.

### Offset-Based

**Characteristics:**
- Returns total count
- Slower with large offsets
- Predictable page numbers
- Affected by inserts/deletes during pagination

**Constraints:**
- Max page: 20 (`PaginationDefaultMaxPage`); above it throws `PaginationPageExceedsMaximumException` (50208)
- Max perPage: 100 (`PaginationDefaultMaxPerPage`); above it throws `PaginationPerPageExceedsMaximumException` (50210)
- Min page: 1; below it throws `PaginationPageCannotBeLessThanOneException` (50209)
- Min perPage: 1; below it throws `PaginationPerPageCannotBeLessThanOneException` (50211)
- A non-integer `page` or `perPage` throws `PaginationInvalidPageException` (50207) or `PaginationInvalidPerPageException` (50202)

**Response Example:**

The pagination fields ride inside the `metadata` block of the standard response envelope, not at the top level:

```json
{
    "statusCode": 200,
    "message": "...",
    "metadata": {
        "type": "offset",
        "count": 250,
        "perPage": 20,
        "page": 1,
        "totalPage": 13,
        "hasNext": true,
        "hasPrevious": false,
        "nextPage": 2,
        "search": "...",
        "filters": { ... },
        "orderBy": ["createdAt:desc"],
        "availableSearch": ["name", "email"],
        "availableOrderBy": ["createdAt", "name"]
    },
    "data": [...]
}
```

### Cursor-Based

**How It Works:**
1. The service resolves `orderBy`, appends the `cursorField` tiebreaker, and hashes the canonicalized `{ where, orderBy }` into a 16-hex-character fingerprint
2. It reads `limit + 1` rows to decide `hasNext`, then encodes the last returned row's id and that fingerprint as `{ cursor, fingerprint }`
3. On the next request it recomputes the fingerprint and compares it to the `fingerprint` in the supplied cursor
4. A mismatch throws `PaginationInvalidCursorPaginationParamsException`, so a client cannot page on with a filter or an ordering that has since changed

**Characteristics:**
- Cursor-based navigation (no page numbers)
- Consistent performance (indexed cursor field)
- Optional count, fetched only when the repository sets `includeCount`
- Safe for real-time data changes
- Constant-size cursor (around 94 characters) regardless of filter complexity
- The appended `cursorField` tiebreaker keeps the position stable even when the sort key repeats

**Constraints:**
- Max cursor length: 256 characters (`PaginationMaxCursorLength`); longer throws `PaginationCursorTooLongException` (50204)
- Cursor format: URL-safe base64 (A-Za-z0-9_-); any other character throws `PaginationInvalidCursorFormatException` (50205)
- Fingerprint mismatch: throws `PaginationInvalidCursorPaginationParamsException` (50203)
- Max perPage: 100; above it throws `PaginationPerPageExceedsMaximumException` (50210)
- Min perPage: 1; below it throws `PaginationPerPageCannotBeLessThanOneException` (50211)

**Response Example:**

The pagination fields ride inside the `metadata` block of the standard response envelope. The wire field for the encoded cursor is `nextCursor`, not `cursor`; `hasPrevious` is always `false` for this strategy:

```json
{
    "statusCode": 200,
    "message": "...",
    "metadata": {
        "type": "cursor",
        "nextCursor": "eyJjdXJzb3IiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJmaW5nZXJwcmludCI6IjlmMmM0YTFiN2UwZDNhNTYifQ",
        "perPage": 20,
        "hasNext": true,
        "hasPrevious": false,
        "orderBy": ["createdAt:desc"],
        "availableSearch": ["name", "email"],
        "availableOrderBy": ["createdAt"]
    },
    "data": [...]
}
```

## Filtering System

Filters combine using spread operator into the `where` clause:

```typescript
return this.paginationService.offset(repository, {
    ...pagination,
    where: {
        ...where,
        ...status,          // Adds: { status: { in: [...] } }
        ...roleId,          // Adds: { roleId: { equals: '...' } }
        ...countryId,       // Adds: { countryId: { equals: '...' } }
        deletedAt: null
    }
});
```

### Enum Filters

**In (inclusion):**
```typescript
@PaginationQueryFilterInEnum('status', [EnumUserStatus.active, EnumUserStatus.inactive])
status?: Record<string, IPaginationIn>

// Query: ?status=active,inactive
// Database: WHERE status IN ('active', 'inactive')
```

**Nin (exclusion):**
```typescript
@PaginationQueryFilterNinEnum('status', [EnumUserStatus.blocked])
status?: Record<string, IPaginationNin>

// Query: ?status=blocked
// Database: WHERE status NOT IN ('blocked')
```

### Equality Filters

**Boolean:**
```typescript
@PaginationQueryFilterEqualBoolean('isActive')
isActive?: Record<string, IPaginationEqual>

// Query: ?isActive=true
// Database: WHERE isActive = true
```

**Number:**
```typescript
@PaginationQueryFilterEqualNumber('age')
age?: Record<string, IPaginationEqual>

// Query: ?age=25
// Database: WHERE age = 25
```

**String:**
```typescript
@PaginationQueryFilterEqualString('roleId')
roleId?: Record<string, IPaginationEqual>

// Query: ?roleId=507f1f77bcf86cd799439011
// Database: WHERE roleId = '507f1f77bcf86cd799439011'
```

**Not Equal:**
```typescript
@PaginationQueryFilterNotEqual('countryId')
countryId?: Record<string, IPaginationNotEqual>

// Query: ?countryId=507f1f77bcf86cd799439012
// Database: WHERE countryId != '507f1f77bcf86cd799439012'
```

### Date Filters

**Date Range:**
```typescript
@PaginationQueryFilterDate('createdAt', {
    type: EnumPaginationFilterDateBetweenType.start
})
startDate?: Record<string, IPaginationDate>

@PaginationQueryFilterDate('createdAt', {
    type: EnumPaginationFilterDateBetweenType.end
})
endDate?: Record<string, IPaginationDate>

// Query: ?startDate=2024-01-01&endDate=2024-12-31
// Database: WHERE createdAt >= '2024-01-01' AND createdAt <= '2024-12-31'
```

## Ordering

**Default Behavior:**
- Field: `createdAt`
- Direction: `desc` (descending)

**HTTP Query Format:**
- `orderBy` uses `field:direction` format in a single query parameter
- Repeat the parameter to sort by multiple fields

**Query Parameters:**
```
?orderBy=name:asc
?orderBy=name:asc&orderBy=createdAt:desc
```

**Internal Service Format:**
```typescript
orderBy: [
    { createdAt: 'desc' },
    { name: 'asc' }
]
```

All `orderBy` values passed to the service are arrays. The single-element array `[{ createdAt: 'desc' }]` is the typical default. Cursors do not carry the `orderBy` itself, only a fingerprint of it.

**Response Metadata Format:**
```json
"orderBy": ["createdAt:desc", "name:asc"]
```

The response reports the applied ordering back in the same `field:direction` format the query accepts, not in the internal object form, so a client can echo `metadata.orderBy` straight back as repeated `?orderBy=` params. An empty order renders `[]`.

**Field Whitelist:**
`availableOrderBy` is optional, but a route that declares it accepts sorting on those fields and nothing else. Every list route in this codebase declares one, from a `<Module>DefaultAvailableOrderBy` or `<Module>CursorAvailableOrderBy` constant:
```typescript
@PaginationOffsetQuery({
    availableOrderBy: UserDefaultAvailableOrderBy,
})
```

## Usage Examples

### Basic Offset Pagination

A list route travels `Controller → HTTP Service → Domain Service → Repository`. The HTTP service is where the raw rows become response DTOs; the domain service forwards the pagination params, and the repository is the layer that adds `include`.

**Controller:**
```typescript
@Get('/list')
@ResponsePaging('user.list')
async list(
    @PaginationOffsetQuery({
        availableSearch: UserDefaultAvailableSearch,
        availableOrderBy: UserDefaultAvailableOrderBy,
    })
    pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    return this.userHttpService.getListOffsetByAdmin(pagination);
}
```

**HTTP Service:**
```typescript
async getListOffsetByAdmin(
    pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    const { data, ...others } =
        await this.userService.getListOffsetByAdmin(pagination);

    return { data: this.userUtil.mapList(data), ...others };
}
```

**Domain Service:**
```typescript
async getListOffsetByAdmin(
    pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
): Promise<IResponsePagingReturn<IUser>> {
    return this.userRepository.findWithPaginationOffset(pagination);
}
```

**Repository:**
```typescript
async findWithPaginationOffset({
    where,
    ...params
}: IPaginationQueryOffsetParams<Prisma.UserWhereInput>): Promise<
    IResponsePagingReturn<IUser>
> {
    return this.paginationService.offset<IUser, Prisma.UserWhereInput>(
        this.databaseService.client.user,
        {
            ...params,
            where: {
                ...where,
                deletedAt: null,
            },
            include: { role: true, twoFactor: true },
        }
    );
}
```

**API Request:**
```
GET /admin/user/list?page=1&perPage=20&search=john&orderBy=name:asc
```

### Cursor Pagination

**Controller:**
```typescript
@Get('/list')
@ResponsePaging('workspace.list')
async list(
    @PaginationCursorQuery({
        availableSearch: WorkspaceDefaultAvailableSearch,
        availableOrderBy: WorkspaceCursorAvailableOrderBy,
    })
    pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>,
    @AuthJwtPayload('userId') userId: string
): Promise<IResponsePagingReturn<WorkspaceResponseDto>> {
    return this.workspaceHttpService.getListForMember(userId, pagination);
}
```

**Repository:**
```typescript
async findWithPaginationCursorByMember(
    userId: string,
    {
        where,
        ...others
    }: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
): Promise<IPaginationCursorReturn<Workspace>> {
    return this.paginationService.cursor<
        Workspace,
        Prisma.WorkspaceWhereInput
    >(this.databaseService.client.workspace, {
        ...others,
        where: {
            AND: [
                where ?? {},
                { OR: WorkspaceActiveFilter },
                { members: { some: { userId } } },
            ],
        },
    });
}
```

**API Requests:**
```
# First page
GET /user/workspace/list?perPage=20&orderBy=createdAt:asc

# Next page. The same orderBy must be repeated, or the fingerprint check fails
GET /user/workspace/list?cursor=eyJjdXJzb3IiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJmaW5nZXJwcmludCI6IjlmMmM0YTFiN2UwZDNhNTYifQ&perPage=20&orderBy=createdAt:asc
```

### With Filters

**Controller:**
```typescript
@Get('/list')
@ResponsePaging('user.list')
async list(
    @PaginationOffsetQuery({
        availableSearch: UserDefaultAvailableSearch,
        availableOrderBy: UserDefaultAvailableOrderBy,
    })
    pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
    @PaginationQueryFilterInEnum<EnumUserStatus>(
        'status',
        UserDefaultStatus
    )
    status?: Record<string, IPaginationIn>,
    @PaginationQueryFilterEqualString('roleId')
    roleId?: Record<string, IPaginationEqual>,
    @PaginationQueryFilterEqualString('countryId')
    countryId?: Record<string, IPaginationEqual>
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    return this.userHttpService.getListOffsetByAdmin(
        pagination,
        status,
        roleId,
        countryId
    );
}
```

**HTTP Service:**
```typescript
async getListOffsetByAdmin(
    pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
    status?: Record<string, IPaginationIn>,
    roleId?: Record<string, IPaginationEqual>,
    countryId?: Record<string, IPaginationEqual>
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    const { data, ...others } = await this.userService.getListOffsetByAdmin(
        pagination,
        status,
        roleId,
        countryId
    );

    return { data: this.userUtil.mapList(data), ...others };
}
```

Each filter parameter travels as its own argument all the way to the repository, which is where the `where` clauses merge.

**Repository:**
```typescript
async findWithPaginationOffset(
    {
        where,
        ...params
    }: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
    status?: Record<string, IPaginationIn>,
    roleId?: Record<string, IPaginationEqual>,
    countryId?: Record<string, IPaginationEqual>
): Promise<IResponsePagingReturn<IUser>> {
    return this.paginationService.offset<IUser, Prisma.UserWhereInput>(
        this.databaseService.client.user,
        {
            ...params,
            where: {
                ...where,
                ...status,     // Spreads { status: { in: [...] } }
                ...countryId,  // Spreads { countryId: { equals: '...' } }
                ...roleId,     // Spreads { roleId: { equals: '...' } }
                deletedAt: null,
            },
            include: {
                role: true,
                twoFactor: true,
            },
        }
    );
}
```

**API Request:**
```
GET /admin/user/list?page=1&perPage=20&status=active,inactive
```

### Complete Example

A paginated route in place, with the Swagger doc decorator and the full protection stack around it:

```typescript
@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    constructor(private readonly userHttpService: UserHttpService) {}

    @UserAdminListDoc()
    @ResponsePaging('user.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: UserDefaultAvailableSearch,
            availableOrderBy: UserDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        @PaginationQueryFilterInEnum<EnumUserStatus>(
            'status',
            UserDefaultStatus
        )
        status?: Record<string, IPaginationIn>,
        @PaginationQueryFilterEqualString('roleId')
        roleId?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualString('countryId')
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        return this.userHttpService.getListOffsetByAdmin(
            pagination,
            status,
            roleId,
            countryId
        );
    }
}
```

`@ResponsePaging` is what turns the service's `IPaginationOffsetReturn` into the `metadata` block; `@UserAdminListDoc()` wraps `DocResponsePaging` and is where the same allow-list constants reach Swagger.

## Integration with Doc Module

The Pagination module integrates with the [Doc module][ref-doc-doc] for automatic API documentation.

The allow-list is declared once, in the module's `<module>.list.constant.ts`, and both decorators consume that same constant. A literal array in either place is a second copy of the allow-list, and two copies are how the documented contract and the enforced contract drift apart.

**Example:**
```typescript
// src/modules/user/constants/user.list.constant.ts
export const UserDefaultAvailableSearch = ['name', 'username', 'email'];
export const UserDefaultAvailableOrderBy = ['createdAt', 'name'];

// src/modules/user/docs/user.admin.doc.ts
DocResponsePaging<UserListResponseDto>('user.list', {
    dto: UserListResponseDto,
    availableSearch: UserDefaultAvailableSearch,
    availableOrderBy: UserDefaultAvailableOrderBy,
    type: EnumPaginationType.offset,
})

// src/modules/user/controllers/user.admin.controller.ts
@UserAdminListDoc()
@Get('/list')
async list(
    @PaginationOffsetQuery({
        availableSearch: UserDefaultAvailableSearch,
        availableOrderBy: UserDefaultAvailableOrderBy,
    })
    pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    return this.userService.getListOffsetByAdmin(pagination);
}
```

Both decorators use the same option name, `availableOrderBy`, for the same constant.

`DocResponsePaging` also takes `type: EnumPaginationType`, which selects the query parameters and the error responses it documents. It is **required**: a block that omits it does not compile, so Swagger can never advertise `page` on a route that has no page.

```typescript
DocResponsePaging<WorkspaceResponseDto>('workspace.list', {
    dto: WorkspaceResponseDto,
    type: EnumPaginationType.cursor,
    availableSearch: WorkspaceDefaultAvailableSearch,
    availableOrderBy: WorkspaceCursorAvailableOrderBy,
})
```

The `@DocResponsePaging` decorator automatically:
- Documents paginated response structure
- Adds the offset or cursor query parameters, chosen by `type`
- Adds the shared pagination error responses plus the offset-only or cursor-only set
- Documents the `search` parameter when `availableSearch` is provided
- Documents the `orderBy` parameter when `availableOrderBy` is provided
- Generates OpenAPI/Swagger specification

For detailed Doc module documentation, see [Doc module documentation][ref-doc-doc].

## Implementation Notes

### Pagination State (CLS store)

Pagination pipes are singletons (not request-scoped). After parsing query parameters, each pipe writes response-metadata into the per-request CLS store via `RequestStoreService.merge(PaginationStoreKey, ...)`, merging keys individually so multiple pipes can contribute without overwriting each other.

`ResponsePagingInterceptor` reads the accumulated state back via `RequestStoreService.get(PaginationStoreKey)` to build the `metadata` block on the response. Key points:

- Each pipe merges its parsed values (page, perPage, orderBy, availableOrderBy, search, availableSearch, filters) into the store for the response metadata, in addition to passing them to the handler as method parameters.
- The store holds `orderBy` in its object form (`IPaginationOrderBy[]`). `ResponsePagingInterceptor` flattens it into `field:direction` strings on the way out, so the stored shape and the wire shape differ.
- The store never enters a service or repository layer.
- Per-request isolation is guaranteed by the CLS store opened once per request by `ClsMiddleware`, not by DI scope.
- Pagination metadata appears on the success path only. On error the interceptor is skipped and no pagination fields are emitted.

### Performance Considerations

**Offset Pagination:**
- Use for small datasets (< 10,000 items)
- Avoid large page numbers
- Slower with large offsets (DB must skip rows)
- Use when total count is important

**Cursor Pagination:**
- Better for large datasets
- Consistent performance (indexed lookup)
- Use for infinite scroll
- Avoids N+1 count queries



<!-- REFERENCES -->

[ref-doc-response]: response.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-database]: database.md
[ref-doc-doc]: doc.md
