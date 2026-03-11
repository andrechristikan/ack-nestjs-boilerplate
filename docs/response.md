# Response Documentation

This documentation explains the features and usage of **Response Module**: Located at `src/common/response`

## Overview

ACK NestJS Boilerplate standardizes API responses through decorators that automatically format responses, handle pagination, manage file downloads, and set custom headers. Each decorator uses an interceptor to transform data into consistent structures with metadata, status codes, and localized messages.

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Response Decorators](#response-decorators)
  - [@Response](#response)
  - [@ResponsePaging](#responsepaging)
  - [@ResponseFile](#responsefile)
- [Response Structure](#response-structure)
  - [Standard](#standard)
  - [Paginated](#paginated)
  - [Activity Log Metadata](#activity-log-metadata-optional)
- [Caching](#caching)
- [Custom Headers](#custom-headers)

## Related Documents

- [Message Documentation][ref-doc-message] - For internationalization and error message translation
- [Handling Error Documentation][ref-doc-handling-error] - For exception handling and response formatting
- [Doc Documentation][ref-doc-doc] - For API documentation integration with DTOs
- [File Upload Documentation][ref-doc-file-upload] - For file validation pipes

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
  @PaginationOffsetQuery() query: IPaginationQuery
): Promise<IResponsePagingReturn<UserDto>> {
  const { data, totalPage, count } = await this.userService.findAll(query);
  
  return {
    type: 'offset',
    data,
    totalPage,
    page: query.page,
    perPage: query.perPage,
    count,
    hasNext: query.page < totalPage,
    hasPrevious: query.page > 1,
    nextPage: query.page < totalPage ? query.page + 1 : undefined,
    previousPage: query.page > 1 ? query.page - 1 : undefined
  };
}
```

**Cursor-based Pagination:**

```typescript
@ResponsePaging('user.list')
@Get('/list')
async listUsers(
  @PaginationCursorQuery() query: IPaginationQuery
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

### @ResponseFile

File download response decorator that handles CSV and PDF file downloads with proper headers and streaming.

**Parameters:** None

**Requirements:**
- Response must implement `IResponseFileReturn` interface (union of `IResponseCsvReturn` | `IResponsePdfReturn`)
- Must specify `extension`: `EnumFileExtensionDocument.csv` or `EnumFileExtensionDocument.pdf`
- CSV data must be a string (pre-converted to CSV format)
- PDF data must be a Buffer
- Optional `filename` - if not provided, generates timestamped filename: `export-{timestamp}.{extension}`

**Interceptor:** `ResponseFileInterceptor` - validates data based on extension type, converts to Buffer, sets content headers (Content-Type, Content-Disposition, Content-Length), returns StreamableFile

**CSV Export (Auto-generated Filename):**

```typescript
@ResponseFile()
@Get('/export/csv')
async exportUsersCsv(): Promise<IResponseCsvReturn> {
  const users = await this.userService.findAll();
  const csvData = this.fileService.writeCsv(users);
  
  return {
    data: csvData,
    extension: EnumFileExtensionDocument.csv
    // Filename will be: export-{timestamp}.csv
  };
}
```

**CSV with Custom Filename:**

```typescript
@ResponseFile()
@Get('/export/users')
async exportUsersCustom(): Promise<IResponseCsvReturn> {
  const users = await this.userService.findAll();
  const csvData = this.fileService.writeCsv(users);
  
  return {
    data: csvData,
    extension: EnumFileExtensionDocument.csv,
    filename: 'users-export.csv'
  };
}
```

**CSV with Formatted Data:**

```typescript
@ResponseFile()
@Get('/export/report')
async exportUsersReport(): Promise<IResponseCsvReturn> {
  const users = await this.userService.findAll();
  
  const formattedData = users.map(user => ({
    Name: user.name,
    Email: user.email,
    'Created At': new Date(user.createdAt).toLocaleDateString(),
    Status: user.isActive ? 'Active' : 'Inactive'
  }));
  
  const csvData = this.fileService.writeCsv(formattedData);
  
  return {
    data: csvData,
    extension: EnumFileExtensionDocument.csv,
    filename: 'user-report.csv'
  };
}
```

**PDF Export:**

```typescript
@ResponseFile()
@Get('/export/pdf')
async exportUsersPdf(): Promise<IResponsePdfReturn> {
  const users = await this.userService.findAll();
  
  // Generate PDF using external library (e.g., pdfkit, puppeteer, jsPDF)
  // Example: const pdfBuffer = await generatePdfReport(users);
  const pdfBuffer = Buffer.from('...'); // Your PDF generation logic here
  
  return {
    data: pdfBuffer,
    extension: EnumFileExtensionDocument.pdf,
    filename: 'users-report.pdf'
  };
}
```

**Dynamic Format Export:**

```typescript
@ResponseFile()
@Get('/export')
async exportUsers(@Query('format') format: 'csv' | 'pdf'): Promise<IResponseFileReturn> {
  const users = await this.userService.findAll();
  const timestamp = Date.now();
  
  if (format === 'pdf') {
    // Generate PDF buffer using your preferred PDF library
    const pdfBuffer = Buffer.from('...'); // Your PDF generation logic
    return {
      data: pdfBuffer,
      extension: EnumFileExtensionDocument.pdf,
      filename: `users-${timestamp}.pdf`
    };
  }
  
  const csvData = this.fileService.writeCsv(users);
  return {
    data: csvData,
    extension: EnumFileExtensionDocument.csv,
    filename: `users-${timestamp}.csv`
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
    type: 'offset' | 'cursor';
    search?: string;
    filters?: Record<string, any>;
    perPage: number;
    count?: number;
    hasNext: boolean;
    hasPrevious: boolean;
    orderBy: IPaginationOrderBy[];   // e.g. [{ createdAt: 'desc' }]
    availableSearch: string[];
    availableOrderBy: string[];
    
    // Offset-specific fields (when type = 'offset')
    page?: number;
    totalPage?: number;
    nextPage?: number;
    previousPage?: number;
    hasPrevious?: boolean;
    
    // Cursor-specific fields (when type = 'cursor')
    nextCursor?: string;
    previousCursor?: string;
  };
  data: T[];
}
```

### Activity Log Metadata (Optional)

All response types (`IResponseReturn`, `IResponsePagingReturn`, `IResponseFileReturn`) support optional activity log metadata for request tracking and auditing:

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

**Cache Key:**

```text
Apis:*
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



<!-- REFERENCES -->

[ref-doc-message]: message.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-doc]: doc.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-pagination]: pagination.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-cache]: cache.md
