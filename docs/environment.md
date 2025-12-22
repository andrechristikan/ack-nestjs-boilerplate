# Environment Documentation

This documentation explains **Environment**: Located at `.env.example`

## Overview

This document provides a comprehensive guide to configuring the ACK NestJS Boilerplate using environment variables. The project uses a `.env` file to store all configuration settings including database connections, authentication, AWS services, and other application settings.

All environment variables are validated using the `AppEnvDto` class to ensure required variables are present and properly formatted before the application starts.

## Related Documents

- [Configuration Documentation][ref-doc-configuration] - For understanding how environment variables map to configurations
- [Installation Documentation][ref-doc-installation] - For initial setup and environment file creation
- [Database Documentation][ref-doc-database] - For database connection details
- [Authentication Documentation][ref-doc-authentication] - For JWT and OAuth configuration

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Environment Validation](#environment-validation)
- [Example Configuration](#example-configuration)
- [Environment Variables](#environment-variables)
  - [Application Settings](#application-settings)
  - [Home/Organization Settings](#homeorganization-settings)
  - [HTTP Server Settings](#http-server-settings)
  - [Logging Settings](#logging-settings)
  - [Middleware Settings](#middleware-settings)
  - [URL Versioning Settings](#url-versioning-settings)
  - [Database Settings](#database-settings)
  - [Authentication Settings](#authentication-settings)
  - [Social Authentication Settings](#social-authentication-settings)
  - [Two-Factor Authentication Settings](#two-factor-authentication-settings)
  - [AWS Settings](#aws-settings)
  - [Redis Settings](#redis-settings)
  - [Debug Settings](#debug-settings)

## Environment Validation

Environment variables are validated using the `AppEnvDto` class with `class-validator` decorators. This validation occurs in `src/main.ts` during application bootstrap:

```typescript
// Validate environment variables
const classEnv = plainToInstance(AppEnvDto, process.env);
const errors = await validate(classEnv);
if (errors.length > 0) {
    const messageService = app.get(MessageService);
    const errorsMessage = messageService.setValidationMessage(errors);
    
    logger.error(
        `Env Variable Invalid: ${JSON.stringify(errorsMessage)}`,
        'NestApplication'
    );
    
    throw new Error('Env Variable Invalid', {
        cause: errorsMessage,
    });
}
```

The `AppEnvDto` class is located at `src/app/dtos/app.env.dto.ts`.
If validation fails, the application will not start and will display detailed error messages showing which environment variables are missing or invalid.

## Example Configuration

Below is an example `.env` file based on the current `.env.example`:

```bash
# Application Settings
APP_NAME=ACKNestJs
APP_ENV=local
APP_LANGUAGE=en
APP_TIMEZONE=Asia/Jakarta

# Home/Organization
HOME_URL=https://example.id
HOME_NAME=ACKNestJs

# HTTP Server
HTTP_HOST=localhost
HTTP_PORT=3000

# Logging
LOGGER_ENABLE=true
LOGGER_LEVEL=debug
LOGGER_INTO_FILE=true
LOGGER_PRETTIER=true
LOGGER_AUTO=false

# Middleware
MIDDLEWARE_CORS_ORIGIN=*

# URL Versioning
URL_VERSIONING_ENABLE=true
URL_VERSION=1

# Database
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?retryWrites=true&w=majority&replicaSet=rs0
DATABASE_DEBUG=true

# JWT Authentication
AUTH_JWT_ISSUER=https://example.id
AUTH_JWT_AUDIENCE=ACKNestJs

# Access Token Configuration
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=http://localhost:3011/.well-known/access-jwks.json
AUTH_JWT_ACCESS_TOKEN_KID=ack-access-2024-001
AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY=qwerty1234567890
AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY=qwerty1234567890
AUTH_JWT_ACCESS_TOKEN_EXPIRED=1h

# Refresh Token Configuration
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=http://localhost:3011/.well-known/refresh-jwks.json
AUTH_JWT_REFRESH_TOKEN_KID=ack-refresh-2024-001
AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY=qwerty1234567890
AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY=qwerty1234567890
AUTH_JWT_REFRESH_TOKEN_EXPIRED=30d

# Social Authentication (Optional)
AUTH_SOCIAL_GOOGLE_CLIENT_ID=
AUTH_SOCIAL_GOOGLE_CLIENT_SECRET=
AUTH_SOCIAL_APPLE_CLIENT_ID=
AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID=

# AWS Configuration (Optional)
AWS_S3_CREDENTIAL_KEY=
AWS_S3_CREDENTIAL_SECRET=
AWS_S3_REGION=ap-southeast-3
AWS_S3_PUBLIC_BUCKET=
AWS_S3_PUBLIC_CDN=
AWS_S3_PRIVATE_BUCKET=
AWS_S3_PRIVATE_CDN=
AWS_SES_CREDENTIAL_KEY=
AWS_SES_CREDENTIAL_SECRET=
AWS_SES_REGION=ap-southeast-3

# Redis
CACHE_REDIS_URL=redis://localhost:6379/0
QUEUE_REDIS_URL=redis://localhost:6379/1

# Two-Factor Authentication
AUTH_TWO_FACTOR_ISSUER=ACK
AUTH_TWO_FACTOR_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# Debug (Optional)
SENTRY_DSN=
```

## Environment Variables

All environment variables are validated using the `AppEnvDto` class to ensure required variables are present and properly formatted. Below is a detailed explanation of each variable:

### Application Settings

**`APP_NAME`** *(required)*  
The name of your application. Used throughout the system for identification.
```bash
APP_NAME=ACKNestJs
```

**`APP_ENV`** *(required)*  
The environment the application is running in. Possible values: `development`, `staging`, `production`, `local`
```bash
APP_ENV=local
```

**`APP_LANGUAGE`** *(required)*  
Default language for the application. Supported: `en`, `id`
```bash
APP_LANGUAGE=en
```

**`APP_TIMEZONE`** *(required)*  
Default timezone for date operations. Example: `Asia/Jakarta`, `UTC`
```bash
APP_TIMEZONE=Asia/Jakarta
```

### Home/Organization Settings

**`HOME_NAME`** *(required)*  
Display name for your organization/home page.
```bash
HOME_NAME=ACKNestJs
```

**`HOME_URL`** *(required)*  
URL for your home/landing page.
```bash
HOME_URL=https://example.id
```

### HTTP Server Settings

**`HTTP_HOST`** *(required)*  
Host/IP address for the HTTP server.
```bash
HTTP_HOST=localhost
```

**`HTTP_PORT`** *(required)*  
Port number for the HTTP server.
```bash
HTTP_PORT=3000
```

### Logging Settings

**`LOGGER_ENABLE`** *(required)*  
Enable or disable application logging.
```bash
LOGGER_ENABLE=true
```

**`LOGGER_LEVEL`** *(required)*  
Logging level using Pino logger. Options: `silent`, `trace`, `debug`, `info`, `warn`, `error`, `fatal`
```bash
LOGGER_LEVEL=debug
```

**`LOGGER_INTO_FILE`** *(required)*  
Whether to write logs to files.
```bash
LOGGER_INTO_FILE=true
```

**`LOGGER_PRETTIER`** *(required)*  
Whether to format logs in a prettier, readable way.
```bash
LOGGER_PRETTIER=true
```

**`LOGGER_AUTO`** *(required)*  
Enable automatic logging features.
```bash
LOGGER_AUTO=false
```

### Middleware Settings

**`MIDDLEWARE_CORS_ORIGIN`** *(required)*  
Comma-separated list of allowed CORS origins. Supports subdomain wildcards but not port wildcards.

**Examples:**
```bash
# Allow all origins (development only)
MIDDLEWARE_CORS_ORIGIN=*

# Specific origins
MIDDLEWARE_CORS_ORIGIN=example.com,app.example.com

# Subdomain wildcard (supported)
MIDDLEWARE_CORS_ORIGIN=*.example.com,api.myapp.com

# Multiple domains with subdomains
MIDDLEWARE_CORS_ORIGIN=*.example.com,*.myapp.com,localhost:3000
```

> **Note**: While subdomain wildcards (`*.example.com`) are supported, port wildcards (`example.com:*`) are not supported. Specify exact ports when needed.

### URL Versioning Settings

**`URL_VERSIONING_ENABLE`** *(required)*  
Enable URL versioning for your API (e.g., `/api/v1/users`).
```bash
URL_VERSIONING_ENABLE=true
```

**`URL_VERSION`** *(required)*  
Default API version number.
```bash
URL_VERSION=1
```

### Database Settings

**`DATABASE_URL`** *(required)*  
MongoDB connection string. Must include replica set for transactions.
```bash
# Local MongoDB with replica set
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?retryWrites=true&w=majority&replicaSet=rs0

# MongoDB Atlas example
# DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/ACKNestJs
```

**`DATABASE_DEBUG`** *(required)*  
Enable database debug mode to log all queries.
```bash
DATABASE_DEBUG=true
```

### Authentication Settings

**`AUTH_JWT_ISSUER`** *(required)*  
JWT issuer claim value (usually your domain).
```bash
AUTH_JWT_ISSUER=https://example.id
```

**`AUTH_JWT_AUDIENCE`** *(required)*  
JWT audience claim value (usually your application name).
```bash
AUTH_JWT_AUDIENCE=ACKNestJs
```

#### Access Token Settings

**`AUTH_JWT_ACCESS_TOKEN_JWKS_URI`** *(required)*  
Public URI where access token JWKS is hosted.
```bash
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=http://localhost:3011/.well-known/access-jwks.json
```

**`AUTH_JWT_ACCESS_TOKEN_KID`** *(required)*  
Key ID for access token. Generated automatically by `pnpm generate:keys`.
```bash
AUTH_JWT_ACCESS_TOKEN_KID=ack-access-2024-001
```

**`AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY`** *(required)*  
Private key content for signing access tokens.
```bash
AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY=qwerty1234567890
```

**`AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY`** *(required)*  
Public key content for verifying access tokens.
```bash
AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY=qwerty1234567890
```

**`AUTH_JWT_ACCESS_TOKEN_EXPIRED`** *(required)*  
Access token expiration time. Format: `1h`, `30m`, `2d`
```bash
AUTH_JWT_ACCESS_TOKEN_EXPIRED=1h
```

#### Refresh Token Settings

**`AUTH_JWT_REFRESH_TOKEN_JWKS_URI`** *(required)*  
Public URI where refresh token JWKS is hosted.
```bash
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=http://localhost:3011/.well-known/refresh-jwks.json
```

**`AUTH_JWT_REFRESH_TOKEN_KID`** *(required)*  
Key ID for refresh token. Generated automatically by `pnpm generate:keys`.
```bash
AUTH_JWT_REFRESH_TOKEN_KID=ack-refresh-2024-001
```

**`AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY`** *(required)*  
Private key content for signing refresh tokens.
```bash
AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY=qwerty1234567890
```

**`AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY`** *(required)*  
Public key content for verifying refresh tokens.
```bash
AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY=qwerty1234567890
```

**`AUTH_JWT_REFRESH_TOKEN_EXPIRED`** *(required)*  
Refresh token expiration time. Format: `7d`, `30d`, `90d`
```bash
AUTH_JWT_REFRESH_TOKEN_EXPIRED=30d
```

### Social Authentication Settings

> **Note**: All social authentication settings are optional. Leave empty if not using social login.

**`AUTH_SOCIAL_GOOGLE_CLIENT_ID`** *(optional)*  
Google OAuth client ID.
```bash
AUTH_SOCIAL_GOOGLE_CLIENT_ID=
```

**`AUTH_SOCIAL_GOOGLE_CLIENT_SECRET`** *(optional)*  
Google OAuth client secret.
```bash
AUTH_SOCIAL_GOOGLE_CLIENT_SECRET=
```

**`AUTH_SOCIAL_APPLE_CLIENT_ID`** *(optional)*  
Apple OAuth client ID.
```bash
AUTH_SOCIAL_APPLE_CLIENT_ID=
```

**`AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID`** *(optional)*  
Apple Sign In client ID.
```bash
AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID=
```

### Two-Factor Authentication Settings

**`AUTH_TWO_FACTOR_ISSUER`** *(optional)*  
Issuer name displayed in authenticator apps.  
```bash
AUTH_TWO_FACTOR_ISSUER=ACK
```

**`AUTH_TWO_FACTOR_ENCRYPTION_KEY`** *(required for 2FA)*  
Secret used to derive an AES-256 key for encrypting TOTP secrets (recommended 32+ chars).  
```bash
AUTH_TWO_FACTOR_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
```

### AWS Settings

> **Note**: AWS settings are optional by default. However, if you want to test file uploads (S3) or email functionality (SES), these become required for those specific features to work.

#### S3 Configuration
**`AWS_S3_CREDENTIAL_KEY`** *(optional/required for file uploads)*  
AWS access key for S3 bucket operations.
```bash
AWS_S3_CREDENTIAL_KEY=
```

**`AWS_S3_CREDENTIAL_SECRET`** *(optional/required for file uploads)*  
AWS secret key for S3 bucket operations.
```bash
AWS_S3_CREDENTIAL_SECRET=
```

**`AWS_S3_REGION`** *(optional/required for file uploads)*  
AWS region for S3 services.
```bash
AWS_S3_REGION=ap-southeast-3
```

**`AWS_S3_PUBLIC_BUCKET`** *(optional/required for file uploads)*  
Name of the public S3 bucket for file storage.
```bash
AWS_S3_PUBLIC_BUCKET=
```

**`AWS_S3_PUBLIC_CDN`** *(optional)*  
CloudFront CDN URL for public bucket.
```bash
AWS_S3_PUBLIC_CDN=
```

#### S3 Private Bucket (for private files)
**`AWS_S3_PRIVATE_BUCKET`** *(optional/required for private file uploads)*  
Name of the private S3 bucket for secure file storage.
```bash
AWS_S3_PRIVATE_BUCKET=
```

**`AWS_S3_PRIVATE_CDN`** *(optional)*  
CloudFront CDN URL for private bucket.
```bash
AWS_S3_PRIVATE_CDN=
```

#### SES (Email Service)
**`AWS_SES_CREDENTIAL_KEY`** *(optional/required for email features)*  
AWS access key for SES email service.
```bash
AWS_SES_CREDENTIAL_KEY=
```

**`AWS_SES_CREDENTIAL_SECRET`** *(optional/required for email features)*  
AWS secret key for SES email service.
```bash
AWS_SES_CREDENTIAL_SECRET=
```

**`AWS_SES_REGION`** *(optional/required for email features)*  
AWS region for SES service.
```bash
AWS_SES_REGION=ap-southeast-3
```

### Redis Settings

**`CACHE_REDIS_URL`** *(required)*  
Redis URL for caching operations.
```bash
CACHE_REDIS_URL=redis://localhost:6379/0
```

**`QUEUE_REDIS_URL`** *(required)*  
Redis URL for queue operations (background jobs).
```bash
QUEUE_REDIS_URL=redis://localhost:6379/1
```

### Debug Settings

**`SENTRY_DSN`** *(optional)*  
Sentry DSN for error tracking and monitoring.
```bash
SENTRY_DSN=
```



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
