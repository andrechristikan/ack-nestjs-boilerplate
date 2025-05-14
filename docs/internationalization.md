# Overview

The ACK NestJS Boilerplate provides a robust internationalization (i18n) system that enables your application to support multiple languages. The system is built using NestJS's i18n module with a custom implementation that integrates seamlessly with the application's error handling and response mechanisms.

This documentation explains the features and usage of:
- **Message Module**: Located at `src/common/message`
- **Language Files**: Located at `src/languages`

Internationalization is handled through the `MessageModule` which provides translation services throughout the application. Language detection is primarily done through the `x-custom-lang` header, and all messages are stored in JSON files within the `src/languages` directory.

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Structure](#structure)
  - [Configuration](#configuration)
  - [Language Files](#language-files)
  - [Service](#service)
    - [Basic Translation](#basic-translation)
    - [Translation with Variables](#translation-with-variables)
    - [Request Validation](#request-validation)
    - [Import Validation Messages](#import-validation-messages)
  - [Integration with Error Handling](#integration-with-error-handling)
  - [Integration with Response Decorator](#integration-with-response-decorator)
  - [Custom Properties](#custom-properties)
    - [in Error Filters](#in-error-filters)
    - [in Response Decorators](#in-response-decorators)
  - [Adding a New Language](#adding-a-new-language)
  - [Examples](#examples)
    - [Translating Simple Messages](#translating-simple-messages)
    - [Working with Error Messages](#working-with-error-messages)
    - [Using with Response Decorator](#using-with-response-decorator)

## Structure

The internationalization system consists of:

- **MessageModule**: Global module that sets up the i18n system
- **MessageService**: Service that provides translation methods
- **Language Files**: JSON files containing translations for each supported language
- **Custom Language Middleware**: Extracts the preferred language from request headers

## Configuration

Internationalization configuration is defined in the application's configuration files:

```typescript
export default (): AppLanguage => ({
    message: {
        language: ENUM_MESSAGE_LANGUAGE.EN,
        availableLanguage: Object.values(ENUM_MESSAGE_LANGUAGE),
    },
});
```

The `MessageModule` is set up as a global module:

```typescript
@Global()
@Module({})
export class MessageModule {
    static forRoot(): DynamicModule {
        return {
            module: MessageModule,
            providers: [MessageService],
            exports: [MessageService],
            imports: [
                I18nModule.forRootAsync({
                    loader: I18nJsonLoader,
                    inject: [ConfigService],
                    resolvers: [new HeaderResolver(['x-custom-lang'])],
                    useFactory: (configService: ConfigService) => ({
                        fallbackLanguage: configService
                            .get<string[]>('message.availableLanguage')
                            .join(','),
                        fallbacks: Object.values(ENUM_MESSAGE_LANGUAGE).reduce(
                            (a, v) => ({ ...a, [`${v}-*`]: v }),
                            {}
                        ),
                        loaderOptions: {
                            path: path.join(__dirname, '../../languages'),
                            watch: true,
                        },
                    }),
                }),
            ],
        };
    }
}
```

## Language Files

Language files are stored in the `src/languages` directory, organized by language code:

- `src/languages/en/` - English translations
- `src/languages/id/` - Indonesian translations

Key language files include:

```json
// src/languages/en/auth.json
{
    "login": {
        "success": "Login success",
        "error": {
            "notFound": "Email not found",
            "passwordNotMatch": "Password not match"
        }
    }
}

// src/languages/en/request.json
{
    "validationInvalid": "Request validation error",
    "file": {
        "maxFiles": "Files must be less than {max}"
    }
}
```

## Service

The `MessageService` provides several methods for translating messages:

### Basic Translation

```typescript
@Injectable()
export class SampleService {
    constructor(private readonly messageService: MessageService) {}

    getWelcomeMessage(): string {
        return this.messageService.get('welcome.message');
    }
}
```

### Translation with Variables

```typescript
// If 'hello.user' is defined as 'Hello, {name}!' 
const message = this.messageService.get('hello.user', { name: 'John' });
// Output: "Hello, John!"
```

### Request Validation

Transform validation errors to localized messages:

```typescript
const validationErrors = this.messageService.getValidationMessage(errors);
```

### Import Validation Messages

Handle file import validation errors:

```typescript
const importErrors = this.messageService.setValidationImportMessage(errors, {
    customLanguage: 'en'
});
```

## Integration with Error Handling

Exception filters use the `MessageService` to translate error messages:

```typescript
// Example from AppHttpFilter
async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
    // Get language from request
    const xLanguage: string = request.__language ?? 
        this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');
    
    // Translate error message
    const message: string = this.messageService.setMessage(messagePath, {
        customLanguage: xLanguage,
        properties: messageProperties,
    });
    
    // Return localized response
    const responseBody = {
        statusCode,
        message,
        _metadata: metadata,
    };
}
```

## Integration with Response Decorator

The Response decorator supports i18n message keys:

```typescript
@Response('user.create') // Key from language files
@Post('/')
async create(@Body() dto: CreateUserDto): Promise<IResponse> {
    const user = await this.userService.create(dto);
    return { data: user };
}
```

## Custom Properties

### in Error Filters

```typescript
throw new BadRequestException({
    statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS,
    message: 'user.error.emailExists',
    _metadata: {
        customProperty: {
            messageProperties: { email: 'test@example.com' }
        },
    }
});
```

### in Response Decorators

```typescript
return {
    data: user,
    _metadata: {
        customProperty: {
            messageProperties: { /* variables */ }
        },
    }
};
```

## Adding a New Language

To add a new language:

1. Create a directory under `src/languages/` with the language code (e.g., `fr`)
2. Copy and translate JSON files from an existing language directory
3. Add the language code to `ENUM_MESSAGE_LANGUAGE` enum
4. Restart the application

## Examples

### Translating Simple Messages

```typescript
// Language file (en/common.json)
{
    "welcome": "Welcome to our application",
    "greeting": "Hello, {name}!"
}

// Usage
const welcome = this.messageService.get('common.welcome');
const greeting = this.messageService.get('common.greeting', { name: 'User' });
```

### Working with Error Messages

```typescript
// When throwing an exception
throw new NotFoundException({
    message: 'user.error.notFound', // Will be translated
    statusCode: ENUM_USER_STATUS_CODE.USER_NOT_FOUND
});
```

### Using with Response Decorator

```typescript
@Response('user.create') // Will be translated to "User successfully created"
@Post('/')
async create(@Body() dto: CreateUserDto): Promise<IResponse> {
    const user = await this.userService.create(dto);
    return { data: user };
}
```
