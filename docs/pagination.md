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
- **Service level**: `orderBy` is always an array of order objects (`IPaginationOrderBy[]`)

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
            - [@PaginationQueryFilterNotEqual<T>](#paginationqueryfilternotequalt)
            - [@PaginationQueryFilterDate](#paginationqueryfilterdate)
        - [Ordering Configuration](#ordering-configuration)
- [Pagination Strategies](#pagination-strategies)
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

**Methods:**

#### offset\<TReturn\>()

Executes offset-based pagination.

```typescript
async offset<TReturn, TArgsSelect = unknown, TArgsWhere = unknown>(
    repository: IPaginationRepository,
    args: IPaginationQueryOffsetParams<TArgsSelect, TArgsWhere>
): Promise<IPaginationOffsetReturn<TReturn>>
```

**Type Parameters:**
- `TReturn` — shape of each item in the returned `data` array
- `TArgsSelect` — Prisma `select` type for the model (e.g. `Prisma.UserSelect`). Defaults to `unknown`
- `TArgsWhere` — Prisma `where` type for the model (e.g. `Prisma.UserWhereInput`). Defaults to `unknown`

**Parameters:**
- `repository`: Repository instance implementing IPaginationRepository
- `args`: Validated pagination parameters from pipe

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
async cursor<TReturn, TArgsSelect = unknown, TArgsWhere = unknown>(
    repository: IPaginationRepository,
    args: IPaginationQueryCursorParams<TArgsSelect, TArgsWhere>
): Promise<IPaginationCursorReturn<TReturn>>
```

**Type Parameters:**
- `TReturn` — shape of each item in the returned `data` array
- `TArgsSelect` — Prisma `select` type for the model (e.g. `Prisma.UserSelect`). Defaults to `unknown`
- `TArgsWhere` — Prisma `where` type for the model (e.g. `Prisma.UserWhereInput`). Defaults to `unknown`

**Parameters:**
- `repository`: Repository instance
- `args`: Validated pagination parameters from pipe

**`args.orderBy` Support:**
- Always an array: `[{ createdAt: 'desc' }]`, `[{ createdAt: 'desc' }, { name: 'asc' }]`

**Default Values:**
- `orderBy`: `[{ createdAt: 'desc' }]` - Sort by creation date descending
- If omitted, defaults to `PaginationDefaultOrderBy`
- `cursorField`: `'id'` - Field used for cursor positioning

**Cursor Validation:**
- Cursor contains: cursor value, orderBy, and where conditions
- If `orderBy` or `where` conditions change: throws `UnprocessableEntityException` (422)
- Client must request from beginning if conditions change
- Prevents stale cursor navigation
- For array-based ordering, the array order must remain exactly the same between requests

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

### Decorators

#### Pagination Query Decorators

##### @PaginationOffsetQuery

Decorator for offset-based pagination with search and ordering.

**Options:**
- `defaultPerPage`: Items per page (default: 20, max: 100)
- `availableSearch`: Array of searchable fields
- `availableOrderBy`: Array of fields available for ordering

**Default Behavior:**
- If no `orderBy`: sorts by `createdAt: DESC`
- Page defaults to 1
- PerPage defaults to PaginationDefaultPerPage (20)

**Public Query Contract:**
- `orderBy` uses `field:direction` format (e.g., `name:asc`, `createdAt:desc`) in a single query parameter
- Multiple fields can be sent as repeated params: `?orderBy=name:asc&orderBy=createdAt:desc`
- `PaginationOrderPipe` parses this into an array of order objects (`[{ field: direction }]`)

**Usage:**
```typescript
@PaginationOffsetQuery({
    availableSearch: ['name', 'email'],
    availableOrderBy: ['createdAt', 'name', 'email']
})
pagination: IPaginationQueryOffsetParams
```

**Transformed to:**
```typescript
{
    limit: 20,           // from perPage
    skip: 0,            // (page - 1) * perPage
    orderBy: [...],     // [{ createdAt: 'desc' }] by default
    where: { ... },     // filters combined here
    select: { ... },    // fields to select
    include: { ... }    // relations to include
}
```

##### @PaginationCursorQuery

Decorator for cursor-based pagination.

**Options:**
- `defaultPerPage`: Items per page (default: 20, max: 100)
- `cursorField`: Field for cursor (default: 'id')
- `availableSearch`: Array of searchable fields
- `availableOrderBy`: Array of fields available for ordering

**Default Behavior:**
- If no `orderBy`: sorts by `createdAt: DESC`
- Cursor is optional (undefined = first page)
- PerPage defaults to PaginationDefaultPerPage (20)

**Public Query Contract:**
- `orderBy` uses `field:direction` format (e.g., `name:asc`, `createdAt:desc`) in a single query parameter
- Multiple fields can be sent as repeated params: `?orderBy=name:asc&orderBy=createdAt:desc`
- `PaginationOrderPipe` parses this into an array of order objects (`[{ field: direction }]`)

**Usage:**
```typescript
@PaginationCursorQuery({
    availableSearch: ['name', 'email'],
    cursorField: '_id'
})
pagination: IPaginationQueryCursorParams
```

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
    [EnumUserStatus.ACTIVE, EnumUserStatus.INACTIVE]
)
status?: Record<string, IPaginationIn>
```

**Transforms:**
- Query: `?status=ACTIVE,INACTIVE`
- To: `{ status: { in: ['ACTIVE', 'INACTIVE'] } }`

**Validation:**
- Throws `UnprocessableEntityException` (422) if value not in enum
- Error code: `5021 (filterInvalidValue)`

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
    [EnumUserStatus.BANNED, EnumUserStatus.INACTIVE]
)
status?: Record<string, IPaginationNin>
```

**Transforms:**
- Query: `?status=BANNED,INACTIVE`
- To: `{ status: { notIn: ['BANNED', 'INACTIVE'] } }`

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
- Throws `UnprocessableEntityException` (422) for invalid boolean

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
- Throws `UnprocessableEntityException` (422) for non-numeric value

##### @PaginationQueryFilterEqualString

Filters by string value.

**Usage:**
```typescript
@PaginationQueryFilterEqualString('role')
role?: Record<string, IPaginationEqual>
```

**Transforms:**
- Query: `?role=admin`
- To: `{ role: { equals: 'admin' } }`

##### @PaginationQueryFilterNotEqual\<T\>

Filters by inequality (not equal).

**Factory Function:**
```typescript
PaginationQueryFilterNotEqual<T>(
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
  - Undefined: Equals — exact date match
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
- Throws `UnprocessableEntityException` (422) for invalid ISO date

#### Ordering Configuration

Ordering is **not** a standalone decorator. It is configured via the `availableOrderBy` option in `@PaginationOffsetQuery` or `@PaginationCursorQuery`. Internally, `PaginationOrderPipe` handles the validation and transformation.

**Configuration:**
```typescript
@PaginationOffsetQuery({
    availableOrderBy: ['createdAt', 'name', 'email']
})
pagination: IPaginationQueryOffsetParams
```

**Default Behavior:**
- If no `orderBy` query param is sent: falls back to `[{ createdAt: 'desc' }]`
- If `availableOrderBy` is omitted: any `orderBy` value is ignored and `[{ createdAt: 'desc' }]` is used
- If the field part of `orderBy` is not in `availableOrderBy`: throws `UnprocessableEntityException` (422)
- If the direction part of `orderBy` is not `asc` or `desc`: throws `UnprocessableEntityException` (422)

**Query Parameters:**
- `orderBy`: A `field:direction` string (e.g., `name:asc`). Repeat to sort by multiple fields.

**Transforms:**
- Query: `?orderBy=name:asc`
- To: `[{ name: 'asc' }]`

**Internal Service Support:**
- Query helpers only produce a single order object
- `PaginationService` also accepts manual multi-field ordering in internal code
- Example: `[{ createdAt: 'desc' }, { name: 'asc' }]`

**Validation:**
- Field must be in allowed list
- Invalid field throws error code: `5020 (orderByNotAllowed)`
- Invalid direction throws error code: `5035 (orderDirectionNotAllowed)`

## Pagination Strategies

### Offset-Based

**Characteristics:**
- Returns total count
- Slower with large offsets
- Predictable page numbers
- Affected by inserts/deletes during pagination

**Constraints:**
- Max page: 20
- Max perPage: 100
- Min page: 1
- Min perPage: 1

**Response Example:**
```json
{
    "type": "offset",
    "count": 250,
    "perPage": 20,
    "page": 1,
    "totalPage": 13,
    "hasNext": true,
    "hasPrevious": false,
    "nextPage": 2,
    "data": [...]
}
```

### Cursor-Based

**How It Works:**
1. Cursor encodes: cursor value, orderBy, where conditions
2. Cursor validates conditions match on each request
3. If conditions change: throws error (client must restart)
4. Prevents navigation with stale conditions

**Characteristics:**
- Cursor-based navigation (no page numbers)
- Consistent performance (indexed cursor field)
- Optional count (requests only if needed)
- Safe for real-time data changes
- MongoDB ObjectID timestamps prevent duplicates

**Constraints:**
- Max cursor length: 256 characters
- Cursor format: URL-safe base64 (A-Za-z0-9_-)
- Max perPage: 100
- Min perPage: 1

**Response Example:**
```json
{
    "type": "cursor",
    "cursor": "eyJjdXJzb3I6IjEyMyIsIm9yZGVyQnkiOnsidGltZXN0YW1wIjoiZGVzIn0sIndoZXJlIjp7fX0=",
    "perPage": 20,
    "hasNext": true,
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
        ...status,          // Adds: { in: [...] }
        ...role,           // Adds: { equals: '...' }
        ...country,        // Adds: { not: '...' }
        deletedAt: null
    }
});
```

### Enum Filters

**In (inclusion):**
```typescript
@PaginationQueryFilterInEnum('status', [ACTIVE, INACTIVE])
status?: Record<string, IPaginationIn>

// Query: ?status=ACTIVE,INACTIVE
// Database: WHERE status IN ('ACTIVE', 'INACTIVE')
```

**Nin (exclusion):**
```typescript
@PaginationQueryFilterNinEnum('status', [BANNED, DELETED])
status?: Record<string, IPaginationNin>

// Query: ?status=BANNED,DELETED
// Database: WHERE status NOT IN ('BANNED', 'DELETED')
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
@PaginationQueryFilterEqualString('role')
role?: Record<string, IPaginationEqual>

// Query: ?role=admin
// Database: WHERE role = 'admin'
```

**Not Equal:**
```typescript
@PaginationQueryFilterNotEqual('country')
country?: Record<string, IPaginationNotEqual>

// Query: ?country=US
// Database: WHERE country != 'US'
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

All `orderBy` values passed to the service and stored in cursors are arrays. The single-element array `[{ createdAt: 'desc' }]` is the typical default.

**Field Whitelist:**
Must be specified via `availableOrderBy` in the query decorator to prevent injection:
```typescript
@PaginationOffsetQuery({
    availableOrderBy: ['createdAt', 'name', 'email']
})
```

## Usage Examples

### Basic Offset Pagination

**Controller:**
```typescript
@Get('/users')
@ResponsePaging('user.list')
async listUsers(
    @PaginationOffsetQuery({
        availableSearch: ['name', 'email'],
        availableOrderBy: ['createdAt', 'name']
    })
    pagination: IPaginationQueryOffsetParams
) {
    return this.userService.getListOffset(pagination);
}
```

**Service:**
```typescript
async getListOffset(
    pagination: IPaginationQueryOffsetParams
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    const { data, ...others } = 
        await this.userRepository.findWithPaginationOffset(pagination);
    
    const users = this.userUtil.mapList(data);
    
    return { data: users, ...others };
}
```

**Repository:**
```typescript
async findWithPaginationOffset(
    pagination: IPaginationQueryOffsetParams
): Promise<IResponsePagingReturn<IUser>> {
    return this.paginationService.offset<IUser>(
        this.databaseService.user,
        {
            ...pagination,
            where: {
                ...pagination.where,
                deletedAt: null
            },
            include: { role: true }
        }
    );
}
```

**API Request:**
```
GET /users?page=1&perPage=20&search=john&orderBy=name:asc
```

### Cursor Pagination

**Controller:**
```typescript
@Get('/users')
@ResponsePaging('user.list')
async listUsers(
    @PaginationCursorQuery({
        availableSearch: ['name', 'email'],
        cursorField: '_id'
    })
    pagination: IPaginationQueryCursorParams
) {
    return this.userService.getListCursor(pagination);
}
```

**Service:**
```typescript
async getListCursor(
    pagination: IPaginationQueryCursorParams
): Promise<IPaginationCursorReturn<UserListResponseDto>> {
    const { data, ...others } = 
        await this.userRepository.findWithPaginationCursor(pagination);
    
    const users = this.userUtil.mapList(data);
    
    return { data: users, ...others };
}
```

**Repository:**
```typescript
async findWithPaginationCursor(
    pagination: IPaginationQueryCursorParams
): Promise<IPaginationCursorReturn<IUser>> {
    return this.paginationService.cursor<IUser>(
        this.databaseService.user,
        {
            ...pagination,
            where: {
                ...pagination.where,
                deletedAt: null
            },
            include: { role: true }
        }
    );
}
```

**API Requests:**
```
# First page
GET /users?perPage=20&orderBy=name:asc

# Next page
GET /users?cursor=eyJjdXJzb3I6IjEyMyIsIm9yZGVyQnkiOnsibmFtZSI6ImFzYyJ9fQ==&perPage=20
```

### With Filters

**Controller:**
```typescript
@Get('/users')
@ResponsePaging('user.list')
async listUsers(
    @PaginationOffsetQuery({
        availableSearch: ['name', 'email'],
        availableOrderBy: ['createdAt', 'name']
    })
    pagination: IPaginationQueryOffsetParams,
    @PaginationQueryFilterInEnum(
        'status',
        [EnumUserStatus.ACTIVE, EnumUserStatus.INACTIVE]
    )
    status?: Record<string, IPaginationIn>,
    @PaginationQueryFilterEqualString('role')
    role?: Record<string, IPaginationEqual>,
    @PaginationQueryFilterEqualBoolean('isActive')
    isActive?: Record<string, IPaginationEqual>,
    @PaginationQueryFilterDate('createdAt', {
        type: EnumPaginationFilterDateBetweenType.start
    })
    startDate?: Record<string, IPaginationDate>
) {
    return this.userService.getListOffset(
        pagination,
        status,
        role,
        isActive,
        startDate
    );
}
```

**Service:**
```typescript
async getListOffset(
    pagination: IPaginationQueryOffsetParams,
    status?: Record<string, IPaginationIn>,
    role?: Record<string, IPaginationEqual>,
    isActive?: Record<string, IPaginationEqual>,
    startDate?: Record<string, IPaginationDate>
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    const { data, ...others } = 
        await this.userRepository.findWithPaginationOffset(
            pagination,
            status,
            role,
            isActive,
            startDate
        );
    
    const users = this.userUtil.mapList(data);
    
    return { data: users, ...others };
}
```

**Repository:**
```typescript
async findWithPaginationOffset(
    { where, ...pagination }: IPaginationQueryOffsetParams,
    status?: Record<string, IPaginationIn>,
    role?: Record<string, IPaginationEqual>,
    isActive?: Record<string, IPaginationEqual>,
    startDate?: Record<string, IPaginationDate>
): Promise<IResponsePagingReturn<IUser>> {
    return this.paginationService.offset<IUser>(
        this.databaseService.user,
        {
            ...pagination,
            where: {
                ...where,
                ...status,    // Spreads { status: { in: [...] } }
                ...role,      // Spreads { role: { equals: '...' } }
                ...isActive,  // Spreads { isActive: { equals: true } }
                ...startDate, // Spreads { createdAt: { gte: Date } }
                deletedAt: null
            },
            include: { role: true }
        }
    );
}
```

**API Request:**
```
GET /users?page=1&perPage=20&status=ACTIVE,INACTIVE&role=admin&isActive=true&createdAt=2024-01-01
```

### Complete Example

**Controller with all features:**
```typescript
@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    constructor(private readonly userService: UserService) {}

    @Get('/list')
    @ResponsePaging('user.list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: ['name', 'email'],
            availableOrderBy: ['createdAt', 'email', 'name']
        })
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterInEnum(
            'status',
            [EnumUserStatus.ACTIVE, EnumUserStatus.INACTIVE]
        )
        status?: Record<string, IPaginationIn>,
        @PaginationQueryFilterNinEnum(
            'blockedStatus',
            [EnumUserStatus.BANNED]
        )
        blockedStatus?: Record<string, IPaginationNin>,
        @PaginationQueryFilterEqualBoolean('isActive')
        isActive?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualNumber('age')
        age?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualString('role')
        role?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterNotEqual('country')
        country?: Record<string, IPaginationNotEqual>,
        @PaginationQueryFilterDate('createdAt', {
            type: EnumPaginationFilterDateBetweenType.start
        })
        startDate?: Record<string, IPaginationDate>,
        @PaginationQueryFilterDate('createdAt', {
            type: EnumPaginationFilterDateBetweenType.end
        })
        endDate?: Record<string, IPaginationDate>
    ) {
        return this.userService.getListOffset(
            pagination,
            status,
            blockedStatus,
            isActive,
            age,
            role,
            country,
            startDate,
            endDate
        );
    }
}
```

## Integration with Doc Module

The Pagination module integrates with the [Doc module][ref-doc-doc] for automatic API documentation.

**Example:**
```typescript
@DocResponsePaging<UserListResponseDto>('user.list', {
    dto: UserListResponseDto,
    availableSearch: ['name', 'email'],
    availableOrder: ['createdAt', 'name']
})
@Get('/list')
async list(
    @PaginationOffsetQuery({
        availableSearch: ['name', 'email'],
        availableOrderBy: ['createdAt', 'name']
    })
    pagination: IPaginationQueryOffsetParams
) {
    return this.userService.getListOffset(pagination);
}
```

The `@DocResponsePaging` decorator automatically:
- Documents paginated response structure
- Adds standard pagination query parameters
- Documents search parameter when provided
- Documents ordering parameters
- Generates OpenAPI/Swagger specification

For detailed Doc module documentation, see [Doc module documentation][ref-doc-doc].

## Implementation Notes

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
