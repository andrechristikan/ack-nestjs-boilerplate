# Response Documentation

This documentation explains the features and usage of **Response Module**: Located at `src/common/response`

## Overview

ACK NestJS Boilerplate standardizes API responses through decorators that automatically format responses, handle pagination, manage file downloads, and set custom headers. Each decorator uses an interceptor to transform data into consistent structures with metadata, status codes, and localized messages.

## Table of Contents

- [Overview](#overview)
- [Response Decorators](#response-decorators)
  - [@Response](#response)
  - [@ResponsePaging](#responsepaging)
  - [@ResponseCsv](#responsecsv)
- [Response Structure](#response-structure)
  - [Standard](#standard)
  - [Paginated](#paginated)
  - [Activity Log Metadata](#activity-log-metadata-optional)
- [Caching](#caching)
- [Custom Headers](#custom-headers)

## Response Decorators

### @Response

Standard API response decorator with optional caching.

**Parameters:**
- `messagePath` (string): Path to response message for localization
- `options` (optional): Configuration options
  - `cache` (boolean | object): Enable caching

**Interceptor:** `ResponseInterceptor` - transforms responses into standard format with metadata and localized messages via [MessageService][ref-doc-message]

**Usage:**

```typescript
@Response('user.get')
@Get('/:id')
async getUser(@Param('id') id: string): Promise<IResponseReturn<UserDto>> {
  return {
    data: await this.userService.findById(id)
  };
}
```

**Custom Status Code:**

```typescript
@Response('user.create')
@Post('/')
async createUser(@Body() dto: CreateUserDto): Promise<IResponseReturn<UserDto>> {
  try {
    const data = await this.userService.create(dto);
    
    // Response: { statusCode: 201, message: "...", data: {...}, metadata: {...} }
    return {
      data,
      metadata: {
        statusCode: 201,
        httpStatus: HttpStatus.CREATED
      }
    };
  } catch {
    // Response: { statusCode: 200, message: "...", data: {...}, metadata: {...} }
    return {
      data,
      metadata: {
        statusCode: 200,
        httpStatus: HttpStatus.OK
      }
    };
  }
}
```

**Custom Message:**

```typescript
@Response('user.update')
@Patch('/:id')
async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<IResponseReturn<UserDto>> {
  const user = await this.userService.update(id, dto);
  
  return {
    data: user,
    metadata: {
      messagePath: 'user.updateSuccess',
      messageProperties: { name: user.name }
    }
  };
}
```

### @ResponsePaging

Paginated API response decorator with optional caching. Supports both offset-based and cursor-based pagination.

**Parameters:**
- `messagePath` (string): Path to response message for localization
- `options` (optional): Configuration options
  - `cache` (boolean | object): Enable caching

**Requirements:**
- Request must include pagination parameters (see [Pagination Documentation][ref-doc-pagination])
- Response must implement `IResponsePagingReturn<T>` interface
- Must specify pagination `type`: `'offset'` or `'cursor'`

**Interceptor:** `ResponsePagingInterceptor` - validates pagination data, supports offset and cursor-based pagination, includes search/filter/sort metadata

**Offset-based Pagination:**

```typescript
@ResponsePaging('user.list')
@Get('/list')
async listUsers(
  @PaginationQuery() { page, perPage, orderBy, orderDirection }: PaginationListDto
): Promise<IResponsePagingReturn<UserDto>> {
  const { data, totalPage, count } = await this.userService.findAll({
    page,
    perPage,
    orderBy,
    orderDirection
  });
  
  return {
    type: 'offset',
    data,
    totalPage,
    page,
    perPage,
    count,
    hasNext: page < totalPage,
    nextPage: page < totalPage ? page + 1 : undefined,
    previousPage: page > 1 ? page - 1 : undefined
  };
}
```

**Cursor-based Pagination:**

```typescript
@ResponsePaging('user.list')
@Get('/list')
async listUsers(
  @PaginationQuery() query: PaginationListDto
): Promise<IResponsePagingReturn<UserDto>> {
  const { data, cursor, count, hasNext } = await this.userService.findAllCursor(query);
  
  return {
    type: 'cursor',
    data,
    cursor,
    perPage: query.perPage,
    count,
    hasNext
  };
}
```

### @ResponseCsv

CSV file download response decorator that generates and streams CSV files with proper download headers.

**Parameters:** None

**Requirements:**
- Response must implement `IResponseCsvReturn<T>` interface
- Data must be an array of objects
- CSV uses semicolon (;) as delimiter
- Optional `filename` - if not provided, generates timestamped filename: `export-{timestamp}.csv`

**Interceptor:** `ResponseCsvInterceptor` - converts data to CSV format, sets content headers (Content-Type, Content-Disposition, Content-Length), uses provided filename or generates timestamped filename

**Basic Export (Auto-generated Filename):**

```typescript
@ResponseCsv()
@Get('/export')
async exportUsers(): Promise<IResponseCsvReturn<UserDto>> {
  const users = await this.userService.findAll();
  
  return {
    data: users // Filename will be: export-{timestamp}.csv
  };
}
```

**Custom Filename:**

```typescript
@ResponseCsv()
@Get('/export/custom')
async exportUsersCustom(): Promise<IResponseCsvReturn<UserDto>> {
  const users = await this.userService.findAll();
  
  return {
    data: users,
    filename: 'users-export.csv'
  };
}
```

**Dynamic Filename:**

```typescript
@ResponseCsv()
@Get('/export/monthly')
async exportMonthlyReport(): Promise<IResponseCsvReturn<ReportDto>> {
  const data = await this.reportService.getMonthlyData();
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  return {
    data,
    filename: `monthly-report-${month}.csv`
  };
}
```

## Response Structure

### Standard

```typescript
{
  statusCode: number;
  message: string;
  metadata: {
    language: string;
    timestamp: number;
    timezone: string;
    path: string;
    version: string;
    repoVersion: string;
    requestId: string;
    correlationId: string;
  };
  data?: T;
}
```

### Paginated

```typescript
{
  statusCode: number;
  message: string;
  metadata: {
    // Base metadata
    language: string;
    timestamp: number;
    timezone: string;
    path: string;
    version: string;
    repoVersion: string;
    requestId: string;
    correlationId: string;
    
    // Pagination metadata
    type: 'offset' | 'cursor'; // Pagination type
    search?: string;
    filters?: Record<string, any>;
    perPage: number;
    
    // Offset-specific fields (when type = 'offset')
    page?: number;
    totalPage?: number;
    count?: number;
    nextPage?: number;
    previousPage?: number;
    hasPrevious?: boolean;
    
    // Cursor-specific fields (when type = 'cursor')
    nextCursor?: string;
    previousCursor?: string;
    count?: number; // Optional, included if requested
    
    // Common fields
    hasNext: boolean;
    orderBy: string;
    orderDirection: 'asc' | 'desc';
    availableSearch: string[];
    availableOrderBy: string[];
  };
  data: T[];
}
```

### Activity Log Metadata (Optional)

All response types (`IResponseReturn`, `IResponsePagingReturn`, `IResponseCsvReturn`) support optional activity log metadata for request tracking and auditing:

```typescript
return {
  data: user,
  metadataActivityLog: {
    // Activity log tracking data
  }
};
```

See [Activity Log Documentation][ref-doc-activity-log] for complete implementation details.

## Caching

`@Response` and `@ResponsePaging` support optional caching via `ResponseCacheInterceptor` (extends NestJS CacheInterceptor with custom prefixes).

**Basic Caching:**

```typescript
@Response('user.get', { cache: true })
@Get('/:id')
async getUser(@Param('id') id: string): Promise<IResponseReturn<UserDto>> {
  return { data: await this.userService.findById(id) };
}
```

**Custom Cache Configuration:**

```typescript
@Response('user.get', {
  cache: {
    key: 'user-detail',
    ttl: 3600 // seconds
  }
})
@Get('/:id')
async getUser(@Param('id') id: string): Promise<IResponseReturn<UserDto>> {
  return { data: await this.userService.findById(id) };
}
```

See [NestJS Cache Manager](https://docs.nestjs.com/techniques/caching) and [Cache Documentation][ref-doc-cache] for configuration.

## Custom Headers

All responses automatically include these headers (set by interceptors):

- `x-custom-lang`: Response language
- `x-timestamp`: Response timestamp
- `x-timezone`: Response timezone
- `x-version`: API version
- `x-repo-version`: Repository version
- `x-request-id`: Unique request identifier
- `x-correlation-id`: Request correlation identifier

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
[ref-prisma]: https://www.prisma.io
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

<!-- DOCUMENTS -->

[ref-doc-root]: readme.md
[ref-doc-activity-log]: docs/activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-file-upload]: docs/file-upload.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-logger]: docs/logger.md
[ref-doc-message]: docs/message.md
[ref-doc-pagination]: docs/pagination.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-doc]: docs/doc.md
[ref-doc-third-party-integration]: docs/third-party-integration.md
[ref-doc-presign]: docs/presign.md
