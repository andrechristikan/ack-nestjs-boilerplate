# Doc Documentation

This documentation explains the features and usage of **Doc Module**: Located at `src/common/doc`

## Overview

This module provides decorators for API documentation using [Swagger/OpenAPI][ref-nestjs-swagger]. It creates standardized, consistent API documentation with minimal boilerplate code.

Features:
- Standardized API documentation structure
- Automatic error response documentation
- Built-in pagination support
- File upload/download documentation
- Multiple authentication method support
- Request validation documentation
- Custom language header support

## Related Documents

- [Request Validation Documentation][ref-doc-request-validation] - For the request schemas the OpenAPI document is generated from
- [Response Documentation][ref-doc-response] - For response structure and formatting
- [Authentication Documentation][ref-doc-authentication] - For authentication decorator usage
- [Authorization Documentation][ref-doc-authorization] - For authorization guard documentation

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Decorators](#decorators)
  - [Doc](#doc)
  - [DocRequest](#docrequest)
  - [DocRequestFile](#docrequestfile)
  - [DocResponse](#docresponse)
  - [DocResponsePaging](#docresponsepaging)
  - [DocResponseFile](#docresponsefile)
  - [DocAuth](#docauth)
  - [DocGuard](#docguard)
- [Advanced Decorators](#advanced-decorators)
  - [DocDefault](#docdefault)
  - [DocOneOf](#doconeof)
  - [DocAnyOf](#docanyof)
  - [DocAllOf](#docallof)
- [Schema Documentation](#schema-documentation)
  - [.meta()](#meta)
- [Usage](#usage)
  - [Complete Admin Endpoint](#complete-admin-endpoint)
  - [Complete Public Endpoint](#complete-public-endpoint)
  - [Paginated List Endpoint](#paginated-list-endpoint)
  - [File Upload Endpoint](#file-upload-endpoint)


## Decorators

### Doc

Basic API documentation decorator that sets up common operation metadata.

**Parameters:**

- `options?: IDocOptions`
  - `summary?: string` - Operation summary
  - `operation?: string` - Operation ID
  - `deprecated?: boolean` - Mark as deprecated
  - `description?: string` - Detailed description

**Auto-includes:**

- Custom headers:
  - `x-custom-lang` - **Customizable by frontend** - Custom language header (default: EN)
  - `x-correlation-id` - **Customizable by frontend** - Correlation identifier for tracking requests across services
- Standard error responses:
  - Internal server error (500)
  - Request timeout (408)
  - Validation error (422)
  - Environment forbidden error
  - Parameter required error

**Usage:**

```typescript
@Doc({
    summary: 'Get user profile',
    operation: 'getUserProfile',
    description: 'Retrieve authenticated user profile information'
})
@Get('/profile')
async getProfile() {
    // implementation
}
```

### DocRequest

Documents request specifications including body, parameters, and queries.

**Parameters:**

- `options?: IDocRequestOptions`
  - `params?: ApiParamOptions[]` - URL parameters
  - `queries?: ApiQueryOptions[]` - Query parameters
  - `bodyType?: EnumDocRequestBodyType` - Request body content type

**Body Types:**

```typescript
enum EnumDocRequestBodyType {
    json = 'json',
    formData = 'formData',
    formUrlencoded = 'formUrlencoded',
    text = 'text',
    none = 'none',
}
```

**Auto-includes:**

- Content-Type (`ApiConsumes`) derived from `bodyType`; when `bodyType` is `none` or omitted, no Content-Type is emitted

**Usage:**

```typescript
@DocRequest({
    params: [
        {
            name: 'id',
            required: true,
            type: 'string'
        }
    ],
    queries: [
        {
            name: 'include',
            required: false,
            type: 'string'
        }
    ],
    bodyType: EnumDocRequestBodyType.json
})
@Put('/:id')
async updateUser() {
    // implementation
}
```

### DocRequestFile

Documents file upload endpoints with multipart/form-data.

**Parameters:**

- `options?: IDocRequestFileOptions` - `params` and `queries` as on `DocRequest`, plus `schema?: z.ZodType<T>` for the multipart body; no `bodyType`

**Auto-includes:**

- Content-Type: multipart/form-data
- File-related error responses:
  - File extension invalid error
  - File required error
  - File required extract first error

**Usage:**

```typescript
@DocRequestFile({
    params: [
        {
            name: 'id',
            required: true,
            type: 'string'
        }
    ],
    schema: FileUploadSingleRequestSchema
})
@Post('/upload')
async uploadFile() {
    // implementation
}
```

### DocResponse

Documents standard response with message and optional data.

**Parameters:**

- `messagePath: string` - i18n message path
- `options?: IDocResponseOptions<T>`
  - `statusCode?: number` - Custom status code
  - `httpStatus?: HttpStatus` - HTTP status (default: 200)
  - `schema?: z.ZodType<T>` - The zod schema the `data` field is documented from

**Auto-includes:**

- Content-Type: application/json
- Standard response schema with message, statusCode, and data

**Usage:**

```typescript
@DocResponse<UserProfileResponseDto>('user.get', {
    schema: UserProfileResponseSchema
})
@Get('/:id')
async getUser() {
    // implementation
}

@DocResponse('user.delete', {
    httpStatus: HttpStatus.NO_CONTENT
})
@Delete('/:id')
async deleteUser() {
    // implementation
}
```

### DocResponsePaging

Documents paginated response with automatic pagination parameters.

**Parameters:**

- `messagePath: string` - i18n message path
- `options: IDocResponsePagingOptions<T>`
  - `schema: z.ZodType<T>` - The zod schema of ONE item of the page (required)
  - `type: EnumPaginationType` - Pagination type: `offset` or `cursor` (required, no default)
  - `statusCode?: number` - Custom status code
  - `httpStatus?: HttpStatus` - HTTP status
  - `availableSearch?: string[]` - Searchable fields
  - `availableOrderBy?: string[]` - Sortable fields

**Auto-includes:**

- Standard pagination query parameters (depends on type):
    - **Offset type**:
        - `perPage` - Data per page (max: 100)
        - `page` - Page number (max: 20)
    - **Cursor type**:
        - `perPage` - Data per page (max: 100)
        - `cursor` - The pagination cursor returned from the previous request
- Optional search query when `availableSearch` provided
- Optional ordering query when `availableOrderBy` provided:
    - `orderBy` - Field and direction in `field:direction` format (e.g., `name:asc`, `createdAt:desc`). Repeat to sort by multiple fields.
- Shared error responses (422) for both types:
    - `orderByNotAllowed` (50200), `orderDirectionNotAllowed` (50215), `filterInvalidValue` (50201)
    - `invalidPerPage`, `perPageExceedsMaximum`, `perPageCannotBeLessThanOne`
- Type-specific error responses (422):
    - **Offset**: `invalidOffsetPaginationParams`, `invalidPage`, `pageExceedsMaximum`, `pageCannotBeLessThanOne`
    - **Cursor**: `invalidCursorPaginationParams`, `cursorTooLong`, `invalidCursorFormat`, `invalidCursorData`, `failedToEncodeCursor`, `failedToDecodeCursor`, `paginationConditionsChanged`

**Usage:**

`availableSearch` and `availableOrderBy` are never literal arrays here. Each takes the same `<module>.list.constant.ts` constant the controller passes to `@PaginationOffsetQuery` / `@PaginationCursorQuery`, so the documented allow-list and the enforced allow-list cannot diverge. The doc decorator and the query decorator use the identical option name for the identical constant.

```typescript
// Offset pagination
@DocResponsePaging<UserListResponseDto>('user.list', {
    schema: UserListResponseSchema,
    availableSearch: UserDefaultAvailableSearch,
    availableOrderBy: UserDefaultAvailableOrderBy,
    type: EnumPaginationType.offset,
})
@Get('/list')
async getUsers() {
    // implementation
}

// Cursor pagination
@DocResponsePaging<SessionResponseDto>('session.list', {
    schema: SessionResponseSchema,
    type: EnumPaginationType.cursor,
    availableOrderBy: SessionCursorAvailableOrderBy,
})
@Get('/list')
async getSessions() {
    // implementation
}
```

A cursor route that allows no searchable field simply omits `availableSearch`, and the `search` query parameter is then absent from its Swagger entry.

### DocResponseFile

Documents file download/response endpoints.

**Parameters:**

- `options?: IDocResponseFileOptions`
  - `httpStatus?: HttpStatus` - HTTP status (default: 200)
  - `extension?: EnumFileExtensionDocument` - File extension (default: CSV)

**Usage:**

```typescript
@DocResponseFile({
    extension: EnumFileExtensionDocument.pdf
})
@Get('/export')
async exportData() {
    // implementation
}
```

### DocAuth

Documents authentication requirements and error responses.

**Parameters:**

- `options?: IDocAuthOptions`
  - `jwtAccessToken?: boolean` - Require access token
  - `jwtRefreshToken?: boolean` - Require refresh token
  - `xApiKey?: boolean` - Require API key
  - `google?: boolean` - Require Google OAuth
  - `apple?: boolean` - Require Apple OAuth

**Auto-includes:**

- Bearer auth or security scheme based on options
- Unauthorized error responses (401) for each auth method

**Usage:**

```typescript
@DocAuth({
    jwtAccessToken: true,
    xApiKey: true
})
@Get('/protected')
async protectedRoute() {
    // implementation
}

@DocAuth({
    google: true,
    xApiKey: true
})
@Post('/auth/google')
async googleLogin() {
    // implementation
}
```

### DocGuard

Documents authorization guards and forbidden responses.

**Parameters:**

- `options?: IDocGuardOptions`
    - `role?: boolean` - Role-based guard
    - `policy?: boolean` - Policy-based guard
    - `termPolicy?: boolean` - Term policy acceptance guard

**Auto-includes:**

- Forbidden error responses (403) based on guard types:
    - If `role` is true, documents forbidden response for role-based access control.
    - If `policy` is true, documents forbidden response for policy-based access control.
    - If `termPolicy` is true, documents forbidden response for term policy acceptance.

**Usage:**

```typescript
@DocGuard({
        role: true,
        policy: true,
        termPolicy: true
})
@Post('/admin/users')
async createUser() {
    // implementation
}
```

## Advanced Decorators

### DocDefault

Creates standard response schema with message, statusCode, and optional data.

**Parameters:**

- `options: IDocDefaultOptions<T>`
  - `httpStatus: HttpStatus` - HTTP status (required)
  - `messagePath: string` - i18n message path (required)
  - `statusCode: number` - Custom status code (required)
  - `schema?: z.ZodType<T>` - The zod schema the `data` field is documented from

**Usage:**

```typescript
@DocDefault({
    httpStatus: HttpStatus.CREATED,
    messagePath: 'resource.created',
    statusCode: HttpStatus.CREATED,
    schema: DatabaseIdResponseSchema
})
@Post('/resource')
async createResource() {
    // implementation
}
```

### DocOneOf

Documents endpoint that returns **one of** several possible response types using OpenAPI's `oneOf`. Useful for documenting endpoints that can return different error types with the same HTTP status.

**Parameters:**

- `httpStatus: HttpStatus` - HTTP status code
- `...documents: IDocOfOptions[]` - One or more possible response schemas
  - `statusCode: number` - Status code
  - `messagePath: string` - Message path for i18n
  - `schema?: z.ZodType<T>` - Optional zod schema for the `data` field

**Basic Usage:**

```typescript
DocOneOf(
    HttpStatus.BAD_REQUEST,
    {
        statusCode: EnumUserStatusCodeError.emailExist,
        messagePath: 'user.error.emailExist',
    },
    {
        statusCode: EnumUserStatusCodeError.usernameExist,
        messagePath: 'user.error.usernameExist',
    }
)
```

**Detailed Examples:**

For complete examples of `DocOneOf` usage in combination with other decorators, see:
- [ApiKey Admin Documentation](../src/modules/api-key/docs/api-key.admin.doc.ts)

### DocAnyOf

Documents endpoint that can match **any combination** of provided schemas using OpenAPI's `anyOf`. Useful when response can satisfy one or more schemas simultaneously.

**Parameters:**

- `httpStatus: HttpStatus` - HTTP status code
- `...documents: IDocOfOptions[]` - Possible response schemas
  - `statusCode: number` - Status code
  - `messagePath: string` - Message path for i18n
  - `schema?: z.ZodType<T>` - Optional zod schema for the `data` field

**Basic Usage:**

```typescript
DocAnyOf(
    HttpStatus.OK,
    {
        statusCode: HttpStatus.OK,
        messagePath: 'user.partial',
        schema: UserPartialSchema,
    },
    {
        statusCode: HttpStatus.OK,
        messagePath: 'user.full',
        schema: UserFullSchema,
    }
)
```

### DocAllOf

Documents endpoint that must satisfy **all** provided schema definitions using OpenAPI's `allOf`. Useful for documenting responses that combine multiple schemas.

**Parameters:**

- `httpStatus: HttpStatus` - HTTP status code
- `...documents: IDocOfOptions[]` - Required response schemas (all must be satisfied)
  - `statusCode: number` - Status code
  - `messagePath: string` - Message path for i18n
  - `schema?: z.ZodType<T>` - Optional zod schema for the `data` field

**Basic Usage:**

```typescript
DocAllOf(
    HttpStatus.OK,
    {
        statusCode: HttpStatus.OK,
        messagePath: 'user.base',
        schema: UserBaseSchema,
    },
    {
        statusCode: HttpStatus.OK,
        messagePath: 'user.extended',
        schema: UserExtendedSchema,
    }
)
```

## Swagger JSON

The ACK NestJS Boilerplate automatically generates the OpenAPI Swagger JSON documentation for your API. This file describes all endpoints, schemas, and metadata for integration, testing, or external documentation tools.

The Swagger document is built only when `app.env` is not `production`. In a production environment neither the `/docs` UI, the JSON endpoint, nor `generated/swagger.json` is produced.

### How to Get swagger.json

There are two ways to obtain the Swagger JSON file, both available outside production only:

1. **Via URL (API Docs Endpoint):**
    - After starting the server, access: `/docs/json`
    - Example: `http://localhost:3000/docs/json`
    - This endpoint serves the latest Swagger spec for the running app.

2. **Via Generated File:**
    - The file is auto-generated at: `generated/swagger.json`
    - This file is written every time the app starts in a non-production environment.
    - You can use this file for CI/CD, external tools, or static documentation.

Both methods provide the same OpenAPI spec. Use whichever fits your workflow (dynamic via URL or static via file).

## Schema Documentation

A DTO here is a zod schema plus the type inferred from it, and the OpenAPI schema object is produced from that same schema by [zod-openapi][ref-zod-openapi]. There is no separate annotation layer: the doc decorators call `createSchema(schema)` and hand the result to `@nestjs/swagger`.

### .meta()

Per-field OpenAPI metadata lives in `.meta()` on the field.

**Common keys:**
- `description?: string` - Property description
- `example?: unknown` - Example value
- `deprecated?: boolean` - Mark the property deprecated

Everything else the OpenAPI schema carries comes from the zod type itself: `.min()` / `.max()` become `minLength` / `maxLength` or `minimum` / `maximum`, `.regex()` becomes `pattern`, `z.enum()` becomes `enum`, `.optional()` keeps the field out of `required`, `.nullable()` sets the nullable type, and `.default()` becomes `default`.

**Usage:**

```typescript
export const UserChangePasswordRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.omit({ challengeToken: true })
        .partial()
        .extend({
            newPassword: z
                .string()
                .min(8)
                .max(50)
                .regex(RequestPasswordStrengthRegex, {
                    error: () => 'request.error.isPassword.strong',
                })
                .meta({
                    description:
                        "new string password, newPassword can't same with oldPassword",
                    example: 'aBcDe@Fgh!123',
                }),
            oldPassword: z.string().min(1).meta({
                description: 'old string password',
                example: 'xYzAb@Cde!456',
            }),
        });

export type UserChangePasswordRequestDto = z.infer<
    typeof UserChangePasswordRequestSchema
>;
```

**With Composition:**

A derived schema inherits the `.meta()` of every field it keeps, so only the new field needs annotating:

```typescript
export const UserForgotPasswordResetRequestSchema =
    UserChangePasswordRequestSchema.pick({ newPassword: true })
        .extend(
            UserLoginVerifyTwoFactorRequestSchema.omit({
                challengeToken: true,
            }).partial().shape
        )
        .extend({
            token: z.string().min(1).meta({
                description: 'Forgot password token',
                example: faker.string.alphanumeric(20),
            }),
        });

export type UserForgotPasswordResetRequestDto = z.infer<
    typeof UserForgotPasswordResetRequestSchema
>;
```

## Usage

### Complete Admin Endpoint

```typescript
export function UserAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail an user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<UserProfileResponseDto>('user.get', {
            schema: UserProfileResponseSchema,
        })
    );
}

@UserAdminGetDoc()
@Get('/get/:userId')
async getUser(@Param('userId') userId: string) {
    // implementation
}
```

### Complete Public Endpoint

```typescript
export function UserPublicSignUpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User sign up',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('user.signUp', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}

@UserPublicSignUpDoc()
@Post('/sign-up')
async signUp(
    @Body({ schema: UserSignUpRequestSchema }) body: UserSignUpRequestDto
) {
    // implementation
}
```

### Paginated List Endpoint

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
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<UserListResponseDto>('user.list', {
            schema: UserListResponseSchema,
            availableSearch: UserDefaultAvailableSearch,
            availableOrderBy: UserDefaultAvailableOrderBy,
            type: EnumPaginationType.offset,
        })
    );
}

@UserAdminListDoc()
@Get('/list')
async list(
    @PaginationOffsetQuery({
        availableSearch: UserDefaultAvailableSearch,
        availableOrderBy: UserDefaultAvailableOrderBy,
    })
    pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
) {
    // implementation
}
```

The doc factory and the controller import the same two constants from `@modules/user/constants/user.list.constant`. The doc factory never restates the allow-list as a literal.

### File Upload Endpoint

```typescript
export function UserSharedUploadPhotoProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'upload photo profile',
        }),
        DocGuard({ termPolicy: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequestFile({
            schema: FileUploadSingleRequestSchema,
        }),
        DocResponse('user.uploadPhotoProfile')
    );
}

@UserSharedUploadPhotoProfileDoc()
@FileUploadSingle()
@Post('/profile/photo/upload')
async uploadPhotoProfile(
    @UploadedFile(
        RequestRequiredPipe,
        FileExtensionPipe([
            EnumFileExtensionImage.jpeg,
            EnumFileExtensionImage.png,
            EnumFileExtensionImage.jpg,
        ])
    )
    file: IFile
) {
    // implementation
}
```

For more information about NestJS Swagger integration, see the [official NestJS documentation][ref-nestjs-swagger].


<!-- REFERENCES -->

[ref-nestjs-swagger]: https://docs.nestjs.com/openapi/introduction
[ref-zod-openapi]: https://github.com/samchungy/zod-openapi

[ref-doc-request-validation]: request-validation.md
[ref-doc-response]: response.md
[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
