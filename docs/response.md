# Overview

The response system in ACK NestJS Boilerplate provides a standardized way to structure API responses throughout the application. It ensures that all responses follow a consistent format, which improves API usability and makes integration easier for frontend developers.

It provides several key features:

1. **Consistent Response Structure**: All API responses follow the same JSON structure with standardized fields.
2. **Metadata Enrichment**: Automatically includes metadata like timestamps, API version, and language information.
3. **Internationalization Support**: Integrates with the message service to provide localized response messages.
4. **Pagination Support**: Built-in pagination response format for list endpoints.
5. **File Export**: Support for exporting data in Excel or CSV formats.
6. **Response Caching**: Optional response caching capabilities.

The response system consists of interceptors that transform controller return values into standardized response objects, decorators that simplify controller implementation, and DTOs that define the response structure.

## Table of Contents

- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Modules](#modules)
    - [Types and DTOs](#types-and-dtos)
      - [Standard Response](#standard-response)
      - [Paging Response](#paging-response)
      - [File Response](#file-response)
    - [Interceptors](#interceptors)
    - [Decorators](#decorators)
  - [Examples](#examples)
    - [Standard Response Example](#standard-response-example)
    - [Paging Response Example](#paging-response-example)
    - [File Export Response Example](#file-export-response-example)
    - [Response Caching Example](#response-caching-example)
      - [Basic Caching](#basic-caching)
      - [Advanced Caching Options](#advanced-caching-options)
  - [Internationalization](#internationalization)
  - [Custom Response Metadata](#custom-response-metadata)

## Modules

### Types and DTOs

The boilerplate defines both response data structures (DTOs) and response formats (Types) to ensure consistent API responses:

#### Standard Response

- **ResponseDto**: Base DTO for all responses
  - Contains `statusCode`, `message`, `_metadata`, and optional `data` fields
  - Used for single object responses

- **ResponseMetadataDto**: Contains metadata about the response
  - Includes `language`, `timestamp`, `timezone`, `path`, `version`, and `repoVersion`

Standard responses are used for single object responses or simple operations. The structure is:

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
    "email": "john.doe@example.com",
    "role": {
      "id": "5f9d1e7c9d3e2c001c8f0b1d",
      "name": "User"
    }
  }
}
```

#### Paging Response

- **ResponsePagingDto**: Extended response for paginated data
  - Includes all fields from ResponseDto plus pagination metadata
  - Contains an array of data objects
  
- **ResponsePagingMetadataDto**: Extended metadata for paginated responses
  - Includes pagination information like `page`, `perPage`, `total`, etc.

Paging responses are used for list endpoints with pagination. The structure is:

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

#### File Response

File responses are used to export data in Excel or CSV format. The response is a file download rather than JSON. This type doesn't have a specific DTO representation as it returns a file stream.

### Interceptors

The system includes three main interceptors:

- **ResponseInterceptor**: Transforms controller responses into a standardized ResponseDto format
  - Adds metadata like language, timestamp, API version
  - Handles message translation using the message service
  
- **ResponsePagingInterceptor**: Specialized interceptor for paginated responses
  - Extends ResponseInterceptor with pagination metadata
  - Handles pagination-specific structure

- **ResponseFileExcelInterceptor**: Handles file exports in Excel or CSV format
  - Transforms data into downloadable files
  - Sets appropriate HTTP headers for file downloads

### Decorators

Decorators simplify the implementation of controllers by abstracting away the complexity of response transformation:

- **@Response()**: Basic response decorator for standard responses
  - Parameters:
    - `messagePath`: Path to the message in the language file
    - `options`: Optional configuration including message properties and caching
  
- **@ResponsePaging()**: Decorator for paginated responses
  - Parameters:
    - `messagePath`: Path to the message in the language file
    - `options`: Optional configuration including message properties and caching
  
- **@ResponseFileExcel()**: Decorator for file export responses
  - Parameters:
    - `options`: Configuration for file export including type (CSV or XLSX)

## Examples

### Standard Response Example

```typescript
import { Controller, Get } from '@nestjs/common';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { UserProfileResponseDto } from './dtos/response/user.profile.response.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Response('user.getProfile')
  @Get('/profile')
  async getProfile(): Promise<IResponse<UserProfileResponseDto>> {
    const user = await this.userService.findById('userId');
    const mappedUser = this.userService.mapProfile(user);
    
    return { data: mappedUser };
  }
}
```

### Paging Response Example

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { UserListResponseDto } from './dtos/response/user.list.response.dto';
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
    @Query()
    query: Record<string, any>
  ): Promise<IResponsePaging<UserListResponseDto>> {
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

### File Export Response Example

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ResponseFileExcel } from 'src/common/response/decorators/response.decorator';
import { IResponseFileExcel } from 'src/common/response/interfaces/response.interface';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/enums/helper.enum';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ResponseFileExcel({ type: ENUM_HELPER_FILE_EXCEL_TYPE.CSV })
  @Get('/export')
  async export(): Promise<IResponseFileExcel> {
    const users = await this.userService.findAll();
    const data = users.map(user => ({
      name: user.name,
      email: user.email,
      role: user.role.name
    }));
    
    return { data: [data] };
  }
}
```

### Response Caching Example

The boilerplate supports response caching through the `@nestjs/cache-manager` integration. You can enable caching in two ways:

#### Basic Caching

Simple boolean flag to enable caching with default TTL settings from your Redis configuration:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { UserProfileResponseDto } from './dtos/response/user.profile.response.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Response('user.getProfile', { cached: true })
  @Get('/profile')
  async getProfile(): Promise<IResponse<UserProfileResponseDto>> {
    const user = await this.userService.findById('userId');
    const mappedUser = this.userService.mapProfile(user);
    
    return { data: mappedUser };
  }
}
```

#### Advanced Caching Options

For more control over cache behavior, you can specify a custom TTL (time-to-live) and cache key:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { UserProfileResponseDto } from './dtos/response/user.profile.response.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Response('user.getProfile', { 
    cached: {
      ttl: 60000, // Cache for 1 minute (60000ms)
      key: 'user-profile' // Custom cache key
    }
  })
  @Get('/:id/profile')
  async getProfile(
    @Param('id') id: string
  ): Promise<IResponse<UserProfileResponseDto>> {
    const user = await this.userService.findById(id);
    const mappedUser = this.userService.mapProfile(user);
    
    return { data: mappedUser };
  }
}
```

You can also use caching with paginated responses:

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { UserListResponseDto } from './dtos/response/user.list.response.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly paginationService: PaginationService
  ) {}

  @ResponsePaging('user.list', {
    cached: {
      ttl: 30000, // Cache for 30 seconds
      key: 'users-list'
    }
  })
  @Get('/')
  async findAll(
    @Query()
    query: Record<string, any>
  ): Promise<IResponsePaging<UserListResponseDto>> {
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


## Internationalization

The response system integrates with the message service to provide localized response messages. The `messagePath` parameter in the response decorators is used to retrieve the appropriate message from the language files based on the user's preferred language.

For more information on how internationalization works, please see the [Internationalization documentation](internationalization.md).

## Custom Response Metadata

You can add custom metadata to responses by returning an object with a `_metadata` property:

```typescript
@Response('user.create')
@Post('/')
async create(@Body() dto: CreateUserDto): Promise<IResponse> {
  const user = await this.userService.create(dto);
  
  return {
    _metadata: {
      customProperty: {
        statusCode: 201,
        httpStatus: HttpStatus.CREATED
      }
    }
  };
}
```

This allows you to customize the response status code and other metadata properties.
