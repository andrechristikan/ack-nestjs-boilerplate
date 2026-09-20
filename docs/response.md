# Response Documentation

The response envelope lives in `src/common/response`.

## Overview

Response decorators wrap the handler result with metadata, a status code, and a localized message. Separate decorators cover pagination, file download, and custom headers.

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Response Decorators](#response-decorators)
  - [@Response](#response)
  - [@ResponsePaging](#responsepaging)
  - [@ResponseFile](#responsefile)
- [Serialization](#serialization)
  - [Declaring the Schema](#declaring-the-schema)
  - [A Route That Returns No Data](#a-route-that-returns-no-data)
  - [Nested Schemas](#nested-schemas)
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
- [Doc Documentation][ref-doc-doc] - For API documentation integration with DTOs, and for which error responses OpenAPI publishes (kit primitives only)
- [File Upload Documentation][ref-doc-file-upload] - For file validation pipes
- [Request Validation Documentation][ref-doc-request-validation] - For input-boundary DTO validation and serialization

## Response Decorators

### @Response

Standard API response decorator with optional caching.

**Parameters:**
- `messagePath` (string): Path to response message for localization
- `options` (optional): Configuration options
  - `schema` (zod schema): The payload shape. Its absence declares a route that returns no data
  - `cache` (boolean | object): Enable caching

**Requirements:**
- Handler returns `IResponseReturn<T>`
- `ResponseInterceptor` reads `data` and `metadata` off that object, so a payload returned outside it reaches the envelope as no `data` at all

**Interceptor:** `ResponseInterceptor` - serializes the payload against `options.schema`, then wraps it into the standard envelope with metadata and a localized message via [MessageService][ref-doc-message]

**Usage:**

```typescript
@Response('user.get', { schema: UserProfileResponseSchema })
@Get('/get/:userId')
async get(
  @Param('userId', { schema: RequestUuidSchema }) userId: string
): Promise<IResponseReturn<UserProfileResponseDto>> {
  return this.userHttpService.getOne(userId);
}
```

**Custom Status Code:**

`@Post('/create')` has no `@HttpCode`, so Nest answers `201 Created`. The interceptor takes `httpStatus` from the Express response status unless the handler returns `metadata.httpStatus`. No HTTP service in this checkout returns that field.

```typescript
@Response('user.create', { schema: DatabaseIdResponseSchema })
@Post('/create')
async create(
  @Body({ schema: UserCreateRequestSchema }) body: UserCreateRequestDto,
  @AuthJwtPayload('userId') createdBy: string
): Promise<IResponseReturn<DatabaseIdResponseDto>> {
  return this.userHttpService.createByAdmin(body, createdBy);
}
```

**Custom Message:**

The controller carries the message path and nothing else; the values that fill it come back from the HTTP service on `metadata.messageProperties`:

```typescript
// notification.shared.controller.ts
@Response('notification.markAllAsRead')
@Post('/update/read')
async markAllAsRead(
  @AuthJwtPayload('userId') userId: string
): Promise<IResponseReturn<void>> {
  return this.notificationHttpService.markAllAsRead(userId);
}

// notification.http.service.ts
async markAllAsRead(userId: string): Promise<IResponseReturn<void>> {
  const count = await this.notificationDomain.markAllAsRead(userId);

  return {
    metadata: {
      messageProperties: {
        count,
      },
    },
  };
}
```

`notification.markAllAsRead` resolves to `"{count} notifications marked as read."`, so `count` fills the placeholder.

`metadata` accepts a `messagePath` beside `messageProperties`. `ResponseInterceptor` reads the decorator's path first and then applies `responseMetadata?.messagePath ?? messagePath` (`src/common/response/interceptors/response.interceptor.ts`), so a handler that returns one replaces the path its route declared, and one that returns none keeps it. Every route in `src/` takes the second branch: the path on the decorator is the path that is sent.

### @ResponsePaging

Paginated API response decorator with optional caching. Supports both offset-based and cursor-based pagination.

**Parameters:**
- `messagePath` (string): Path to response message for localization
- `options` (optional): Configuration options
  - `schema` (zod schema): The shape of ONE item of the page; the interceptor wraps the page around it
  - `cache` (boolean | object): Enable caching

**Requirements:**
- Handler returns `IResponsePagingReturn<T>`
- Pagination query decorator supplies the params (see [Pagination Documentation][ref-doc-pagination])
- `type` is `'offset'` or `'cursor'`

**Interceptor:** `ResponsePagingInterceptor` - validates pagination data, supports offset and cursor-based pagination, includes search/filter/sort metadata

**Offset-based Pagination:**

```typescript
@ResponsePaging('user.list', { schema: UserListResponseSchema })
@Get('/list')
async list(
  @PaginationOffsetQuery({
    availableSearch: UserDefaultAvailableSearch,
    availableOrderBy: UserDefaultAvailableOrderBy,
  })
  pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
): Promise<IResponsePagingReturn<IUserListRow>> {
  return this.userHttpService.getListOffsetByAdmin(pagination);
}
```

`UserHttpService.getListOffsetByAdmin` forwards to the domain and repository. The page fields (`type`, `count`, `page`, `perPage`, `totalPage`, `hasNext`, `hasPrevious`, `nextPage`, `previousPage`) come from `PaginationService.offset`, which computes them in `offsetPage`: `page` is 1-based, so the first page reports `1`, and `totalPage` is `Math.ceil(count / perPage)`, so a page with no rows reports `0`.

The handler's generic is the ROW type the repository returns, and the schema on the decorator is what shapes that row on the way out. `IUserListRow` is `Prisma.UserGetPayload<{ select: typeof UserListSelect }>`, the projection the read asked for (see [Pagination Documentation][ref-doc-pagination]).

**Cursor-based Pagination:**

```typescript
@ResponsePaging('workspace.list', { schema: WorkspaceResponseSchema })
@Get('/list')
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

The page fields (`type`, `cursor` emitted as `nextCursor`, `perPage`, `hasNext`, optional `count`) come from `PaginationService.cursor`.

### @ResponseFile

File download response decorator that handles CSV and PDF file downloads with proper headers and streaming.

**Parameters:** None

**Requirements:**
- Handler returns `IResponseFileReturn` (`IResponseCsvReturn` | `IResponsePdfReturn`)
- `extension` is `EnumFileExtensionDocument.csv` or `EnumFileExtensionDocument.pdf`
- CSV data is a string (already converted)
- PDF data is a Buffer
- Optional `filename` - if not provided, the interceptor fills the `response.filenameExportPattern` config (`export-{timestamp}.{extension}`) through `HelperStringService.fillPattern`, with the request timestamp and the literal `csv`, so the generated fallback is always a `.csv` name. A PDF download carries an explicit `filename`

**Interceptor:** `ResponseFileInterceptor` - validates data based on extension type, converts to Buffer, rejects a buffer larger than `file.maxSizeExportInBytes` (2 MB) with `FileExceedMaxSizeExportException` (422, `50105`), sets content headers (Content-Type, Content-Disposition, Content-Length), returns StreamableFile

**CSV export:**

`POST /admin/user/export` is the file-download route. `UserImportHttpService.exportByAdmin` maps rows to `UserExportResponseDto` and returns a CSV string. The interceptor fills the filename from `response.filenameExportPattern` (`export-{timestamp}.csv`) because this handler omits `filename`.

```typescript
@ResponseFile()
@HttpCode(HttpStatus.OK)
@Post('/export')
async export(
  @PaginationQueryFilterInEnum<EnumUserStatus>('status', UserDefaultStatus)
  status?: Record<string, IPaginationIn>,
  @PaginationQueryFilterEqualString('roleId')
  roleId?: Record<string, IPaginationEqual>,
  @PaginationQueryFilterEqualString('countryId')
  countryId?: Record<string, IPaginationEqual>
): Promise<IResponseFileReturn> {
  return this.userImportHttpService.exportByAdmin(status, roleId, countryId);
}
```

`IResponsePdfReturn` is the other half of `IResponseFileReturn`: a `Buffer`, `EnumFileExtensionDocument.pdf`, and an explicit `filename`. The interceptor accepts that shape. CSV is the download this checkout serves.

## Serialization

A route declares its payload shape on the decorator, and the interceptor validates the handler's payload against that schema before the envelope is sent. Every response schema in `src/` is a `z.object` at the top level, so a key the schema does not declare is stripped: a column added to the Prisma model stays out of the response until someone declares it. The constraint when writing one: `rules/dto.md`.

A route whose payload is a list of rows over a fixed enum declares that list as a named array field of an object, and `@Response` carries the object schema. `GET /admin/analytic/workspaces/invite-funnel` sends `{ "statuses": [ { "status": …, "count": … } ] }` and `GET /user/analytic/workspace/member-roles` sends `{ "roles": [ … ] }`.

Serialization is **fail-closed** in both directions. A payload that the schema rejects raises `ResponseSerializationException`, and so does a handler that returns data on a route which declared no schema.

> The inbound half is the mirror image: a request schema is `z.strictObject`, so an unknown key is rejected rather than dropped. See [Request Validation Documentation][ref-doc-request-validation].

### Declaring the Schema

`@Response` takes the schema of the whole payload; `@ResponsePaging` takes the schema of one item and wraps the page around it.

```typescript
@Response('user.profile', { schema: UserProfileResponseSchema })
@Get('/profile/get')
async profile(
  @AuthJwtPayload('userId') userId: string
): Promise<IResponseReturn<IUserProfile>> {
  return this.userProfileHttpService.getProfile(userId);
}

@ResponsePaging('device.list', { schema: DeviceOwnershipResponseSchema })
@Get('/list')
async list(
  @PaginationCursorQuery({ availableOrderBy: DeviceCursorAvailableOrderBy })
  pagination: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>,
  @AuthJwtPayload('userId') userId: string,
  @AuthJwtPayload('sessionId') sessionId: string
): Promise<IResponsePagingReturn<IDeviceOwnershipDetail>> {
  return this.deviceHttpService.getListCursor(userId, sessionId, pagination);
}
```

A schema file exports the schema constant and the type inferred from it, and composes from a base rather than restating fields:

```typescript
export const DeviceOwnershipResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    deviceId: z.string().meta({
        description: 'Device ownership ID',
        example: faker.string.uuid(),
    }),
    userId: z.string().meta({
        description: 'User ID who owns the device',
        example: faker.string.uuid(),
    }),
    /* the nested device, owner, and revocation fields follow */
});

export type DeviceOwnershipResponseDto = z.infer<
    typeof DeviceOwnershipResponseSchema
>;
```

The `.meta({ description, example })` on each field is what the OpenAPI document is generated from. See [Doc Documentation][ref-doc-doc].

### A Route That Returns No Data

`@Response(messagePath)` with no `schema` declares a route whose body carries `statusCode`, `message`, and `metadata` and nothing else. The handler may return `Promise<void>`, or `IResponseReturn<void>` when the service already returns the envelope (for example to pass `metadata` overrides). Constraint: `rules/http.md`.

```typescript
@Response('role.delete')
@Delete('/delete/:roleId')
async delete(
  @Param('role', { schema: RequestUuidSchema }) role: string
): Promise<void> {
  await this.roleHttpService.delete(role);
}
```

### Nested Schemas

A nested object is a named schema referenced from the parent, which keeps one definition per shape and lets the OpenAPI document reuse it:

```typescript
device: DeviceResponseSchema.meta({
    description: 'Device information',
    example: { /* ... */ },
}),
revokedBy: UserRefResponseSchema.nullable().meta({
    description: 'User who revoked the device ownership',
    example: { /* ... */ },
}),
```

Stripping propagates: the nested schema strips its own undeclared keys the same way the parent does.

### Hiding Fields

A field is hidden by leaving it out of the schema; there is no separate exclusion decorator. A shape that shows a field only on one route builds that route's schema from the shared one:

```typescript
// The base api-key shape carries no secret. Creation and reset are the two routes that return
// it, and they declare it by extending the base.
export const ApiKeyCreateResponseSchema = ApiKeyResponseSchema.extend({
    secret: z.string().meta({
        description: 'Secret key of ApiKey, only show at once',
        example: faker.string.alphanumeric(20),
    }),
});
```

To drop a field a base declares, derive with `.omit()`:

```typescript
export const DeviceOwnershipResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({ /* ... */ });
```

### Serialization Flow

```text
Service returns entity / interface (raw)
    ↓
Controller returns { data } / { data: [] } as IResponseReturn / IResponsePagingReturn
    ↓
ResponseInterceptor reads the schema off ResponseSchemaMetaKey
    ↓
schema['~standard'].validate(payload): undeclared keys stripped, a rejection raises
ResponseSerializationException
    ↓
Envelope assembled: statusCode, localized message, metadata, data
    ↓
ResponseMetadataService.setHeaders mirrors the metadata onto response headers
```

Metadata and headers are built by the shared `ResponseMetadataService` (`src/common/response/services/response.metadata.service.ts`): `create()` returns a `ResponseMetadataDto` from the request store, `setHeaders(response, metadata)` mirrors it to response headers. The three response interceptors and the five app filters call it instead of building metadata inline.

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
    orderBy: string[];   // `field:direction` entries, e.g. ['createdAt:desc']
    availableSearch: string[];
    availableOrderBy: string[];
    
    // Offset-specific fields (when type = 'offset')
    page?: number;
    totalPage?: number;
    nextPage?: number;
    previousPage?: number;
    
    // Cursor-specific fields (when type = 'cursor')
    nextCursor?: string;
    previousCursor?: string;   // declared on the DTO, never populated
  };
  data: T[];
}
```

`metadata.orderBy` is a string array, symmetric with `availableOrderBy` beside it. `ResponsePagingInterceptor` flattens the service-level `IPaginationOrderBy[]` (`[{ createdAt: 'desc' }]`) into `field:direction` entries (`['createdAt:desc']`), which is also the format the `orderBy` query parameter accepts. An empty order renders `[]`.

Cursor pagination is forward-only. `ResponsePagingInterceptor` assigns `nextCursor` from the service's `cursor` field and leaves `previousCursor` unassigned, so that key is always `undefined` and is dropped from the JSON body. `hasPrevious` is only assigned on the offset branch, so it stays `false` for every cursor response. Neither field carries the information a "previous page" control would need.

## Caching

`@Response` and `@ResponsePaging` support optional caching via `ResponseCacheInterceptor` (extends NestJS CacheInterceptor with custom prefixes).

**Basic Caching:**

```typescript
@Response('hello.hello', {
  cache: true,
  schema: HelloResponseSchema,
})
@Get('/')
async hello(): Promise<IResponseReturn<HelloResponseDto>> {
  return this.helloHttpService.hello();
}
```

**Cache Key:**

```text
Apis:{key}
```

**Custom Cache Configuration:**

`cache` also accepts `{ key, ttl }`. `key` becomes `CacheKey`; `ttl` is milliseconds and becomes `CacheTTL`. `GET /public/hello` passes `cache: true`, so the interceptor default key from `response.keyPattern` (`Apis:{key}`) applies and TTL comes from `redis.cache.ttlInMs`.

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
