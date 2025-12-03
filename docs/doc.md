# Doc Documentation

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

- [Request Validation][ref-doc-request-validation] - For DTO validation and request documentation
- [Response][ref-doc-response] - For response structure and formatting
- [Authentication][ref-doc-authentication] - For authentication decorator usage
- [Authorization][ref-doc-authorization] - For authorization guard documentation

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Core Decorators](#core-decorators)
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
  - [DocErrorGroup](#docerrorgroup)
- [DTO Documentation](#dto-documentation)
  - [ApiProperty](#apiproperty)
  - [Params Constants](#params-constants)
  - [Queries Constants](#queries-constants)
- [Constants](#constants)
- [Usage Examples](#usage-examples)
  - [Complete Admin Endpoint](#complete-admin-endpoint)
  - [Complete Public Endpoint](#complete-public-endpoint)
  - [Paginated List Endpoint](#paginated-list-endpoint)
  - [File Upload Endpoint](#file-upload-endpoint)


## Core Decorators

### Doc

Basic API documentation decorator that sets up common operation metadata.

**Parameters:**

- `options?: IDocOptions`
  - `summary?: string` - Operation summary
  - `operation?: string` - Operation ID
  - `deprecated?: boolean` - Mark as deprecated
  - `description?: string` - Detailed description

**Auto-includes:**

- Custom language header (`x-custom-lang`)
- Internal server error response (500)
- Request timeout response (408)

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

- Content-Type header based on bodyType
- Validation error response (422) when bodyType is specified

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

Documents endpoint that returns one of several possible response types.

**Parameters:**

- `httpStatus: HttpStatus` - HTTP status
- `...documents: IDocOfOptions[]` - Possible response schemas

**Usage:**

```typescript
@DocOneOf(
    HttpStatus.OK,
    {
        statusCode: HttpStatus.OK,
        messagePath: 'user.found',
        dto: UserDto
    },
    {
        statusCode: HttpStatus.NOT_FOUND,
        messagePath: 'user.notFound'
    }
)
@Get('/:id')
async getUser() {
    // implementation
}
```

### DocAnyOf

Documents endpoint that can match any combination of provided schemas.

**Parameters:**

- `httpStatus: HttpStatus` - HTTP status
- `...documents: IDocOfOptions[]` - Possible response schemas

**Usage:**

```typescript
@DocAnyOf(
    HttpStatus.OK,
    {
        statusCode: HttpStatus.OK,
        messagePath: 'data.partial',
        dto: PartialDataDto
    },
    {
        statusCode: HttpStatus.OK,
        messagePath: 'data.full',
        dto: FullDataDto
    }
)
@Get('/data')
async getData() {
    // implementation
}
```

### DocAllOf

Documents endpoint that must satisfy all provided schema definitions.

**Parameters:**

- `httpStatus: HttpStatus` - HTTP status
- `...documents: IDocOfOptions[]` - Required response schemas

**Usage:**

```typescript
@DocAllOf(
    HttpStatus.OK,
    {
        statusCode: HttpStatus.OK,
        messagePath: 'response.base',
        dto: BaseDto
    },
    {
        statusCode: HttpStatus.OK,
        messagePath: 'response.extended',
        dto: ExtendedDto
    }
)
@Get('/combined')
async getCombinedData() {
    // implementation
}
```

### DocErrorGroup

Groups multiple error documentation decorators.

**Parameters:**

- `docs: MethodDecorator[]` - Array of error decorators

**Usage:**

```typescript
const CommonErrors = DocErrorGroup([
    DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        messagePath: 'error.badRequest',
        statusCode: HttpStatus.BAD_REQUEST
    }),
    DocDefault({
        httpStatus: HttpStatus.NOT_FOUND,
        messagePath: 'error.notFound',
        statusCode: HttpStatus.NOT_FOUND
    })
]);

@CommonErrors
@Get('/:id')
async getResource() {
    // implementation
}
```

## DTO Documentation

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
        example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
            .alphanumeric(5)
            .toUpperCase()}@@!123`,
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
        example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
            .alphanumeric(5)
            .toUpperCase()}@@!123`,
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
        example: faker.string.alphanumeric(20),
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}
```

### Params Constants

Define reusable parameter documentation using `ApiParamOptions[]`.

**Structure:**

```typescript
const ParamName: ApiParamOptions[] = [
    {
        name: string;           // Parameter name (must match route param)
        allowEmptyValue: boolean;  // Allow empty value
        required: boolean;      // Mark as required
        type: string;          // Parameter type
        example?: any;         // Example value
        description?: string;  // Parameter description
    }
];
```

**Usage:**

```typescript
import { faker } from '@faker-js/faker';
import { ApiParamOptions } from '@nestjs/swagger';

export const UserDocParamsId: ApiParamOptions[] = [
    {
        name: 'userId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const UserDocParamsMobileNumberId: ApiParamOptions[] = [
    {
        name: 'mobileNumberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

// Use in decorator
@DocRequest({
    params: UserDocParamsId
})
@Get('/:userId')
async getUser() {
    // implementation
}
```

### Queries Constants

Define reusable query parameter documentation using `ApiQueryOptions[]`.

**Structure:**

```typescript
const QueryName: ApiQueryOptions[] = [
    {
        name: string;           // Query parameter name
        allowEmptyValue: boolean;  // Allow empty value
        required: boolean;      // Mark as required
        type: string;          // Parameter type
        example?: any;         // Example value
        description?: string;  // Parameter description
        enum?: any[];          // Enum values
    }
];
```

**Usage:**

```typescript
import { faker } from '@faker-js/faker';
import { ApiQueryOptions } from '@nestjs/swagger';
import { ENUM_USER_STATUS } from '@prisma/client';

export const UserDocQueryList: ApiQueryOptions[] = [
    {
        name: 'roleId',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.database.mongodbObjectId(),
        description: 'Filter by roleId',
    },
    {
        name: 'countryId',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_USER_STATUS).join(','),
        description: "value with ',' delimiter",
    },
];

// Use in decorator
@DocRequest({
    queries: UserDocQueryList
})
@Get('/list')
async listUsers() {
    // implementation
}
```

**Best Practices for Params/Queries:**

1. **Centralize definitions** - Keep all params/queries in a constants file
2. **Use faker for examples** - Generate realistic example values
3. **Add descriptions** - Explain special formats or constraints
4. **Specify types** - Always include the parameter type
5. **Enum documentation** - Show all possible values for enum fields

## Constants

### DOC_CONTENT_TYPE_MAPPING

Maps body types to content-type headers.

```typescript
{
    [ENUM_DOC_REQUEST_BODY_TYPE.FORM_DATA]: 'multipart/form-data',
    [ENUM_DOC_REQUEST_BODY_TYPE.TEXT]: 'text/plain',
    [ENUM_DOC_REQUEST_BODY_TYPE.JSON]: 'application/json',
    [ENUM_DOC_REQUEST_BODY_TYPE.FORM_URLENCODED]: 'x-www-form-urlencoded',
}
```

### DOC_STANDARD_ERROR_RESPONSES

Pre-configured standard error responses.

```typescript
{
    INTERNAL_SERVER_ERROR: DocDefault({
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'http.serverError.internalServerError',
        statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
    }),
    REQUEST_TIMEOUT: DocDefault({
        httpStatus: HttpStatus.REQUEST_TIMEOUT,
        messagePath: 'http.serverError.requestTimeout',
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.TIMEOUT,
    }),
    VALIDATION_ERROR: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
        messagePath: 'request.error.validation',
    }),
}
```

### DOC_PAGINATION_QUERIES

Standard pagination query parameters.

```typescript
[
    {
        name: 'perPage',
        required: false,
        allowEmptyValue: true,
        example: 20,
        type: 'number',
        description: 'Data per page, max 100',
    },
    {
        name: 'page',
        required: false,
        allowEmptyValue: true,
        example: 1,
        type: 'number',
        description: 'page number, max 20',
    },
]
```

## Usage Examples

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
