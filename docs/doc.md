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

- [Request Validation Documentation][ref-doc-request-validation] - For DTO validation and request documentation
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
- [DTO Documentation](#dto-documentation)
  - [ApiProperty](#apiproperty)
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
  - `x-custom-lang` - Custom language header (default: EN)
  - `x-timestamp` - Timestamp in milliseconds
  - `x-timezone` - Timezone (e.g., Asia/Jakarta)
  - `x-version` - API version
  - `x-repo-version` - Repository version
  - `x-request-id` - Unique request identifier (UUID)
  - `x-correlation-id` - Correlation identifier for tracking requests across services
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
  - `bodyType?: ENUM_DOC_REQUEST_BODY_TYPE` - Request body content type
  - `dto?: ClassConstructor<T>` - Request DTO class

**Body Types:**

```typescript
enum ENUM_DOC_REQUEST_BODY_TYPE {
    JSON = 'json',
    FORM_DATA = 'formData',
    FORM_URLENCODED = 'formUrlencoded',
    TEXT = 'text',
    NONE = 'none',
}
```

**Auto-includes:**

- Content-Type header based on bodyType (or 'none' if not specified)

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
    bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
    dto: UpdateUserDto
})
@Put('/:id')
async updateUser() {
    // implementation
}
```

### DocRequestFile

Documents file upload endpoints with multipart/form-data.

**Parameters:**

- `options?: IDocRequestFileOptions` - Same as `DocRequest` but excludes `bodyType`

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
    dto: UserUploadDto
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
  - `dto?: ClassConstructor<T>` - Response DTO class

**Auto-includes:**

- Content-Type: application/json
- Standard response schema with message, statusCode, and data

**Usage:**

```typescript
@DocResponse<UserProfileResponseDto>('user.get', {
    dto: UserProfileResponseDto
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
  - `dto: ClassConstructor<T>` - Response DTO class (required)
  - `statusCode?: number` - Custom status code
  - `httpStatus?: HttpStatus` - HTTP status
  - `availableSearch?: string[]` - Searchable fields
  - `availableOrder?: string[]` - Sortable fields

**Auto-includes:**

- Standard pagination query parameters:
  - `perPage` - Data per page (max: 100)
  - `page` - Page number (max: 20)
- Optional search query when `availableSearch` provided
- Optional ordering queries when `availableOrder` provided:
  - `orderBy` - Field to order by
  - `orderDirection` - ASC or DESC

**Usage:**

```typescript
@DocResponsePaging<UserListResponseDto>('user.list', {
    dto: UserListResponseDto,
    availableSearch: ['name', 'email'],
    availableOrder: ['createdAt', 'name']
})
@Get('/list')
async getUsers() {
    // implementation
}
```

### DocResponseFile

Documents file download/response endpoints.

**Parameters:**

- `options?: IDocResponseFileOptions`
  - `httpStatus?: HttpStatus` - HTTP status (default: 200)
  - `extension?: ENUM_FILE_EXTENSION` - File extension (default: CSV)

**Usage:**

```typescript
@DocResponseFile({
    extension: ENUM_FILE_EXTENSION.XLSX
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

**Auto-includes:**

- Forbidden error responses (403) based on guard types

**Usage:**

```typescript
@DocGuard({
    role: true,
    policy: true
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
  - `dto?: ClassConstructor<T>` - Response DTO class

**Usage:**

```typescript
@DocDefault({
    httpStatus: HttpStatus.CREATED,
    messagePath: 'resource.created',
    statusCode: HttpStatus.CREATED,
    dto: CreatedResourceDto
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
  - `dto?: ClassConstructor` - Optional DTO class

**Basic Usage:**

```typescript
DocOneOf(
    HttpStatus.BAD_REQUEST,
    {
        statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST,
        messagePath: 'user.error.emailExist',
    },
    {
        statusCode: ENUM_USER_STATUS_CODE_ERROR.USERNAME_EXIST,
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
  - `dto?: ClassConstructor` - Optional DTO class

**Basic Usage:**

```typescript
DocAnyOf(
    HttpStatus.OK,
    {
        statusCode: HttpStatus.OK,
        messagePath: 'user.partial',
        dto: UserPartialDto,
    },
    {
        statusCode: HttpStatus.OK,
        messagePath: 'user.full',
        dto: UserFullDto,
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
  - `dto?: ClassConstructor` - Optional DTO class

**Basic Usage:**

```typescript
DocAllOf(
    HttpStatus.OK,
    {
        statusCode: HttpStatus.OK,
        messagePath: 'user.base',
        dto: UserBaseDto,
    },
    {
        statusCode: HttpStatus.OK,
        messagePath: 'user.extended',
        dto: UserExtendedDto,
    }
)
```

## DTO Documentation

All decorators from `@nestjs/swagger` are fully supported in this module. This section provides an example using `@ApiProperty`, one of the most commonly used decorators for DTO documentation.

### ApiProperty

The `@ApiProperty` decorator from `@nestjs/swagger` documents DTO properties. It supports all standard Swagger/OpenAPI property options.

**Parameters:**

For complete options reference, see [NestJS Swagger Types documentation][ref-nestjs-swagger-types].

Common options:
- `description?: string` - Property description
- `example?: any` - Example value
- `required?: boolean` - Mark as required
- `type?: Type | string` - Property type
- `enum?: any[]` - Enum values
- `minimum?: number` - Minimum value
- `maximum?: number` - Maximum value
- `minLength?: number` - Minimum string length
- `maxLength?: number` - Maximum string length
- `pattern?: string` - Regex pattern
- `default?: any` - Default value
- `nullable?: boolean` - Allow null
- `readOnly?: boolean` - Read-only property
- `writeOnly?: boolean` - Write-only property

**Usage:**

```typescript
export class UserChangePasswordRequestDto {
    @ApiProperty({
        description: "new string password, newPassword can't same with oldPassword",
        example: 'aBcDe@Fgh!123',
        required: true,
        minLength: 8,
        maxLength: 50,
    })
    @IsNotEmpty()
    @IsString()
    @IsPassword()
    @MinLength(8)
    @MaxLength(50)
    newPassword: string;

    @ApiProperty({
        description: 'old string password',
        example: 'xYzAb@Cde!456',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    oldPassword: string;
}
```

**With Inheritance:**

```typescript
export class UserForgotPasswordResetRequestDto extends PickType(
    UserChangePasswordRequestDto,
    ['newPassword'] as const
) {
    @ApiProperty({
        required: true,
        description: 'Forgot password token',
        example: 'AbCdEfGhIjKlMnOpQrSt',
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}
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
        DocGuard({ role: true, policy: true }),
        DocResponse<UserProfileResponseDto>('user.get', {
            dto: UserProfileResponseDto,
        })
    );
}

@UserAdminGetDoc()
@Get('/:id')
async getUser(@Param('id') id: string) {
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
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserSignUpRequestDto,
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
async signUp(@Body() dto: UserSignUpRequestDto) {
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
async listUsers(@Query() query: PaginationQuery) {
    // implementation
}
```

### File Upload Endpoint

```typescript
export function UserUploadAvatarDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Upload user avatar',
        }),
        DocRequestFile({
            dto: FileUploadDto,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('user.uploadAvatar')
    );
}

@UserUploadAvatarDoc()
@Post('/avatar')
async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    // implementation
}
```

For more information about NestJS Swagger integration, see the [official NestJS documentation][ref-nestjs-swagger].

<!-- REFERENCES -->

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
[ref-nestjs-swagger]: https://docs.nestjs.com/openapi/introduction
[ref-nestjs-swagger-types]: https://docs.nestjs.com/openapi/types-and-parameters
[ref-nestjs-http-status]: https://docs.nestjs.com/controllers#status-code
