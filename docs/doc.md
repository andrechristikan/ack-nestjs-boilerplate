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
  - `x-custom-lang` - **Customizable by frontend** - Custom language header (default: EN)
  - `x-correlation-id` - **Customizable by frontend** - Correlation identifier for tracking requests across services
  - `x-timestamp` - Auto-included - Timestamp in milliseconds
  - `x-timezone` - Auto-included - Timezone (e.g., Asia/Jakarta)
  - `x-version` - Auto-included - API version
  - `x-repo-version` - Auto-included - Repository version
  - `x-request-id` - Auto-included - Unique request identifier (UUID)
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
  - `dto?: ClassConstructor<T>` - Request DTO class

**Body Types:**

```typescript
enum EnumDocRequestBodyType {
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
    bodyType: EnumDocRequestBodyType.JSON,
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
  - `type?: EnumPaginationType` - Pagination type: `offset` or `cursor` (default: `offset`)
  - `statusCode?: number` - Custom status code
  - `httpStatus?: HttpStatus` - HTTP status
  - `availableSearch?: string[]` - Searchable fields
  - `availableOrder?: string[]` - Sortable fields

**Auto-includes:**

- Standard pagination query parameters (depends on type):
    - **Offset type (default)**:
        - `perPage` - Data per page (max: 100)
        - `page` - Page number (max: 20)
    - **Cursor type**:
        - `perPage` - Data per page (max: 100)
        - `cursor` - The pagination cursor returned from the previous request
- Optional search query when `availableSearch` provided
- Optional ordering queries when `availableOrder` provided:
    - `orderBy` - Field to order by
    - `orderDirection` - ASC or DESC

**Usage:**

```typescript
// Offset pagination (default)
@DocResponsePaging<UserListResponseDto>('user.list', {
    dto: UserListResponseDto,
    availableSearch: ['name', 'email'],
    availableOrder: ['createdAt', 'name']
})
@Get('/list')
async getUsers() {
    // implementation
}

// Cursor pagination
@DocResponsePaging<UserListResponseDto>('user.list', {
    dto: UserListResponseDto,
    type: EnumPaginationType.CURSOR,
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
  - `extension?: EnumFileExtension` - File extension (default: CSV)

**Usage:**

```typescript
@DocResponseFile({
    extension: EnumFileExtension.XLSX
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
        statusCode: EnumUserStatus_CODE_ERROR.emailExist,
        messagePath: 'user.error.emailExist',
    },
    {
        statusCode: EnumUserStatus_CODE_ERROR.usernameExist,
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

## Swagger JSON

The ACK NestJS Boilerplate automatically generates the OpenAPI Swagger JSON documentation for your API. This file describes all endpoints, schemas, and metadata for integration, testing, or external documentation tools.

### How to Get swagger.json

There are two ways to obtain the Swagger JSON file:

1. **Via URL (API Docs Endpoint):**
    - After starting the server, access: `/docs/json`
    - Example: `http://localhost:3000/docs/json`
    - This endpoint always serves the latest Swagger spec for the running app.

2. **Via Generated File:**
    - The file is auto-generated at: `generated/swagger.json`
    - This file is written every time the app starts.
    - You can use this file for CI/CD, external tools, or static documentation.

Both methods provide the same OpenAPI spec. Use whichever fits your workflow (dynamic via URL or static via file).

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
            bodyType: EnumDocRequestBodyType.JSON,
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
[ref-doc-two-factor]: two-factor.md

<!-- CONTRIBUTOR -->

[ref-contributor-gzerox]: https://github.com/Gzerox
[ref-contributor-ak2g]: https://github.com/ak2g
