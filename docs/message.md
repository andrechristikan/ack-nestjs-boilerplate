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
  - [Filter Language](#filter-language)
  - [Bulk Import Validation Messages](#bulk-import-validation-messages)
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
// src/configs/message.config.ts
export default registerAs(
    'message',
    (): IConfigMessage => ({
        availableLanguage: Object.values(EnumMessageLanguage),
        language: process.env.APP_LANGUAGE!,
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
| `auth.json` | Authentication messages |
| `aws.json` | AWS service messages |
| `country.json` | Country-related messages |
| `device.json` | Device management messages |
| `doc.json` | API documentation messages |
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
// src/languages/en/user.json
{
    "updateProfile": "User profile updated successfully.",
    "error": {
        "notFound": "Sorry, we couldn't find the user you requested."
    }
}
```

Access pattern:

```typescript
// Key path: user.updateProfile
// Output: "User profile updated successfully."

// Key path: user.error.notFound
// Output: "Sorry, we couldn't find the user you requested."
```

## Usage

### Basic Translation

Inject `MessageService` and use `setMessage` method:

```typescript
@Injectable()
export class UserService {
    constructor(private readonly messageService: MessageService) {}

    getUpdateProfileMessage(): string {
        return this.messageService.setMessage('user.updateProfile');
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
const message = this.messageService.setMessage('user.updateProfile', {
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

`RequestCustomLanguageMiddleware` validates the header against the supported languages and writes the resolved value to the request store under `RequestLanguageStoreKey` (falling back to config `message.language`). Response interceptors and exception filters read it from there to localize messages and set `x-custom-lang`. See [Security and Middleware Documentation][ref-doc-security-and-middleware].

## Integration

### Exception Filters

Exception filters automatically translate message paths. Application errors are dedicated `AppBaseException` subclasses; the filter resolves each exception's `messagePath` against the message system.

```typescript
throw new UserEmailExistException();
// the class internally calls super('user.error.emailExist')
```

With variables, the exception class accepts constructor params and maps them to `messageProperties` internally:

```typescript
throw new UserVerificationEmailResendLimitExceededException(resendIn);
// the class internally calls super('user.error.verificationEmailResendLimitExceeded', { messageProperties: { resendIn } })
```

### Response Decorator

The `@Response` decorator translates success message paths. See [Response Documentation][ref-doc-response] for details.

```typescript
@Response('user.create')
@Post('/create')
async create(
    @Body() body: UserCreateRequestDto,
    @AuthJwtPayload('userId') createdBy: string
): Promise<IResponseReturn<DatabaseIdResponseDto>> {
    return this.userService.createByAdmin(body, createdBy);
}
```

With variables, pass `messageProperties` via the `metadata` field on `IResponseReturn`:

```typescript
@Response('user.updateStatus')
@Patch('/update/:userId/status')
async updateStatus(
    @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
    userId: string,
    @AuthJwtPayload('userId') updatedBy: string,
    @Body() body: UserUpdateStatusRequestDto
): Promise<IResponseReturn<void>> {
    await this.userService.updateStatusByAdmin(userId, body, updatedBy);

    return {
        metadata: {
            messageProperties: { status: body.status },
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
        "isNotEmpty": "{property} cannot be empty.",
        "isEmail": "{property} should be a valid email address.",
        "minLength": "{property} is shorter than the minimum length allowed."
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
    "message": "street cannot be empty."
}
```

**Standard validation response:**

```typescript
// Automatic transformation
{
    "statusCode": 50300,
    "statusCodeKey": "validation",
    "module": "request",
    "message": "There are validation errors.",
    "errors": [
        {
            "key": "isNotEmpty",
            "property": "email",
            "message": "email cannot be empty."
        },
        {
            "key": "isEmail",
            "property": "email",
            "message": "email should be a valid email address."
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
