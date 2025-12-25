# Pagination Module Documentation

This documentation explains the features and usage of the **Pagination Module** located at `src/common/pagination`.

## Overview

The Pagination module provides a comprehensive solution for handling paginated data throughout the application. It supports:
- **Offset-based pagination**: Traditional page number and limit approach
- **Cursor-based pagination**: Efficient traversal using cursor tokens
- **Advanced filtering**: Enum, equality, date range, and custom filters
- **Field ordering**: Validation and transformation of sort parameters
- **Error handling**: Consistent error responses with detailed context

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
        - [Ordering Decorator](#ordering-decorator)
            - [@PaginationOrder](#paginationorder)
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
async offset<TReturn>(
    repository: IPaginationRepository,
    args: IPaginationQueryOffsetParams
): Promise<IPaginationOffsetReturn<TReturn>>
```

**Parameters:**
- `repository`: Repository instance implementing IPaginationRepository
- `args`: Validated pagination parameters from pipe

**Default Values:**
- `orderBy`: `{ createdAt: 'desc' }` - Sort by creation date descending

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
async cursor<TReturn>(
    repository: IPaginationRepository,
    args: IPaginationQueryCursorParams
): Promise<IPaginationCursorReturn<TReturn>>
```

**Parameters:**
- `repository`: Repository instance
- `args`: Validated pagination parameters from pipe

**Default Values:**
- `orderBy`: `{ createdAt: 'desc' }` - Sort by creation date descending
- `cursorField`: `'id'` - Field used for cursor positioning

**Cursor Validation:**
- Cursor contains: cursor value, orderBy, and where conditions
- If `orderBy` or `where` conditions change: throws `BadRequestException` (400)
- Client must request from beginning if conditions change
- Prevents stale cursor navigation

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
    orderBy: { ... },   // { createdAt: 'desc' } by default
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
- Throws `BadRequestException` (400) if value not in enum
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
- Throws `BadRequestException` (400) for invalid boolean

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
- Throws `BadRequestException` (400) for non-numeric value

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
    options?: {
        customField?: string,
        type?: EnumPaginationFilterDateBetweenType,
        dayOf?: DayOfOption
    }
)
```

**Parameters:**
- `field`: Query parameter name
- `options.type`:
  - `START`: Greater than or equal (gte) - use for start date
  - `END`: Less than or equal (lte) - use for end date
  - Undefined: Equals - exact date match
- `options.dayOf`: Day adjustment option

**Usage:**
```typescript
@PaginationQueryFilterDate('createdAt', {
    type: EnumPaginationFilterDateBetweenType.START
})
startDate?: Record<string, IPaginationDate>

@PaginationQueryFilterDate('createdAt', {
    type: EnumPaginationFilterDateBetweenType.END
})
endDate?: Record<string, IPaginationDate>
```

**Transforms:**
- Query: `?startDate=2024-01-01`
- To: `{ createdAt: { gte: new Date('2024-01-01T00:00:00Z') } }`

**Validation:**
- Accepts ISO format (YYYY-MM-DD, ISO 8601 timestamps)
- Throws `BadRequestException` (400) for invalid ISO date

#### Ordering Decorator

##### @PaginationOrder

Decorator for field ordering.

**Factory Function:**
```typescript
PaginationOrderPipe(defaultAvailableOrder?: string[]): Type<PipeTransform>
```

**Parameters:**
- `defaultAvailableOrder`: Array of fields allowed for ordering

**Default Behavior:**
- If no `orderBy`: sorts by `createdAt: DESC`
- If `orderBy` not in allowed fields: throws `BadRequestException` (400)

**Usage:**
```typescript
@PaginationOrder(['createdAt', 'name', 'email'])
order?: IPaginationOrderBy
```

**Query Parameters:**
- `orderBy`: Field name (must be in allowed list)
- `orderDirection`: 'asc' or 'desc'

**Transforms:**
- Query: `?orderBy=name&orderDirection=asc`
- To: `{ name: 'asc' }`

**Validation:**
- Field must be in allowed list
- Throws error code: `5020 (orderByNotAllowed)`

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
    type: EnumPaginationFilterDateBetweenType.START
})
startDate?: Record<string, IPaginationDate>

@PaginationQueryFilterDate('createdAt', {
    type: EnumPaginationFilterDateBetweenType.END
})
endDate?: Record<string, IPaginationDate>

// Query: ?startDate=2024-01-01&endDate=2024-12-31
// Database: WHERE createdAt >= '2024-01-01' AND createdAt <= '2024-12-31'
```

## Ordering

**Default Behavior:**
- Field: `createdAt`
- Direction: `desc` (descending)

**Query Parameters:**
```
?orderBy=name&orderDirection=asc
```

**Field Whitelist:**
Must be specified in decorator to prevent SQL injection:
```typescript
@PaginationOrder(['createdAt', 'name', 'email'])
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
GET /users?page=1&perPage=20&search=john&orderBy=name&orderDirection=asc
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
GET /users?perPage=20&orderBy=name&orderDirection=asc

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
        type: EnumPaginationFilterDateBetweenType.START
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
            type: EnumPaginationFilterDateBetweenType.START
        })
        startDate?: Record<string, IPaginationDate>,
        @PaginationQueryFilterDate('createdAt', {
            type: EnumPaginationFilterDateBetweenType.END
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

<!-- BADGE LINKS -->

[ack-contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[jest-shield]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
[pnpm-shield]: https://img.shields.io/badge/pnpm-%232C8EBB.svg?style=for-the-badge&logo=pnpm&logoColor=white&color=F9AD00
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white

<!-- CONTACTS -->

[ref-author-linkedin]: https://linkedin.com/in/andrechristikan
[ref-author-email]: mailto:andrechristikan@gmail.com
[ref-author-github]: https://github.com/andrechristikan
[ref-author-paypal]: https://www.paypal.me/andrechristikan
[ref-author-kofi]: https://ko-fi.com/andrechristikan

<!-- Repo LINKS -->

[ref-ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ref-ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ref-ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ref-ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ref-ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors
[ref-ack-license]: LICENSE.md

<!-- THIRD PARTY -->

[ref-nestjs]: http://nestjs.com
[ref-nestjs-swagger]: https://docs.nestjs.com/openapi/introduction
[ref-nestjs-swagger-types]: https://docs.nestjs.com/openapi/types-and-parameters
[ref-nestjs-i18n]: https://nestjs-i18n.com
[ref-prisma]: https://www.prisma.io
[ref-prisma-mongodb]: https://www.prisma.io/docs/orm/overview/databases/mongodb#commonalities-with-other-database-provider
[ref-prisma-setup]: https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project#switching-databases
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-pnpm]: https://pnpm.io
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

[ref-doc-root]: ../readme.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-cache]: cache.md
[ref-doc-configuration]: configuration.md
[ref-doc-database]: database.md
[ref-doc-environment]: environment.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-installation]: installation.md
[ref-doc-logger]: logger.md
[ref-doc-message]: message.md
[ref-doc-pagination]: pagination.md
[ref-doc-project-structure]: project-structure.md
[ref-doc-queue]: queue.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-response]: response.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-doc]: doc.md
[ref-doc-third-party-integration]: third-party-integration.md
[ref-doc-presign]: presign.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-two-factor]: two-factor.md

<!-- CONTRIBUTOR -->

[ref-contributor-gzerox]: https://github.com/Gzerox
[ref-contributor-ak2g]: https://github.com/ak2g
