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
- [Serialization](#serialization)
  - [ResponseUtil](#responseutil)
  - [Opt-In with @Expose](#opt-in-with-expose)
  - [Nested DTOs](#nested-dtos)
  - [Hiding Fields](#hiding-fields)
  - [Serialization Flow](#serialization-flow)
- [Response Structure](#response-structure)
  - [Standard](#standard)
  - [Paginated](#paginated)
- [Caching](#caching)
- [Custom Headers](#custom-headers)

## Related Documents

- [Message Documentation][ref-doc-message] - For internationalization and error message translation
- [Handling Error Documentation][ref-doc-handling-error] - For exception handling and response formatting
- [Doc Documentation][ref-doc-doc] - For API documentation integration with DTOs
- [File Upload Documentation][ref-doc-file-upload] - For file validation pipes
- [Request Validation Documentation][ref-doc-request-validation] - For input-boundary DTO validation and serialization

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

## Serialization

Response payloads are serialized in per-module mapper utilities (`*/utils/*.util.ts`) **before** they reach the controller. The `@Response` / `@ResponsePaging` interceptors only wrap the already-mapped `data` into the standard envelope — they do **not** strip or transform fields. Serialization is **opt-in**: only fields decorated with `@Expose()` survive; everything else is dropped (**fail-closed**). A newly added entity field never leaks into a response until it is explicitly exposed.

> Input validation (`RequestModule`) uses the opposite mode (`excludeExtraneousValues: false`) — unknown input keys are rejected by `whitelist`, not silently dropped. See [Request Validation Documentation][ref-doc-request-validation]. Input and output serialization are distinct paths.

### ResponseUtil

`ResponseUtil` (`src/common/response/utils/response.util.ts`) centralizes serialization. It is provided by the global `ResponseModule` and wraps `plainToInstance` with `excludeExtraneousValues: true` — the transform option is defined here **once** for the whole application. Never call `plainToInstance` directly on the response path; inject `ResponseUtil` and call `serialize`.

```typescript
@Injectable()
export class ResponseUtil {
  serialize<T, V>(cls: ClassConstructor<T>, plain: V[]): T[];
  serialize<T, V>(cls: ClassConstructor<T>, plain: V): T;
  serialize<T, V>(cls: ClassConstructor<T>, plain: V | V[]): T | T[] {
    return plainToInstance(cls, plain, {
      excludeExtraneousValues: true,
    });
  }
}
```

**Mapper usage** — inject `ResponseUtil`, call `serialize` (overloaded for single object and array):

```typescript
@Injectable()
export class DeviceUtil {
  constructor(private readonly responseUtil: ResponseUtil) {}

  mapList(devices: IDeviceOwnership[]): DeviceOwnershipResponseDto[] {
    return this.responseUtil.serialize(DeviceOwnershipResponseDto, devices);
  }
}
```

### Opt-In with @Expose

Every field that should appear in the response **must** carry `@Expose()`. A declared field without `@Expose()` is dropped at serialization time.

```typescript
export class DeviceOwnershipResponseDto extends DatabaseResponseDto {
  @ApiProperty({ description: 'Device ownership ID' })
  @Expose()
  deviceId: string;

  @ApiProperty({ description: 'User ID who owns the device' })
  @Expose()
  userId: string;
}
```

`@Transform(...)` and `@ApiProperty(...)` are independent — keep them as-is alongside `@Expose()`.

### Nested DTOs

`excludeExtraneousValues: true` propagates into nested `@Type(() => X)` properties. When a parent DTO is serialized, **every nested DTO must already carry `@Expose()` on its own fields** — otherwise the nested object comes back empty. Keep both `@Type` and `@Expose` on the parent property:

```typescript
@ApiProperty({ type: DeviceResponseDto })
@Expose()
@Type(() => DeviceResponseDto)
device: DeviceResponseDto;
```

### Hiding Fields

Under opt-in, a sensitive top-level field is hidden simply by **not** adding `@Expose()` — no `@Exclude()` needed (e.g. `password`, `hash`). `@Exclude()` is still required for **subclass-hide**: when a subclass must hide a field that a parent class already `@Expose()`s.

```typescript
// Parent exposes name/type/key; create response hides them, shows only `secret`.
export class ApiKeyCreateResponseDto extends ApiKeyResponseDto {
  @Expose()
  secret: string;

  @Exclude() name: string;
  @Exclude() type: EnumApiKeyType;
  @Exclude() key: string;
}
```

### Serialization Flow

```text
Service returns entity / interface (raw)
    ↓
Module mapper util: responseUtil.serialize(SomeResponseDto, data)
    ↓
plainToInstance(cls, data, { excludeExtraneousValues: true })
    ↓
Only @Expose() fields kept (nested @Type DTOs serialized recursively)
    ↓
Controller returns { data } / { data: [] }
    ↓
ResponseInterceptor wraps into standard envelope + metadata + headers
```

Metadata and headers are built by the shared `ResponseMetadataService` (`src/common/response/services/response.metadata.service.ts`): `create()` returns a `ResponseMetadataDto` from the request store, `setHeaders(response, metadata)` mirrors it to response headers. The three response interceptors and the four app filters call it instead of building metadata inline.

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
    
    // Cursor-specific fields (when type = 'cursor')
    nextCursor?: string;
    previousCursor?: string;
  };
  data: T[];
}
```

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

- `x-custom-lang`: Response language (read from the request store `RequestLanguageStoreKey`, fallback config `message.language`)
- `x-timestamp`: Response timestamp
- `x-timezone`: Response timezone
- `x-version`: API version (read from the request store `RequestVersionStoreKey`, fallback config `app.urlVersion.version`)
- `x-repo-version`: Repository version
- `x-request-id`: Unique request identifier (read from the request store `RequestIdStoreKey`)
- `x-correlation-id`: Request correlation identifier (read from the request store `RequestCorrelationIdStoreKey`)

The same store-sourced `language`, `version`, `requestId`, and `correlationId` feed the response `metadata`. `request.id` / `request.correlationId` are kept only for pino logging.



<!-- REFERENCES -->

[ref-doc-message]: message.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-doc]: doc.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-pagination]: pagination.md
[ref-doc-cache]: cache.md
[ref-doc-request-validation]: request-validation.md
