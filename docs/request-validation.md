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
[yarn-shield]: https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white
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
[ref-prisma]: https://www.prisma.io
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

<!-- DOCUMENTS -->

[ref-doc-root]: readme.md
[ref-doc-audit-activity-log]: docs/audit-activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-internationalization]: docs/internationalization.md
[ref-doc-logger]: docs/logger.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response-structure]: docs/response-structure.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-service-side-pagination]: docs/service-side-pagination.md
[ref-doc-third-party-integration]: docs/third-party-integration.md

<!-- # Overview

Request validation is a critical part of any robust API, ensuring that incoming data meets specified requirements before processing. This documentation covers the request validation system in the ACK NestJS Boilerplate, specifically focusing on the implementation in the `/common/request` directory.

The boilerplate uses [class-validator](https://github.com/typestack/class-validator) and [class-transformer](https://github.com/typestack/class-transformer) libraries to implement validation, with custom validators extending the basic functionality to handle complex business rules.

This documentation explains the features and usage of:
- **Request Module**: Located at `src/common/request`

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Components](#components)
  - [Custom Validators](#custom-validators)
  - [Validation Exception Handling](#validation-exception-handling)
  - [Request Timeout](#request-timeout)
  - [Usage Examples](#usage-examples)
    - [Using Custom Validators](#using-custom-validators)
    - [Setting Custom Timeout](#setting-custom-timeout)
    - [Using Required Pipe](#using-required-pipe)

## Components

The request validation system in `/common/request` consists of several key components:

1. **Custom Validators**: Located in `src/common/request/validations/` folder, these validators extend the basic validators from class-validator to handle complex validation scenarios
2. **Validation Exception**: The `RequestValidationException` in `src/common/request/exceptions/request.validation.exception.ts` is thrown when validation fails
3. **Request Pipes**: The `RequestRequiredPipe` in `src/common/request/pipes/request.required.pipe.ts` ensures that required parameters are present
4. **Request Decorators**: The `@RequestTimeout()` decorator in `src/common/request/decorators/request.decorator.ts` allows for custom timeout settings
5. **Request Timeout Interceptor**: The interceptor in `src/common/request/interceptors/request.timeout.interceptor.ts` handles request timeouts

## Custom Validators

The `/common/request/validations/` directory contains custom validators for complex validation scenarios:

| Validator | Description | File Path |
|-----------|-------------|------|
| `@IsPassword()` | Validates password strength using HelperStringService | `request.is-password.validation.ts` |
| `@IsCustomEmail()` | Validates emails with custom business rules | `request.custom-email.validation.ts` |
| `@DateGreaterThan()` | Validates that a date is greater than another date | `request.date-greater-than.validation.ts` |
| `@DateGreaterThanEqual()` | Validates that a date is greater than or equal to another date | `request.date-greater-than.validation.ts` |
| `@DateLessThan()` | Validates that a date is less than another date | `request.date-less-than.validation.ts` |
| `@DateLessThanEqual()` | Validates that a date is less than or equal to another date | `request.date-less-than.validation.ts` |
| `@GreaterThanOtherProperty()` | Validates that a value is greater than another property | `request.greater-than-other-property.validation.ts` |
| `@GreaterThanEqualOtherProperty()` | Validates that a value is greater than or equal to another property | `request.greater-than-other-property.validation.ts` |
| `@LessThanOtherProperty()` | Validates that a value is less than another property | `request.less-than-other-property.validation.ts` |
| `@LessThanEqualOtherProperty()` | Validates that a value is less than or equal to another property | `request.less-than-other-property.validation.ts` |

Example of custom validator implementation (IsPassword):

```typescript
@ValidatorConstraint({ async: true })
@Injectable()
export class IsPasswordConstraint implements ValidatorConstraintInterface {
    constructor(protected readonly helperStringService: HelperStringService) {}

    validate(value: string): boolean {
        return value
            ? this.helperStringService.checkPasswordStrength(value)
            : false;
    }
}

export function IsPassword(validationOptions?: ValidationOptions) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'IsPassword',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsPasswordConstraint,
        });
    };
}
```

## Validation Exception Handling

When validation fails, the `RequestValidationException` is thrown:

```typescript
export class RequestValidationException extends Error {
    readonly httpStatus: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly statusCode: number = ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION;
    readonly errors: ValidationError[];

    constructor(errors: ValidationError[]) {
        super('request.validation');

        this.errors = errors;
    }
}
```

The exception is caught by the `AppValidationFilter` in `src/app/filters/app.validation.filter.ts`, which formats the error response with detailed validation errors for each invalid property. The response includes:

- HTTP status code (422 Unprocessable Entity)
- Error message based on the language setting
- Detailed validation errors for each invalid property
- Metadata including language, timestamp, timezone, and version information

## Request Timeout

The request timeout system in the `/common/request` directory includes:

1. **RequestTimeout Decorator**: 
   ```typescript
   export function RequestTimeout(seconds: string): MethodDecorator {
       return applyDecorators(
           SetMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, true),
           SetMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
       );
   }
   ```

2. **RequestTimeoutInterceptor**: Intercepts requests and applies a timeout based on configuration or the custom timeout from the decorator. If a request exceeds the time limit, a `RequestTimeoutException` is thrown with appropriate error details.

## Usage Examples

### Using Custom Validators

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { IsPassword } from '@common/request/validations/request.is-password.validation';

export class UserCreateDto {
    @ApiProperty({
        description: 'User password',
        example: 'Password123@@!',
        required: true,
    })
    @IsNotEmpty()
    @IsPassword()
    @MinLength(8)
    @MaxLength(50)
    password: string;
}
```

### Setting Custom Timeout

```typescript
import { Controller, Get } from '@nestjs/common';
import { RequestTimeout } from '@common/request/decorators/request.decorator';

@Controller('users')
export class UserController {
    @Get()
    @RequestTimeout('30s')  // Sets a custom timeout of 30 seconds for this route
    findAll() {
        // This operation now has 30 seconds to complete
        return this.userService.findAll();
    }
}
```

### Using Required Pipe

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';

@Controller('users')
export class UserController {
    @Get(':id')
    findOne(@Param('id', RequestRequiredPipe) id: string) {
        // The RequestRequiredPipe ensures that the id parameter is present
        return this.userService.findOne(id);
    }
}
``` -->
