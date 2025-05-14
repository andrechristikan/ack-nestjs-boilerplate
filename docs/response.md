# Overview

The Response in ACK NestJS Boilerplate provides a standardized way to structure API responses throughout the application. It ensures that all responses follow a consistent format, which improves API usability and makes integration easier for frontend developers.

This documentation explains the features and usage of:
- **Response Module**: Located at `src/common/response`

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Key Features](#key-features)
  - [Components](#components)
    - [Response DTOs](#response-dtos)
    - [Response Interfaces](#response-interfaces)
    - [Decorators](#decorators)
    - [Interceptors](#interceptors)
  - [Response Types](#response-types)
    - [Standard Response](#standard-response)
    - [Pagination Response](#pagination-response)
    - [File Response](#file-response)
  - [Usage Examples](#usage-examples)
    - [Standard Response Example](#standard-response-example)
    - [Pagination Response Example](#pagination-response-example)
    - [File Response Example](#file-response-example)
    - [Response Caching Example](#response-caching-example)
      - [Basic Caching](#basic-caching)
  - [Custom Response Properties](#custom-response-properties)

## Key Features

1. **Consistent Response Structure**: All API responses follow the same JSON structure with standardized fields, making it easier for clients to consume the API.
2. **Metadata Enrichment**: Automatically includes metadata like timestamps, API version, language information, and more.
3. **Internationalization Support**: Integrates with the message service to provide localized response messages.
4. **Pagination Support**: Built-in pagination response format for list endpoints, including metadata about the pagination.
5. **File Export**: Support for exporting data in Excel or CSV formats with appropriate headers and content types.
6. **Response Caching**: Optional response caching capabilities with configurable TTL and custom cache keys.
7. **Customizable Status Codes**: Ability to customize HTTP status codes and message responses for each endpoint.

## Components

The Response System in `/src/common/response/` is structured around these components:

### Response DTOs

DTOs (Data Transfer Objects) define the structure of responses:

1. **ResponseDto** (`/dtos/response.dto.ts`): 
   - Base DTO for all standard responses
   - Contains `statusCode`, `message`, `_metadata`, and optional `data` fields

2. **ResponseMetadataDto** (`/dtos/response.dto.ts`):
   - Contains metadata like `language`, `timestamp`, `timezone`, `path`, `version`, and `repoVersion`

3. **ResponsePagingDto** (`/dtos/response.paging.dto.ts`):
   - Extends ResponseDto for paginated responses
   - Includes additional pagination metadata

### Response Interfaces

Interfaces define the contract for controller responses and decorator options:

1. **IResponse** (`/interfaces/response.interface.ts`):
   - Base interface for standard responses
   - Contains optional `_metadata` and `data` properties

2. **IResponsePaging** (`/interfaces/response.interface.ts`):
   - Interface for paginated responses
   - Contains `_pagination` with metadata about pagination and an array of `data`

3. **IResponseFileExcel** (`/interfaces/response.interface.ts`):
   - Interface for file export responses
   - Contains `data` array for Excel/CSV export

4. **IResponseOptions** and **IResponseFileExcelOptions** (`/interfaces/response.interface.ts`):
   - Configuration options for response decorators
   - Includes caching options, message properties, and file type settings

### Decorators

Decorators simplify controller implementation by applying interceptors and metadata:

1. **@Response()** (`/decorators/response.decorator.ts`):
   - For standard responses
   - Takes a message path and optional configuration

2. **@ResponsePaging()** (`/decorators/response.decorator.ts`):
   - For paginated responses
   - Takes a message path and optional configuration

3. **@ResponseFileExcel()** (`/decorators/response.decorator.ts`):
   - For file export responses
   - Takes options including file type (CSV or XLSX)

### Interceptors

Interceptors transform controller return values into standardized response objects:

1. **ResponseInterceptor** (`/interceptors/response.interceptor.ts`):
   - Transforms basic responses to follow the standardized format
   - Adds metadata including language, timestamps, version info

2. **ResponsePagingInterceptor** (`/interceptors/response.paging.interceptor.ts`):
   - Specialized for handling paginated responses
   - Adds pagination metadata to the response

3. **ResponseFileExcelInterceptor** (`/interceptors/response.file.interceptor.ts`):
   - Transforms responses into downloadable Excel or CSV files
   - Sets appropriate HTTP headers for file downloads

## Response Types

### Standard Response

The standard response format follows this structure:

```json
{
  "statusCode": 200,
  "message": "User profile retrieved successfully",
  "_metadata": {
    "language": "en",
    "timestamp": 1660190937231,
    "timezone": "Asia/Jakarta",
    "path": "/api/v1/users/profile",
    "version": "1",
    "repoVersion": "1.0.0"
  },
  "data": {
    "id": "5f9d1e7c9d3e2c001c8f0b1e",
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

### Pagination Response

Pagination responses extend the standard format with pagination information:

```json
{
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "_metadata": {
    "language": "en",
    "timestamp": 1660190937231,
    "timezone": "Asia/Jakarta",
    "path": "/api/v1/users",
    "version": "1",
    "repoVersion": "1.0.0",
    "pagination": {
      "search": "John",
      "filters": {},
      "page": 1,
      "perPage": 20,
      "orderBy": "createdAt",
      "orderDirection": "desc",
      "availableSearch": ["name", "email"],
      "availableOrderBy": ["name", "email", "createdAt"],
      "availableOrderDirection": ["asc", "desc"],
      "total": 100,
      "totalPage": 5
    }
  },
  "data": [
    {
      "id": "5f9d1e7c9d3e2c001c8f0b1e",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    // Additional items...
  ]
}
```

### File Response

File responses don't return JSON but instead return a file download with appropriate headers:

- For XLSX files: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- For CSV files: `Content-Type: text/csv`
- Both types include a `Content-Disposition` header for downloading with a timestamp-based filename

## Usage Examples

### Standard Response Example

```typescript
import { Controller, Get } from '@nestjs/common';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { UserProfileDto } from './dtos/user.profile.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Response('user.profile') // 'user.profile' is the message path in language files
  @Get('/profile')
  async getProfile(): Promise<IResponse<UserProfileDto>> {
    const user = await this.userService.findById('userId');
    
    return { data: user };
  }
}
```

### Pagination Response Example

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly paginationService: PaginationService
  ) {}

  @ResponsePaging('user.list')
  @Get('/')
  async findAll(
    @Query() query: Record<string, any>
  ): Promise<IResponsePaging<UserListDto>> {
    const pagination = this.paginationService.create(query);
    const { data, totalData } = await this.userService.findAll(pagination);
    const totalPage = this.paginationService.totalPage(totalData, pagination.perPage);
    
    return {
      _pagination: {
        totalPage,
        total: totalData
      },
      data
    };
  }
}
```

### File Response Example

```typescript
import { Controller, Get } from '@nestjs/common';
import { ResponseFileExcel } from 'src/common/response/decorators/response.decorator';
import { IResponseFileExcel } from 'src/common/response/interfaces/response.interface';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/enums/helper.enum';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ResponseFileExcel({ type: ENUM_HELPER_FILE_EXCEL_TYPE.XLSX })
  @Get('/export')
  async export(): Promise<IResponseFileExcel> {
    const users = await this.userService.findAll();
    
    // Format data for Excel export 
    const formattedData = users.map(user => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      CreatedAt: user.createdAt
    }));
    
    return { data: [formattedData] };
  }
}
```

### Response Caching Example

The boilerplate supports response caching through the `@nestjs/cache-manager` integration. You can enable caching in two ways:

#### Basic Caching

Simple boolean flag to enable caching with default TTL settings from your Redis configuration:

```typescript
// Basic caching with default TTL
@Response('user.profile', { cached: true })
@Get('/profile')
async getProfile(): Promise<IResponse<UserProfileDto>> {
  // This response will be cached with default TTL
  const user = await this.userService.findById('userId');
  return { data: user };
}

// Advanced caching with custom TTL and key
@Response('user.profile', { 
  cached: {
    ttl: 60000, // 1 minute cache
    key: 'user-profile-cache'
  }
})
@Get('/:id/profile')
async getUserProfile(
  @Param('id') id: string
): Promise<IResponse<UserProfileDto>> {
  // This response will be cached for 1 minute with a custom key
  const user = await this.userService.findById(id);
  return { data: user };
}
```

## Custom Response Properties

You can customize status codes, messages, and other properties by including a `_metadata.customProperty` object:

```typescript
@Response('user.create')
@Post('/')
async create(@Body() dto: CreateUserDto): Promise<IResponse> {
  const user = await this.userService.create(dto);
  
  return {
    _metadata: {
      customProperty: {
        statusCode: 201,
        httpStatus: HttpStatus.CREATED,
        message: 'user.created.success' // Override the message path
      }
    },
    data: user
  };
}
```
