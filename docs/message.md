# Message Documentation

This documentation explains the features and usage of **Message Module**: Located at `src/common/message`

## Overview

Message Service provides internationalization (i18n) support using [nestjs-i18n][ref-nestjs-i18n] to manage multi-language messages. All message files are stored in `src/languages/{language}` directory in JSON format. Currently, only English (`en`) is available.

The `MessageModule` is imported globally via `CommonModule` in `src/common/common.module.ts`, making `MessageService` available throughout the application without additional imports.

## Related Documents

- [Response Documentation][ref-doc-response] - For response integration with message service
- [Handling Error Documentation][ref-doc-handling-error] - For exception filter integration
- [Request Validation Documentation][ref-doc-request-validation] - For validation message translation
- [Security and Middleware Documentation][ref-doc-security-and-middleware] - For custom language header middleware and internationalization

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Configuration](#configuration)
- [Message Files](#message-files)
- [Usage](#usage)
  - [Basic Translation](#basic-translation)
  - [Translation with Variables](#translation-with-variables)
  - [Custom Language](#custom-language)
- [Integration](#integration)
  - [Exception Filters](#exception-filters)
  - [Response Decorator](#response-decorator)
  - [Validation Pipe](#validation-pipe)
- [Adding New Language](#adding-new-language)

## Configuration

Default language is configured via environment variable:

```bash
APP_LANGUAGE=en
```

Configuration structure:

```typescript
// src/config/message.config.ts
export default registerAs(
    'message',
    (): IConfigMessage => ({
        availableLanguage: Object.values(EnumMessageLanguage),
        language: process.env.APP_LANGUAGE ?? EnumMessageLanguage.EN,
    })
);
```

Language options are defined in the enum:

```typescript
export enum EnumMessageLanguage {
    en = 'en',
}
```

## Message Files

Message files use JSON format with nested structure. Key paths follow the pattern: `filename.field.nested`. Files are located in `src/languages/en/`:

| File | Description |
|------|-------------|
| `activityLog.json` | Activity log messages |
| `apiKey.json` | API key messages |
| `app.json` | General application messages |
| `auth.json` | Authentication messages |
| `country.json` | Country-related messages |
| `device.json` | Device management messages |
| `featureFlag.json` | Feature flag messages |
| `file.json` | File upload messages |
| `health.json` | Health check messages |
| `hello.json` | Hello endpoint messages |
| `http.json` | HTTP error messages |
| `notification.json` | Notification messages |
| `pagination.json` | Pagination messages |
| `passwordHistory.json` | Password history messages |
| `policy.json` | Policy messages |
| `request.json` | Request validation messages |
| `role.json` | Role messages |
| `session.json` | Session messages |
| `termPolicy.json` | Terms & policy messages |
| `user.json` | User messages |

Example structure:

```json
// src/languages/en/auth.json
{
    "login": {
        "success": "Login successful",
        "error": {
            "notFound": "Email not found",
            "passwordNotMatch": "Password does not match"
        }
    }
}
```

Access pattern:

```typescript
// Key path: auth.login.success
// Output: "Login successful"

// Key path: auth.login.error.notFound
// Output: "Email not found"
```

## Usage

### Basic Translation

Inject `MessageService` and use `setMessage` method:

```typescript
@Injectable()
export class UserService {
    constructor(private readonly messageService: MessageService) {}

    getWelcomeMessage(): string {
        return this.messageService.setMessage('user.welcome');
    }
}
```

### Filter Language

Use `filterLanguage` to validate if a language is supported before using it:

```typescript
const validLang = this.messageService.filterLanguage('id');
// Returns 'id' if supported, undefined if not
```

### Bulk Import Validation Messages

Use `setValidationImportMessage` to format validation errors for bulk/import operations:

```typescript
const errors = this.messageService.setValidationImportMessage([
    { row: 1, errors: validationErrors }
]);
// Returns: [{ row: 1, errors: [{ key, property, message }] }]
```

### Translation with Variables

Pass variables through the `properties` option:

```json
// src/languages/en/user.json
{
    "greeting": "Hello, {name}!",
    "itemCount": "You have {count} items"
}
```

```typescript
const greeting = this.messageService.setMessage('user.greeting', {
    properties: { name: 'John' }
});
// Output: "Hello, John!"

const itemCount = this.messageService.setMessage('user.itemCount', {
    properties: { count: 5 }
});
// Output: "You have 5 items"
```

### Custom Language

Override default language using the `customLanguage` option:

```typescript
const message = this.messageService.setMessage('user.welcome', {
    customLanguage: 'id' // Indonesian
});
```

Request-specific language can be set via the `x-custom-lang` header:

```typescript
await axios.get('http://localhost:3000/api/users', {
    headers: {
        'x-custom-lang': 'id'
    }
});
```

## Integration

### Exception Filters

Exception filters automatically translate message paths. The exception body follows the `IAppException` interface.

```typescript
throw new BadRequestException({
    statusCode: EnumUserStatusCodeError.emailExist,
    message: 'user.error.emailExists', // Will be translated
});
```

With variables, pass `messageProperties` directly in the exception body:

```typescript
throw new NotFoundException({
    statusCode: EnumUserStatusCodeError.notFound,
    message: 'user.error.notFoundWithId',
    messageProperties: { id: userId },
});
```

### Response Decorator

The `@Response` decorator translates success message paths. See [Response Documentation][ref-doc-response] for details.

```typescript
@Response('user.create')
@Post('/')
async create(@Body() dto: CreateUserRequestDto): Promise<IResponseReturn<UserResponseDto>> {
    const user = await this.userService.create(dto);
    return { data: user };
}
```

With variables, pass `messageProperties` via the `metadata` field on `IResponseReturn`:

```typescript
@Response('user.update')
@Patch('/:id')
async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
): Promise<IResponseReturn<UserResponseDto>> {
    const user = await this.userService.update(id, dto);
    return {
        data: user,
        metadata: {
            messageProperties: { name: user.name },
        },
    };
}
```

### Validation Pipe

Validation errors are automatically translated by `MessageService`. The service handles both flat and nested validation errors by traversing the error tree and extracting constraints at each level. See [Request Validation Documentation][ref-doc-request-validation] for details.

**Message Resolution Strategy:**

1. **Primary**: Tries to resolve message from `request.error.{constraint}` path
2. **Fallback**: If translation not found, uses the raw message from class-validator

**Example message file:**

```json
// src/languages/en/request.json
{
    "error": {
        "isNotEmpty": "{property} should not be empty",
        "isEmail": "{property} must be a valid email",
        "minLength": "{property} must be at least {min} characters"
    }
}
```

**Nested Validation:**

For nested objects, the service return the full property path by traversing child errors:

```typescript
// Input DTO with nested validation
class AddressDto {
    @IsNotEmpty()
    street: string;
}

class UserDto {
    @ValidateNested()
    address: AddressDto;
}

// Validation error output:
{
    "key": "isNotEmpty",
    "property": "address.street",
    "message": "street should not be empty"
}
```

**Standard validation response:**

```typescript
// Automatic transformation
{
    "statusCode": 400,
    "message": "Validation error",
    "errors": [
        {
            "key": "isNotEmpty",
            "property": "email",
            "message": "email should not be empty"
        },
        {
            "key": "isEmail",
            "property": "email",
            "message": "email must be a valid email"
        }
    ]
}
```

## Adding New Language

1. Create a new language directory:

```bash
mkdir -p src/languages/id
```

2. Copy and translate JSON files:

```bash
cp src/languages/en/*.json src/languages/id/
```

3. Update the enum:

```typescript
export enum EnumMessageLanguage {
    en = 'en',
    id = 'id', // Add new language
}
```

4. Restart the application to load new language files.



<!-- REFERENCES -->

[ref-nestjs-i18n]: https://nestjs-i18n.com

[ref-doc-response]: response.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-security-and-middleware]: security-and-middleware.md
