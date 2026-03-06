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

**Register in `RequestModule`**:

Add the constraint to the `providers` array inside `RequestModule.forRoot()`:

```typescript
static forRoot(): DynamicModule {
  return {
    module: RequestModule,
    providers: [
      // ... existing constraints
      IsStrongPasswordConstraint,
    ],
    // ...
  };
}
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

**RequestIsValidObjectIdPipe**
Validates MongoDB ObjectId:

```typescript
@Get(':userId')
findOne(@Param('userId', RequestIsValidObjectIdPipe) userId: string) {
  return this.userService.findById(userId);
}
```

**File validation pipes**
See [File Upload][ref-doc-file-upload] for file extension and Csv validation pipes.

## Error Message Mapping

When validation fails, `MessageService` processes errors through `setValidationMessage()`:

**Process**:
1. Extract constraint keys from `ValidationError` using `extractConstraints()`
2. Handle nested validation errors by traversing children with `processNestedValidationError()`
3. Reconstruct full property path for nested objects (e.g., `address.street`)
4. Create localized message for each constraint with fallback mechanism
5. Format into `IMessageValidationError[]`

**Implementation** (from `MessageService`):

```typescript
setValidationMessage(
  errors: ValidationError[],
  options?: IMessageErrorOptions
): IMessageValidationError[] {
  const messages: IMessageValidationError[] = [];

  for (const error of errors) {
    let property = error.property;
    let constraints: Record<string, string> = error.constraints;
    let constraintKeys = constraints ? Object.keys(constraints) : [];

    // Handle nested errors if no direct constraints found
    if (constraintKeys.length === 0) {
      const nestedResult = this.processNestedValidationError(error);
      property = nestedResult.property;  // Full path: address.street
      constraints = nestedResult.constraints;
      constraintKeys = Object.keys(nestedResult.constraints);
    }

    // Create localized message for each constraint
    for (const constraintKey of constraintKeys) {
      messages.push(
        this.createValidationMessage(
          constraintKey,
          constraints[constraintKey],
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

**Message Resolution Strategy**:
1. **Primary**: Tries to resolve from `request.error.{constraint}` path
2. **Fallback**: If translation not found (message equals path), uses raw message from class-validator

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
    "isEmail": "{property} should be a valid email address.",
    "isNotEmpty": "{property} cannot be empty.",
    "minLength": "{property} is shorter than the minimum length allowed.",
    "isPassword": {
      "required": "{property} password is required.",
      "strong": "{property} must be a strong password containing uppercase, lowercase, numbers, and special characters."
    }
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
  "statusCode": 5030,
  "message": "There are validation errors.",
  "errors": [
    {
      "key": "isEmail",
      "property": "email",
      "message": "email should be a valid email address."
    },
    {
      "key": "minLength",
      "property": "password",
      "message": "password is shorter than the minimum length allowed."
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

[ref-nestjs-validation-pipe]: https://docs.nestjs.com/techniques/validation
[ref-class-validator]: https://github.com/typestack/class-validator
[ref-nestjs-swagger]: https://docs.nestjs.com/openapi/introduction
[ref-nestjs-swagger-mapped-types]: https://docs.nestjs.com/openapi/mapped-types
[ref-nestjs-i18n]: https://nestjs-i18n.com

[ref-doc-message]: message.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-doc]: doc.md
[ref-doc-file-upload]: file-upload.md
