# Overview

The error handling system in ACK NestJS Boilerplate provides a consistent way to handle exceptions throughout the application. It uses NestJS's built-in exception filter mechanism to catch and transform exceptions into standardized HTTP responses.

This documentation explains the features and usage of:
- **Error Handling Core**: Located at `src/app/filters`

Key features of the error handling system:

1. **Standardized Error Responses**: All errors follow a consistent structure with appropriate HTTP status codes, messages, and metadata.
2. **Internationalization Support**: Error messages can be localized based on the user's preferred language.
3. **Detailed Validation Errors**: Input validation errors include detailed information about which fields failed validation and why.
4. **Sentry Integration**: Critical errors are automatically reported to Sentry for monitoring and troubleshooting.
5. **Metadata Enrichment**: Each error response includes metadata such as timestamp, timezone, API version, and more.

# Table of Contents
- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Filters](#filters)
    - [General Filter](#general-filter)
    - [HTTP Filter](#http-filter)
    - [Validation Filter](#validation-filter)
    - [Import Validation Filter](#import-validation-filter)
  - [Internationalization Integration](#internationalization-integration)
  - [Error Response Structure](#error-response-structure)
  - [Examples](#examples)
    - [HTTP Exception](#http-exception)
    - [Validation Exception](#validation-exception)

## Filters

The error handling system consists of several specialized exception filters, each responsible for handling specific types of exceptions.

### General Filter

The `AppGeneralFilter` is a catch-all filter that handles any unhandled exceptions, including those that don't extend from `HttpException`. It ensures that even unexpected errors return a properly formatted response.

```typescript
@Catch()
export class AppGeneralFilter implements ExceptionFilter {
    // Log errors and send to Sentry for monitoring
    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        // Log the exception
        this.logger.error(exception);
        
        // Send to Sentry
        this.sendToSentry(exception);
        
        // Handle response formatting
        // ...
    }
}
```

### HTTP Filter

The `AppHttpFilter` specifically handles all HTTP exceptions thrown by the application.

```typescript
@Catch(HttpException)
export class AppHttpFilter implements ExceptionFilter {
    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        // Get language from request for message translation
        const xLanguage: string = request.__language ?? 
            this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');
            
        // Prepare standardized response
        // ...
    }
}
```

### Validation Filter

The `AppValidationFilter` handles validation exceptions that occur during request validation.

```typescript
@Catch(RequestValidationException)
export class AppValidationFilter implements ExceptionFilter {
    async catch(exception: RequestValidationException, host: ArgumentsHost): Promise<void> {
        // Format validation errors with detailed messages
        const validationErrors: IMessageValidationError[] = exception.errors.map(
            (error: any) => {
                // Process each validation error
                // ...
            }
        );
        
        // Build structured response
        // ...
    }
}
```

### Import Validation Filter

The `AppValidationImportFilter` is a specialized filter for handling validation errors during file imports.

```typescript
@Catch(FileImportException)
export class AppValidationImportFilter implements ExceptionFilter {
    async catch(exception: FileImportException, host: ArgumentsHost): Promise<void> {
        // Process file import errors by row and column
        // ...
    }
}
```

## Internationalization Integration

The error handling system is integrated with the application's internationalization system:

1. **Language Detection**: The language is detected from the request context.
2. **Message Translation**: Error messages are translated using the `MessageService`.
3. **Response Metadata**: The detected message is included in the response metadata.

```typescript
// Language detection example (from HTTP filter)
const xLanguage: string = request.__language ?? 
    this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');

// Translate error message
const message = this.messageService.get(messageData.message, {
    property,
    language: xLanguage,
});
```

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

## Examples

### HTTP Exception

Example of throwing and handling an HTTP exception:

```typescript
// Throwing an exception
throw new NotFoundException({
  statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
  message: 'user.error.notFound',
});

// Response:
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

When a request with a validation error is processed:

```typescript
// DTO with validation
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// Response from Validation filter
{
  "statusCode": 400,
  "message": "Validation error occurred",
  "errors": [
    {
      "property": "email",
      "message": "Email must be a valid email address"
    }
  ],
  "_metadata": {
    // ...metadata
  }
}
```

