# Overview

Request validation is a critical part of any robust API, ensuring that incoming data meets specified requirements before processing. This documentation covers the request validation system in the ACK NestJS Boilerplate, which leverages NestJS's built-in validation capabilities along with custom validators for advanced validation scenarios.

The boilerplate uses [class-validator](https://github.com/typestack/class-validator) and [class-transformer](https://github.com/typestack/class-transformer) libraries to implement validation, with custom validators extending the basic functionality to handle complex business rules.

## Table of Contents

- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Core Components](#core-components)
  - [Validation Decorators](#validation-decorators)
    - [Standard Validators](#standard-validators)
    - [Custom Validators](#custom-validators)
  - [Validation Flow](#validation-flow)
  - [Error Handling](#error-handling)
  - [Request Timeout](#request-timeout)
  - [Examples](#examples)
    - [Validation with extends other class](#validation-with-extends-other-class)

## Core Components

The request validation system consists of several key components:

1. **Request DTOs**: Data Transfer Objects that define the structure and validation rules for incoming requests
2. **Validation Decorators**: Class decorators that apply validation rules to DTO properties
3. **Custom Validators**: Custom validation logic for complex validation scenarios
4. **Validation Pipes**: NestJS pipes that transform and validate incoming data
5. **Exception Filters**: Handlers for validation exceptions that format and return error responses

## Validation Decorators

### Standard Validators

The boilerplate uses the standard validators from [class-validator](https://github.com/typestack/class-validator) library. These validators provide a wide range of validation rules for common scenarios. For a comprehensive list of available decorators and their usage, please refer to the [class-validator documentation](https://github.com/typestack/class-validator#validation-decorators).

Some commonly used decorators include `@IsString()`, `@IsNotEmpty()`, `@MinLength()`, `@MaxLength()`, `@IsEmail()`, `@IsNumber()`, `@IsBoolean()`, `@IsEnum()`, `@IsDate()`, `@IsArray()`, etc.

### Custom Validators

The boilerplate includes custom validators in `src/common/request/validations/` for more complex validation scenarios:

| Validator | Description | Path |
|-----------|-------------|------|
| `@IsPassword()` | Validates password strength | `request.is-password.validation.ts` |
| `@IsCustomEmail()` | Validates emails with custom business rules | `request.custom-email.validation.ts` |
| `@DateGreaterThan()` | Validates that a date is greater than another date | `request.date-greater-than.validation.ts` |
| `@DateGreaterThanEqual()` | Validates that a date is greater than or equal to another date | `request.date-greater-than.validation.ts` |
| `@DateLessThan()` | Validates that a date is less than another date | `request.date-less-than.validation.ts` |
| `@DateLessThanEqual()` | Validates that a date is less than or equal to another date | `request.date-less-than.validation.ts` |
| `@GreaterThanOtherProperty()` | Validates that a value is greater than another property | `request.greater-than-other-property.validation.ts` |
| `@GreaterThanEqualOtherProperty()` | Validates that a value is greater than or equal to another property | `request.greater-than-other-property.validation.ts` |
| `@LessThanOtherProperty()` | Validates that a value is less than another property | `request.less-than-other-property.validation.ts` |
| `@LessThanEqualOtherProperty()` | Validates that a value is less than or equal to another property | `request.less-than-other-property.validation.ts` |

## Validation Flow

The validation flow in the boilerplate works as follows:

1. Client sends a request to an API endpoint
2. NestJS parses the request body, params, and query
3. The data is passed to validation pipes, which:
   - Transform the data using class-transformer
   - Validate the data using class-validator
4. If validation passes, the data is passed to the controller handler
5. If validation fails, a `RequestValidationException` is thrown
6. The `AppValidationFilter` catches the exception and formats an error response

## Error Handling

When validation fails, the boilerplate provides detailed error messages through the `AppValidationFilter`. Key components:

1. **RequestValidationException**: Custom exception in `src/common/request/exceptions/request.validation.exception.ts`
2. **AppValidationFilter**: Filter in `src/app/filters/app.validation.filter.ts` that formats validation errors
3. **MessageService**: Service that localizes error messages based on the client's preferred language

Error responses include:
- HTTP status code (422 Unprocessable Entity)
- Error message ("There are validation errors")
- Detailed validation errors for each invalid property
- Metadata including language, timestamp, timezone, and version information

## Request Timeout

The boilerplate includes a mechanism to prevent long-running requests from consuming server resources. This is implemented using:

1. **Request timeout middleware**: Sets a maximum time limit for request processing
2. **Timeout interceptor**: Throws an exception if a request exceeds the time limit
3. **Configuration**: Timeout durations are configurable in the application settings

## Examples


```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({
        description: 'User name',
        example: 'John Doe',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(100)
    name: string;

    @ApiProperty({
        description: 'User email',
        example: 'john.doe@example.com',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;
}
```

### Validation with extends other class

The `AuthSignUpRequestDto` from the boilerplate demonstrates custom password validation:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { IsPassword } from 'src/common/request/validations/request.is-password.validation';

export class AuthSignUpRequestDto extends OmitType(UserCreateRequestDto, [
    'role',
    'gender',
] as const) {
    @ApiProperty({
        description: 'string password',
        example: 'Password123@@!',
        required: true,
        maxLength: 50,
        minLength: 8,
    })
    @IsNotEmpty()
    @IsPassword()
    @MinLength(8)
    @MaxLength(50)
    password: string;
}
```
