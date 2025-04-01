# Overview

The error handling system in ACK NestJS Boilerplate provides a consistent way to handle exceptions throughout the application. It uses NestJS's built-in exception filter mechanism to catch and transform exceptions into standardized HTTP responses.

Key features of the error handling system:

1. **Standardized Error Responses**: All errors follow a consistent structure with appropriate HTTP status codes, messages, and metadata.
2. **Internationalization Support**: Error messages can be localized based on the user's preferred language.
3. **Detailed Validation Errors**: Input validation errors include detailed information about which fields failed validation and why.
4. **Sentry Integration**: Critical errors are automatically reported to Sentry for monitoring and troubleshooting.
5. **Metadata Enrichment**: Each error response includes metadata such as timestamp, timezone, API version, and more.

## Table of Contents
- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Error Filter Modules](#error-filter-modules)
    - [General Filter](#general-filter)
    - [HTTP Filter](#http-filter)
    - [Validation Filter](#validation-filter)
    - [Import Validation Filter](#import-validation-filter)
  - [Internationalization Integration](#internationalization-integration)
  - [Error Response Structure](#error-response-structure)
  - [Examples](#examples)
    - [HTTP Exception](#http-exception)
    - [Validation Exception](#validation-exception)
    - [Custom Exception](#custom-exception)

## Error Filter Modules

The error handling system consists of several specialized exception filters, each responsible for handling specific types of exceptions.

### General Filter

The `AppGeneralFilter` is a catch-all filter that handles any unhandled exceptions, including those that don't extend from `HttpException`. It ensures that even unexpected errors return a properly formatted response.

Key features:
- Catches all exceptions
- Logs exceptions for debugging purposes
- Reports critical errors to Sentry
- Returns 500 Internal Server Error responses for unhandled exceptions

### HTTP Filter

The `AppHttpFilter` specifically handles all HTTP exceptions thrown by the application. These are exceptions that extend NestJS's `HttpException` class.

Key features:
- Handles standard HTTP exceptions
- Customizes error responses based on HTTP status codes
- Preserves custom metadata from exception responses

### Validation Filter

The `AppValidationFilter` handles validation exceptions that occur during request validation. These exceptions are thrown when request data doesn't meet the validation constraints defined in DTOs.

Key features:
- Formats validation errors in a consistent structure
- Provides detailed information about which fields failed validation
- Translates validation error messages based on the selected language

### Import Validation Filter

The `AppValidationImportFilter` is a specialized filter for handling validation errors during file imports. It provides detailed information about which records in an imported file failed validation.

Key features:
- Handles validation errors specific to file imports
- Formats import validation errors in a consistent structure
- Provides record-level validation details

## Internationalization Integration

The error handling system is fully integrated with the application's internationalization system, providing translated error messages based on the client's language preference. This integration works as follows:

1. **Language Detection**: The language is detected from the `x-custom-lang` header sent by the client.
2. **Message Translation**: Error messages are defined as message keys (e.g., 'user.error.notFound') that get translated using the message service.
3. **Validation Message Translation**: Validation error messages are also translated, ensuring that field validation errors are presented in the user's preferred language.
4. **Response Metadata**: The detected language is included in the response metadata, allowing clients to verify which language was used.

All exception filters use the `MessageService` to translate error messages before including them in the response. This service loads translations from language-specific JSON files based on the detected language.

For more detailed information about how internationalization works throughout the application, including how to add new languages or customize existing translations, please refer to the [Internationalization documentation](internationalization.md).

## Error Response Structure

All error responses follow a consistent structure:

```json
{
  "statusCode": 400,
  "message": "Validation error occurred",
  "errors": [
    {
      "property": "email",
      "message": "Email is not valid"
    }
  ],
  "_metadata": {
    "language": "en",
    "timestamp": 1635739200,
    "timezone": "UTC",
    "path": "/api/v1/users",
    "version": "1",
    "repoVersion": "1.0.0"
  }
}
```

Fields in the response:
- `statusCode`: Numeric error code
- `message`: Human-readable error message
- `errors`: Array of detailed validation errors (for validation exceptions)
- `_metadata`: Additional context information about the request

## Examples

### HTTP Exception

When a route returns a 404 Not Found error:

```typescript
import { NotFoundException } from '@nestjs/common';

@Get('users/:id')
findOne(@Param('id') id: string) {
  const user = this.userService.findById(id);
  if (!user) {
    throw new NotFoundException({
      statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
      message: 'user.error.notFound',
    });
  }
  return user;
}
```

Response:
```json
{
  "statusCode": 404,
  "message": "User not found",
  "_metadata": {
    "language": "en",
    "timestamp": 1635739200,
    "timezone": "UTC",
    "path": "/api/v1/users/123",
    "version": "1",
    "repoVersion": "1.0.0"
  }
}
```

### Validation Exception

When a request fails validation:

```typescript
@Post('users')
create(@Body() createUserDto: CreateUserDto) {
  // Validation is handled automatically by class-validator
  return this.userService.create(createUserDto);
}
```

With a DTO:
```typescript
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

Response for an invalid request:
```json
{
  "statusCode": 400,
  "message": "Validation error occurred",
  "errors": [
    {
      "property": "email",
      "message": "Email must be a valid email address"
    },
    {
      "property": "password",
      "message": "Password must be at least 8 characters long"
    }
  ],
  "_metadata": {
    "language": "en",
    "timestamp": 1635739200,
    "timezone": "UTC", 
    "path": "/api/v1/users",
    "version": "1",
    "repoVersion": "1.0.0"
  }
}
```

### Custom Exception

Creating and using a custom exception:

```typescript
// src/modules/user/exceptions/user-blocked.exception.ts
export class UserBlockedException extends BadRequestException {
  constructor() {
    super({
      statusCode: ENUM_USER_STATUS_CODE_ERROR.BLOCKED,
      message: 'user.error.blocked',
    });
  }
}

// Usage in a service
@Injectable()
export class AuthService {
  async validateUser(email: string, password: string): Promise<UserDoc> {
    const user = await this.userService.findOneByEmail(email);
    
    if (user.blocked) {
      throw new UserBlockedException();
    }
    
    // Continue with authentication
  }
}
```

Response:
```json
{
  "statusCode": 400,
  "message": "User is blocked",
  "_metadata": {
    "language": "en",
    "timestamp": 1635739200,
    "timezone": "UTC",
    "path": "/api/v1/auth/login",
    "version": "1",
    "repoVersion": "1.0.0"
  }
}
```
