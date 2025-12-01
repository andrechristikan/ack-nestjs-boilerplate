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
[ref-doc-message]: docs/message.md
[ref-doc-logger]: docs/logger.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-service-side-pagination]: docs/service-side-pagination.md
[ref-doc-third-party-integration]: docs/third-party-integration.md

<!-- # Overview

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
``` -->
