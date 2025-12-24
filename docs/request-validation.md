# Request Validation Documentation

This documentation explains the features and usage of **Request Module**: Located at `src/common/request`

## Overview

Request validation uses NestJS's built-in [ValidationPipe][ref-nestjs-validation-pipe] with [class-validator][ref-class-validator] decorators to validate request body, query parameters, and path parameters.

## Related Documents

- [Message Documentation][ref-doc-message] - For internationalization and error message translation
- [Handling Error Documentation][ref-doc-handling-error] - For exception handling and response formatting
- [Doc Documentation][ref-doc-doc] - For API documentation integration with DTOs
- [File Upload Documentation][ref-doc-file-upload] - For file validation pipes

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Request Module](#request-module)
- [Usage](#usage)
  - [Request Body Validation](#request-body-validation)
  - [Query Parameters Validation](#query-parameters-validation)
  - [Path Parameters Validation](#path-parameters-validation)
- [DTO with Doc](#dto-with-doc)
- [Extending DTOs](#extending-dtos)
  - [Direct](#direct)
  - [PartialType](#partialtype)
  - [OmitType](#omittype)
  - [IntersectionType](#intersectiontype)
- [Custom Validators](#custom-validators)
  - [Available Custom Validators](#available-custom-validators)
  - [Creating Custom Validator](#creating-custom-validator)
- [Validation Pipes](#validation-pipes)
- [Error Message Mapping](#error-message-mapping)
- [Error Message Translation](#error-message-translation)

## Request Module

The validation system is configured globally in `RequestModule`:

```typescript
new ValidationPipe({
  transform: true,
  skipMissingProperties: false,
  skipNullProperties: false,
  skipUndefinedProperties: false,
  forbidUnknownValues: false,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: {
      excludeExtraneousValues: false,
  },
  validationError: {
      target: false,
      value: true,
  },
  errorHttpStatusCode:
      HttpStatus.UNPROCESSABLE_ENTITY,
  exceptionFactory: async (
      errors: ValidationError[]
  ) => new RequestValidationException(errors),
})
```

**Processing flow**:
```
Request received
    ↓
ValidationPipe validates DTO
    ↓
Valid? → Continue to controller
    ↓ No
RequestValidationException thrown
    ↓
AppValidationFilter catches exception
    ↓
MessageService formats errors with i18n
    ↓
Standardized error response (HTTP 422)
```

## Usage

### Request Body Validation

Apply DTO as type parameter in `@Body()` decorator:

```typescript
@Controller('users')
export class UserController {
  @Post()
  create(@Body() body: CreateUserDto) {
    // body is validated and transformed
    return this.userService.create(body);
  }
}
```

**DTO example**:

```typescript
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
```

### Query Parameters Validation

```typescript
@Controller('users')
export class UserController {
  @Get()
  list(@Query() query: UserListDto) {
    return this.userService.findAll(query);
  }
}
```

**DTO example**:

```typescript
export class UserListDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(10)
  @Max(100)
  limit?: number = 20;
}
```

### Path Parameters Validation

```typescript
@Controller('users')
export class UserController {
  @Get(':userId')
  findOne(@Param() param: UserParamDto) {
    return this.userService.findById(param.userId);
  }
}
```

**DTO example**:

```typescript
export class UserParamDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}
```

## DTO with Doc

Combine [class-validator][ref-class-validator] decorators with `@ApiProperty` from [@nestjs/swagger][ref-nestjs-swagger]:

```typescript
export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: faker.internet.email(),
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string.alphanumeric(5).toUpperCase()}@@!123`,
    required: true,
    minLength: 8,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @ApiProperty({
    description: 'User full name',
    example: faker.person.fullName(),
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

See [Doc Documentation][ref-doc-doc] for complete guide with API documentation.

## Extending DTOs

Use type helpers from [@nestjs/swagger][ref-nestjs-swagger] to maintain `@ApiProperty` validity when extending DTOs. See [@nestjs/swagger documentation][ref-nestjs-swagger-mapped-types] for details.

### Direct

```typescript
export class UpdateUserDto extends CreateUserDto {
  @ApiProperty({
    description: 'User status',
    example: 'active',
  })
  @IsString()
  @IsOptional()
  status?: string;
}
```

### PartialType

Makes all properties optional:

```typescript
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### OmitType

Excludes specific properties:

```typescript
export class UpdateUserDto extends OmitType(CreateUserDto, ['password'] as const) {}
```

### IntersectionType

Combines multiple DTOs:

```typescript
export class UserWithProfileDto extends IntersectionType(
  CreateUserDto,
  ProfileDto
) {}
```

## Custom Validators

### Available Custom Validators

Located in `src/common/request/validations/*`:

**IsCustomEmail**
Enhanced email validation with detailed error messages:

```typescript
export class CreateUserDto {
  @IsCustomEmail()
  @IsNotEmpty()
  email: string;
}
```

**IsPassword**
Strong password validation:

```typescript
export class ChangePasswordDto {
  @IsPassword()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  newPassword: string;
}
```

**IsAfterNow**
Validates date is after current time:

```typescript
export class CreateEventDto {
  @IsAfterNow()
  @IsNotEmpty()
  startDate: Date;
}
```

**GreaterThanOtherProperty**
Validates field is greater than another field:

```typescript
export class CreateRangeDto {
  @IsNumber()
  minValue: number;

  @GreaterThanOtherProperty('minValue')
  @IsNumber()
  maxValue: number;
}
```

**GreaterThanEqualOtherProperty**
Validates field is greater than or equal to another field:

```typescript
export class CreateRangeDto {
  @IsNumber()
  minValue: number;

  @GreaterThanEqualOtherProperty('minValue')
  @IsNumber()
  maxValue: number;
}
```

**LessThanOtherProperty**
Validates field is less than another field:
```typescript
export class CreateDiscountDto {
  @IsNumber()
  maxDiscount: number;

  @LessThanOtherProperty('maxDiscount')
  @IsNumber()
  minDiscount: number;
}
```

**LessThanEqualOtherProperty**
Validates field is less than or equal to another field:

```typescript
export class CreateDiscountDto {
  @IsNumber()
  maxDiscount: number;

  @LessThanEqualOtherProperty('maxDiscount')
  @IsNumber()
  minDiscount: number;
}
```

### Creating Custom Validator

For module-specific validators, create in module's `/validations` folder. For global validators, add to `src/common/request/validations`:

```typescript
@ValidatorConstraint({ async: false })
@Injectable()
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    // Validation logic
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'request.error.passwordWeak';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string): void {
    registerDecorator({
      name: 'IsStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
```

**Register in module**:

```typescript
@Module({
  providers: [IsStrongPasswordConstraint],
})
export class RequestModule {}
```

## Validation Pipes

Pipes validate single fields for body, param, or query. For multiple fields, use DTO with class-validator.

**RequestRequiredPipe**
Validates required parameters:

```typescript
@Controller('users')
export class UserController {
  @Get(':userId')
  findOne(@Param('userId', RequestRequiredPipe) userId: string) {
    return this.userService.findById(userId);
  }
}
```

**RequestParseObjectIdPipe**
Validates MongoDB ObjectId:

```typescript
@Get(':userId')
findOne(@Param('userId', RequestParseObjectIdPipe) userId: string) {
  return this.userService.findById(userId);
}
```

**File validation pipes**
See [File Upload][ref-doc-file-upload] for file extension and Csv validation pipes.

## Error Message Mapping

When validation fails, `MessageService` processes errors through `setValidationMessage()`:

**Process**:
1. Extract constraint keys from `ValidationError`
2. Handle nested validation errors (e.g., `user.profile.email`)
3. Create localized message for each constraint
4. Format into `IMessageValidationError[]`

**Implementation** (from `MessageService`):

```typescript
setValidationMessage(
  errors: ValidationError[],
  options?: IMessageErrorOptions
): IMessageValidationError[] {
  const messages: IMessageValidationError[] = [];

  for (const error of errors) {
    let property = error.property;
    const constraints: string[] = Object.keys(error.constraints ?? []);

    // Handle nested errors
    if (constraints.length === 0) {
      const nestedResult = this.processNestedValidationError(error);
      property = nestedResult.property;
      constraints.push(...nestedResult.constraints);
    }

    // Create message for each constraint
    for (const constraint of constraints) {
      messages.push(
        this.createValidationMessage(
          constraint,
          error.value,
          property,
          options
        )
      );
    }
  }

  return messages;
}
```

**Error structure**:

```typescript
interface IMessageValidationError {
  key: string;        // Constraint name (e.g., 'isEmail')
  property: string;   // Property path (e.g., 'user.email')
  message: string;    // Localized message
}
```

## Error Message Translation

Error messages are translated using [nestjs-i18n][ref-nestjs-i18n] through [Message System][ref-doc-message].

**Message path pattern**: `request.error.{constraintName}`

**Example message file** (`en/request.json`):
```json
{
  "error": {
    "isEmail": "{property} must be a valid email address",
    "isNotEmpty": "{property} is required",
    "minLength": "{property} must be at least {min} characters",
    "isPassword": "{property} must contain uppercase, lowercase, number and special character"
  }
}
```

**Custom validator message** (from `IsCustomEmailConstraint`):

```typescript
defaultMessage(validationArguments?: ValidationArguments): string {
  if (!validationArguments?.value) {
    return 'request.error.email.required';
  }

  const validationResult = this.helperService.checkEmail(
    validationArguments.value
  );
  return validationResult.messagePath ?? 'request.error.email.invalid';
}
```

**Final response** (handled by `AppValidationFilter`):
```json
{
  "statusCode": 422,
  "message": "Validation error",
  "errors": [
    {
      "key": "isEmail",
      "property": "email",
      "message": "email must be a valid email address"
    },
    {
      "key": "minLength",
      "property": "password",
      "message": "password must be at least 8 characters"
    }
  ],
  "metadata": {
    "language": "en",
    "timestamp": 1660190937231,
    "timezone": "Asia/Jakarta",
    "path": "/api/v1/users",
    "version": "1",
    "repoVersion": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "correlationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }
}
```

See [Handling Error][ref-doc-handling-error] for complete error handling flow.




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
