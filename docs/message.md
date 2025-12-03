# Message Documentation

## Overview

Message Service provides internationalization (i18n) support using [nestjs-i18n][ref-nestjs-i18n] to manage multi-language messages. All message files are stored in `src/languages/{language}` directory in JSON format. Currently, only English (`en`) is available.

The `MessageModule` is imported globally via `CommonModule` in `src/common/common.module.ts`, making `MessageService` available throughout the application without additional imports.

## Related Documents

- [Response][ref-doc-response] - For response integration with message service
- [Handling Error][ref-doc-handling-error] - For exception filter integration
- [Request Validation][ref-doc-request-validation] - For validation message translation

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
        availableLanguage: Object.values(ENUM_MESSAGE_LANGUAGE),
        language: process.env.APP_LANGUAGE ?? ENUM_MESSAGE_LANGUAGE.EN,
    })
);
```

Language options are defined in the enum:

```typescript
export enum ENUM_MESSAGE_LANGUAGE {
    EN = 'en',
}
```

## Message Files

Message files use JSON format with nested structure. Key paths follow the pattern: `filename.field.nested`.

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
import { Injectable } from '@nestjs/common';
import { MessageService } from '@common/message/services/message.service';

@Injectable()
export class UserService {
    constructor(private readonly messageService: MessageService) {}

    getWelcomeMessage(): string {
        return this.messageService.setMessage('user.welcome');
    }
}
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

Exception filters automatically translate message paths. See [Error Handling Documentation][ref-doc-handling-error] for details.

```typescript
throw new BadRequestException({
    statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS,
    message: 'user.error.emailExists', // Will be translated
});
```

With variables:

```typescript
throw new NotFoundException({
    statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND,
    message: 'user.error.notFoundWithId',
    _metadata: {
        customProperty: {
            messageProperties: { id: userId }
        }
    }
});
```

### Response Decorator

The `@Response` decorator translates success message paths. See [Response Documentation][ref-doc-response] for details.

```typescript
@Response('user.create')
@Post('/')
async create(@Body() dto: CreateUserDto): Promise<IResponse> {
    const user = await this.userService.create(dto);
    return { data: user };
}
```

With variables:

```typescript
@Response('user.update')
@Patch('/:id')
async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
): Promise<IResponse> {
    const user = await this.userService.update(id, dto);
    return {
        data: user,
        _metadata: {
            customProperty: {
                messageProperties: { name: user.name }
            }
        }
    };
}
```

### Validation Pipe

Validation errors are automatically translated by `MessageService`. See [Request Validation Documentation][ref-doc-request-validation] for details.

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

The validation pipe transforms class-validator errors into localized messages:

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
export enum ENUM_MESSAGE_LANGUAGE {
    EN = 'en',
    ID = 'id', // Add new language
}
```

4. Restart the application to load new language files.

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
[ref-nestjs-i18n]: https://nestjs-i18n.com
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
[ref-doc-activity-log]: docs/activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-file-upload]: docs/file-upload.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-logger]: docs/logger.md
[ref-doc-message]: docs/message.md
[ref-doc-pagination]: docs/pagination.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-doc]: docs/doc.md
[ref-doc-third-party-integration]: docs/third-party-integration.md
