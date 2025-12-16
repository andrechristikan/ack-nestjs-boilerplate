# Pagination Documentation

This documentation explains the features and usage of **Pagination Module**: Located at `src/common/pagination`

## Overview

The Pagination module provides a comprehensive solution for handling paginated data throughout the application. It supports both offset-based and cursor-based pagination strategies with built-in filtering, searching, and ordering capabilities. The module uses decorator-based approach to simplify pagination implementation in controllers.

## Related Documents

- [Response][ref-doc-response]
- [Request Validation][ref-doc-request-validation]
- [Database][ref-doc-database]
- [Doc][ref-doc-doc]

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Module](#module)
  - [PaginationService](#paginationservice)
  - [Decorators](#decorators)
- [Strategies](#strategies)
  - [Offset](#offset)
  - [Cursor](#cursor)
- [Usage](#usage)
  - [Offset](#offset-1)
  - [Cursor](#cursor-1)
  - [Filters](#filters)
  - [Complex](#complex)
  - [API Request](#api-request)
- [Integration with Doc Module](#integration-with-doc-module)

## Module

The Pagination module is a global module that provides services and decorators for handling pagination across the application.

### PaginationService

Core service that processes pagination operations:

- `offset<TReturn>(repository, args)`: Executes offset-based pagination with validation
  - Validates limit (max: 100) and page (max: 50)
  - Returns paginated data with metadata: `count`, `perPage`, `page`, `totalPage`, `hasNext`, `hasPrevious`, `nextPage`, `previousPage`
- `cursor<TReturn>(repository, args)`: Executes cursor-based pagination
  - Uses URL-safe base64-encoded cursor containing cursor value, orderBy, and where conditions
  - Automatically invalidates cursor if orderBy or where conditions change, resetting to first page
  - Validates limit (max: 100)
  - Returns paginated data with metadata: `cursor`, `perPage`, `hasNext`, `count` (optional)
  - MongoDB ObjectID includes timestamp, preventing duplicates in cursor pagination

### Decorators

#### PaginationOffsetQuery

Decorator for offset-based pagination with search, paging, and ordering.

Options:
- `defaultPerPage`: Default items per page (default: 20)
- `availableSearch`: Array of searchable fields
- `availableOrderBy`: Array of fields available for ordering

**Default Behavior:**
- If no `orderBy` parameter is provided, results will be sorted by `createdAt: DESC`

Usage:
```typescript
@PaginationOffsetQuery({
    availableSearch: ['name', 'email'],
    availableOrderBy: ['createdAt', 'name']
})
pagination: IPaginationQueryOffsetParams
```

#### PaginationCursorQuery

Decorator for cursor-based pagination with search, paging, and ordering.

Options:
- `defaultPerPage`: Default items per page (default: 20)
- `cursorField`: Field to use as cursor (default: 'id')
- `availableSearch`: Array of searchable fields
- `availableOrderBy`: Array of fields available for ordering

**Default Behavior:**
- If no `orderBy` parameter is provided, results will be sorted by `createdAt: DESC`

Usage:
```typescript
@PaginationCursorQuery({
    availableSearch: ['name', 'email'],
    cursorField: '_id'
})
pagination: IPaginationQueryCursorParams
```

#### PaginationQueryFilterInEnum

Filter by enum values using 'in' operator.

Parameters:
- `field`: Query parameter name
- `defaultEnum`: Array of valid enum values
- `options.customField`: Custom database field name (defaults to field name)

Usage:
```typescript
@PaginationQueryFilterInEnum<EnumUserStatus>(
    'status',
    [EnumUserStatus.ACTIVE]
)
status?: Record<string, IPaginationIn>
```

#### PaginationQueryFilterNinEnum

Filter by enum values using 'not in' operator.

Parameters:
- `field`: Query parameter name
- `defaultEnum`: Array of valid enum values
- `options.customField`: Custom database field name (defaults to field name)

Usage:
```typescript
@PaginationQueryFilterNinEnum<EnumUserStatus>(
    'status',
    [EnumUserStatus.INACTIVE]
)
status?: Record<string, IPaginationNin>
```

#### PaginationQueryFilterEqualBoolean

Filter by boolean equality.

Parameters:
- `field`: Query parameter name
- `options.customField`: Custom database field name (defaults to field name)

Usage:
```typescript
@PaginationQueryFilterEqualBoolean('isActive')
isActive?: Record<string, IPaginationEqual>
```

#### PaginationQueryFilterEqualNumber

Filter by number equality.

Parameters:
- `field`: Query parameter name
- `options.customField`: Custom database field name (defaults to field name)

Usage:
```typescript
@PaginationQueryFilterEqualNumber('age')
age?: Record<string, IPaginationEqual>
```

#### PaginationQueryFilterEqualString

Filter by string equality.

Parameters:
- `field`: Query parameter name
- `options.customField`: Custom database field name (defaults to field name)

Usage:
```typescript
@PaginationQueryFilterEqualString('role')
role?: Record<string, IPaginationEqual>
```

#### PaginationQueryFilterNotEqual

Filter by inequality.

Parameters:
- `field`: Query parameter name
- `options.customField`: Custom database field name (defaults to field name)

Usage:
```typescript
@PaginationQueryFilterNotEqual('status')
status?: Record<string, IPaginationNotEqual>
```

#### PaginationQueryFilterDate

Filter by date range.

Parameters:
- `field`: Query parameter name
- `options.customField`: Custom database field name (defaults to field name)
- `options.type`: Filter type ('start' for gte, 'end' for lte, undefined for equal)
- `options.dayOf`: Day adjustment option

Usage:
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

## Strategies

### Offset

Offset pagination uses page numbers and items per page. Best for:
- Known total count requirements
- Direct page navigation
- Smaller datasets

Query parameters:
- `page`: Page number (max: 50)
- `perPage`: Items per page (max: 100)
- `orderBy`: Field to order by
- `orderDirection`: 'asc' or 'desc'
- `search`: Search term

Response includes:
```typescript
{
    type: 'offset',
    count: number,        // Total items
    perPage: number,      // Items per page
    page: number,         // Current page
    totalPage: number,    // Total pages
    hasNext: boolean,     // Has next page
    hasPrevious: boolean, // Has previous page
    nextPage?: number,    // Next page number
    previousPage?: number,// Previous page number
    data: T[]            // Paginated data
}
```

### Cursor

Cursor pagination uses encoded cursors for navigation. Best for:
- Real-time data
- Large datasets
- Infinite scroll
- Consistent results during data changes

MongoDB ObjectID includes timestamp, ensuring unique cursors without duplicates.

**Cursor Behavior:**
- Cursor is URL-safe base64-encoded and contains: cursor value, orderBy, and where conditions
- Cursor automatically invalidates when orderBy or where conditions change, resetting to first page
- This ensures consistent pagination even when filters or sorting change

Query parameters:
- `cursor`: URL-safe base64-encoded cursor
- `perPage`: Items per page (max: 100)
- `orderBy`: Field to order by
- `orderDirection`: 'asc' or 'desc'
- `search`: Search term

Response includes:
```typescript
{
    type: 'cursor',
    cursor?: string,      // Next cursor
    perPage: number,      // Items per page
    hasNext: boolean,     // Has next page
    count?: number,       // Total items (if includeCount enabled)
    data: T[]            // Paginated data
}
```

## Usage

### Offset

```typescript
@Get('/list')
@ResponsePaging('user.list')
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

Service implementation:
```typescript
async getListOffset(
    pagination: IPaginationQueryOffsetParams
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    const { data, ...others } = 
        await this.userRepository.findWithPaginationOffset(pagination);
    
    const users: UserListResponseDto[] = this.userUtil.mapList(data);
    
    return {
        data: users,
        ...others,
    };
}
```

Repository implementation:
```typescript
async findWithPaginationOffset(
    params: IPaginationQueryOffsetParams
): Promise<IResponsePagingReturn<IUser>> {
    return this.paginationService.offset<IUser>(
        this.databaseService.user, 
        {
            ...params,
            where: {
                ...params.where,
                deletedAt: null,
            },
            include: {
                role: true,
            },
        }
    );
}
```

### Cursor

```typescript
@Get('/list')
@ResponsePaging('user.list')
async list(
    @PaginationCursorQuery({
        availableSearch: ['name', 'email'],
        cursorField: '_id'
    })
    pagination: IPaginationQueryCursorParams
) {
    return this.userService.getListCursor(pagination);
}
```

Service implementation:
```typescript
async getListCursor(
    pagination: IPaginationQueryCursorParams
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    const { data, ...others } = 
        await this.userRepository.findWithPaginationCursor(pagination);
    
    const users: UserListResponseDto[] = this.userUtil.mapList(data);
    
    return {
        data: users,
        ...others,
    };
}
```

Repository implementation:
```typescript
async findWithPaginationCursor(
    params: IPaginationQueryCursorParams
): Promise<IPaginationCursorReturn<IUser>> {
    return this.paginationService.cursor<IUser>(
        this.databaseService.user,
        {
            ...params,
            where: {
                ...params.where,
                deletedAt: null,
            },
            include: {
                role: true,
            },
        }
    );
}
```

### Filters

```typescript
@Get('/list')
@ResponsePaging('user.list')
async list(
    @PaginationOffsetQuery({
        availableSearch: ['name', 'email'],
        availableOrderBy: ['createdAt', 'name']
    })
    pagination: IPaginationQueryOffsetParams,
    @PaginationQueryFilterInEnum<EnumUserStatus>(
        'status',
        [EnumUserStatus.ACTIVE, EnumUserStatus.INACTIVE]
    )
    status?: Record<string, IPaginationIn>,
    @PaginationQueryFilterEqualString('role')
    role?: Record<string, IPaginationEqual>,
    @PaginationQueryFilterEqualString('country')
    country?: Record<string, IPaginationEqual>
) {
    return this.userService.getListOffset(
        pagination,
        status,
        role,
        country
    );
}
```

Service implementation:
```typescript
async getListOffset(
    pagination: IPaginationQueryOffsetParams,
    status?: Record<string, IPaginationIn>,
    role?: Record<string, IPaginationEqual>,
    country?: Record<string, IPaginationEqual>
): Promise<IResponsePagingReturn<UserListResponseDto>> {
    const { data, ...others } = 
        await this.userRepository.findWithPaginationOffset(
            pagination,
            status,
            role,
            country
        );
    
    const users: UserListResponseDto[] = this.userUtil.mapList(data);
    
    return {
        data: users,
        ...others,
    };
}
```

Repository implementation:
```typescript
async findWithPaginationOffset(
    { where, ...params }: IPaginationQueryOffsetParams,
    status?: Record<string, IPaginationIn>,
    role?: Record<string, IPaginationEqual>,
    country?: Record<string, IPaginationEqual>
): Promise<IResponsePagingReturn<IUser>> {
    return this.paginationService.offset<IUser>(
        this.databaseService.user,
        {
            ...params,
            where: {
                ...where,
                ...status,
                ...country,
                ...role,
                deletedAt: null,
            },
            include: {
                role: true,
            },
        }
    );
}
```

### Complex

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
            availableSearch: UserDefaultAvailableSearch,
            availableOrderBy: ['createdAt', 'email', 'name']
        })
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterInEnum<EnumUserStatus>(
            'status',
            UserDefaultStatus
        )
        status?: Record<string, IPaginationIn>,
        @PaginationQueryFilterEqualString('role')
        role?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualString('country')
        country?: Record<string, IPaginationEqual>,
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
            role,
            country,
            startDate,
            endDate
        );
    }
}
```

### API Request

```
GET /user/list?page=1&perPage=20&search=john&status=active,inactive&role=admin&orderBy=createdAt&orderDirection=desc&createdAt=2024-01-01
```

## Integration with Doc Module

The Pagination module integrates with the [Doc module][ref-doc-doc] through the `@DocResponsePaging` decorator for API documentation.

**Usage with Pagination:**

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

**The `@DocResponsePaging` decorator automatically:**
- Documents paginated response structure with metadata fields
- Adds standard pagination query parameters (`page`, `perPage`)
- Documents search parameter when `availableSearch` is provided
- Documents ordering parameters (`orderBy`, `orderDirection`) when `availableOrder` is provided
- Generates OpenAPI/Swagger specification for the endpoint
- Integrates with [Response module][ref-doc-response] for consistent response format

**Complete Documentation Example:**

```typescript
export function UserAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all users',
        }),
        DocRequest({
            queries: UserDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<UserListResponseDto>('user.list', {
            dto: UserListResponseDto,
            availableSearch: ['name', 'email', 'username'],
            availableOrder: ['createdAt', 'updatedAt', 'name']
        })
    );
}

@UserAdminListDoc()
@Get('/list')
async listUsers(
    @PaginationOffsetQuery({
        availableSearch: ['name', 'email', 'username'],
        availableOrderBy: ['createdAt', 'updatedAt', 'name']
    })
    pagination: IPaginationQueryOffsetParams
) {
    return this.userService.getListOffset(pagination);
}
```

For detailed documentation on API documentation decorators and OpenAPI generation, see [Doc module documentation][ref-doc-doc].




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

<!-- CONTRIBUTOR -->

[ref-contributor-gzerox]: https://github.com/Gzerox
