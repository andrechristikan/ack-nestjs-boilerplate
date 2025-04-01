# Overview

The ACK NestJS Boilerplate provides a robust internationalization (i18n) system that enables your application to support multiple languages. The system is built using NestJS's i18n module with a custom implementation that integrates seamlessly with the application's error handling and response mechanisms.

Internationalization is handled through the `MessageModule` which provides translation services throughout the application. Language detection is primarily done through the `x-custom-lang` header, and all messages are stored in JSON files within the `src/languages` directory.

## Table of Contents

- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Structure](#structure)
  - [Configuration](#configuration)
  - [Language Files](#language-files)
  - [Using the Message Service](#using-the-message-service)
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

The internationalization system is primarily implemented through:

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

The `MessageModule` is set up in a global scope and configured in `message.module.ts`:

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
            controllers: [],
        };
    }
}
```

## Language Files

Language files are stored in the `src/languages` directory, organized by language code:

- `src/languages/en/`
- `src/languages/id/`

Each language directory contains multiple JSON files for different types of messages:

- `auth.json`: Authentication-related messages
- `error.json`: Error messages
- `app.json`: Application-specific messages
- `request.json`: Request validation messages
- `response.json`: Response messages

Here are some real examples from the language files:

**src/languages/en/auth.json:**
```json
{
    "login": {
        "success": "Login success",
        "error": {
            "notFound": "Email not found",
            "passwordNotMatch": "Password not match",
            "inactive": "User inactive"
        }
    },
    "refresh": "Refresh token success",
    "signUp": {
        "success": "Sign up success"
    },
    "signUpAdmin": {
        "success": "Sign up admin success"
    },
    "info": "Auth info success"
}
```

**src/languages/en/request.json:**
```json
{
    "validationInvalid": "Request validation error",
    "validationValidError": "Request data invalid",
    "validationDocumentNotFound": "File needed",
    "validationFileNotFound": "File needed",
    "file": {
        "maxFiles": "Files must be less than {max}",
        "maxSize": "File {file} too large, maximal size {maxSize}",
        "type": "File {file} must be of types {types}"
    }
}
```

**src/languages/en/response.json:**
```json
{
    "default": "Response received",
    "success": "Request success"
}
```

## Using the Message Service

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
const message = this.messageService.get('hello.user', { name: 'John' });
// If 'hello.user' is defined as 'Hello, {name}' it will return 'Hello, John'
```

### Request Validation

The `MessageService` provides functionality to transform validation errors from class-validator into localized error messages:

```typescript
const validationErrors = this.messageService.getValidationMessage(errors);
// Transforms validation errors to localized messages
```

This method accepts errors that follow the interface from class-validator's `ValidationError` and transforms them into a structured format with translated messages. The method handles both simple validation errors and nested validation structures. 

### Import Validation Messages

The `setValidationImportMessage` method is specifically designed to handle validation errors during file import operations. This is commonly used when validating CSV files being imported into the system.

```typescript
const importErrors = this.messageService.setValidationImportMessage(errors, options);
// Transforms import validation errors to localized messages
```

This method takes import validation errors that conform to the `IMessageValidationImportErrorParam` interface, which extends the standard class-validator structure but includes additional properties specific to file imports, such as row numbers and field identifiers.

The interface for import validation errors follows this structure:

```typescript
interface IMessageValidationImportErrorParam {
    row: number;
    file?: string;
    errors: ValidationError[];
}
```

This functionality is particularly useful for providing detailed, localized feedback when processing bulk imports, helping users to identify and correct errors in their imported data.

## Integration with Error Handling

The i18n system is tightly integrated with the error handling mechanism. All exception filters in the application use the `MessageService` to translate error messages based on the detected language from request headers.

The application uses several specialized exception filters, each handling different types of errors:

- **AppHttpFilter**: Handles standard HTTP exceptions
- **AppValidationFilter**: Processes validation errors
- **AppValidationImportFilter**: Manages file import validation errors
- **AppGeneralFilter**: Catches all unhandled exceptions

Each filter extracts the language from the request and uses the `MessageService` to localize error messages:

```typescript
// Example from AppHttpFilter
async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const request: IRequestApp = ctx.getRequest<IRequestApp>();
    
    // Get language from request
    const xLanguage: string = request.__language ?? 
        this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');
    
    // Translate the error message
    const message: string = this.messageService.setMessage(messagePath, {
        customLanguage: xLanguage,
        properties: messageProperties,
    });
    
    // Return localized error response
    const responseBody: IAppException = {
        statusCode,
        message,
        _metadata: metadata,
        data,
    };
    
    // ...rest of the handler
}
```

When throwing exceptions in your controllers or services, you can specify message keys that will be translated:

```typescript
// Throwing an exception with translated message and variables
throw new BadRequestException({
    statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS,
    message: 'user.error.emailExists',
    _metadata: {
        customProperty: {
            messageProperties: {
                email: 'test@example.com'
            }
        },
    }
});
```

The error filters will use the specified message key to look up the appropriate translation in the language files based on the client's preferred language.

For internal server errors, the application typically uses:

```typescript
throw new InternalServerErrorException({
    statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
    message: 'http.serverError.internalServerError',
    _error: err.message,
});
```

The integration with internationalization ensures that all error messages are consistent and properly localized regardless of where they originate in the application.

## Integration with Response Decorator

The Response decorator integrates with the i18n system by using message keys:

```typescript
@Response('user.create')
@Post('/')
async create(@Body() dto: CreateUserDto): Promise<IResponse> {
    const user = await this.userService.create(dto);
    return user;
}
```

Here, `'user.create'` is a key in the language files that will be translated based on the request's language.

## Custom Properties

Both error filters and response decorators support custom properties that can modify the behavior of the response.

### in Error Filters

Error filters can include custom properties to override default behavior:

```typescript
throw new BadRequestException({
    statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS,
    message: 'user.error.emailExists',
    _metadata: {
        customProperty: {
            messageProperties: {
                // Some extra information
            }
        },
    }
});
```

### in Response Decorators

Response decorators can also include custom properties:

```typescript
@Response('user.create')
@Post('/')
async create(@Body() dto: CreateUserDto): Promise<IResponse> {
    const user = await this.userService.create(dto);
    
    return {
        data: user,
        _metadata: {
            customProperty: {
                messageProperties: {
                    // Some extra information
                }
            },
        }
    };
}
```

## Adding a New Language

To add a new language to the application:

1. Create a new directory under `src/languages` with the language code (e.g., `fr` for French)
2. Copy all JSON files from an existing language directory (e.g., `en`)
3. Translate all message values in the copied JSON files
4. Add the new language code to the `ENUM_MESSAGE_LANGUAGE` enum in the configuration
5. Restart the application to load the new language files

## Examples

### Translating Simple Messages

**Language File (en/common.json):**
```json
{
    "welcome": "Welcome to our application",
    "greeting": "Hello, {name}!"
}
```

**Usage in Service:**
```typescript
@Injectable()
export class GreetingService {
    constructor(private readonly messageService: MessageService) {}

    getWelcome(): string {
        return this.messageService.get('common.welcome');
    }

    greetUser(name: string): string {
        return this.messageService.get('common.greeting', { name });
    }
}
```

### Working with Error Messages

**Language File (en/user.json):**
```json
{
    "error": {
        "notFound": "User not found",
        "alreadyExists": "User with email {email} already exists"
    }
}
```

**Usage in Controller:**
```typescript
@Controller('users')
export class UserController {
    constructor(
        private readonly userService: UserService
    ) {}

    @Get(':id')
    async findById(@Param('id') id: string): Promise<IResponse> {
        const user = await this.userService.findById(id);
        if (!user) {
            throw new NotFoundException({
                message: 'user.error.notFound',
                statusCode: ENUM_USER_STATUS_CODE.USER_NOT_FOUND
            });
        }
        return user;
    }
}
```

### Using with Response Decorator

**Language File (en/user.json):**
```json
{
    "create": "User successfully created",
    "update": "User successfully updated"
}
```

**Usage in Controller:**
```typescript
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Response('user.create')
    @Post('/')
    async create(@Body() dto: CreateUserDto): Promise<IResponse> {
        const user = await this.userService.create(dto);
        
        return {
            data: user,
        };
    }
}
```

This response will include the translated "User successfully created" message in the language specified by the `x-custom-lang` header.
