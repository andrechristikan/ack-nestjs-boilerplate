# Configuration Documentation

> This documentation explains the features and usage of **Config Module**: Located at `src/configs`

## Overview

This document provides a detailed explanation of how configuration works in the ACK NestJS Boilerplate project, including the configuration files structure and their interfaces.

The project uses a modular configuration approach through the NestJS `ConfigModule`. Configuration is split into multiple dedicated files for different aspects of the application, making it easier to maintain and understand.

## Related Documents

- [Environment Documentation][ref-doc-environment] - For detailed environment variable configuration and validation
- [Database Documentation][ref-doc-database] - For database configuration usage
- [Cache Documentation][ref-doc-cache] - For Redis configuration usage

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Configuration Principles](#configuration-principles)
- [Configuration Structure](#configuration-structure)
- [App Configuration](#app-configuration)
- [Auth Configuration](#auth-configuration)
- [Database Configuration](#database-configuration)
- [AWS Configuration](#aws-configuration)
- [Logger Configuration](#logger-configuration)
- [Request Configuration](#request-configuration)
- [Redis Configuration](#redis-configuration)
- [User Configuration](#user-configuration)
- [Documentation Configuration](#documentation-configuration)
- [Message Configuration](#message-configuration)
- [Email Configuration](#email-configuration)
- [Verification Configuration](#verification-configuration)
- [Forgot Password Configuration](#forgot-password-configuration)
- [Home Configuration](#home-configuration)
- [Session Configuration](#session-configuration)
- [Term Policy Configuration](#term-policy-configuration)
- [Feature Flag Configuration](#feature-flag-configuration)
- [Response Configuration](#response-configuration)
- [Conclusion](#conclusion)

## Configuration Structure

All configuration files are located in the `src/configs` directory. Each configuration module uses the `registerAs` function from `@nestjs/config` and provides a TypeScript interface for type safety.

The configuration modules are imported and registered in `src/configs/index.ts` as an array and this configuration array is then loaded in `src/common/common.module.ts`:

```typescript
import configs from '@config';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: configs,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env', `.env.${process.env.NODE_ENV ?? 'local'}`],
            expandVariables: false,
        }),
        // ... other modules
    ],
})
export class CommonModule {}
```

### App Configuration

**File**: `src/configs/app.config.ts`
**Interface**: `IConfigApp`

This configuration handles the core application settings including environment details, versioning, and server configuration.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`name`** - Application name used throughout the system
```typescript
name: string
```

**`env`** - Current environment (development, production, staging, local)
```typescript
env: ENUM_APP_ENVIRONMENT
```

**`timezone`** - Default timezone for date operations
```typescript
timezone: string
```

**`version`** - Application version from package.json
```typescript
version: string
```

**`author`** - Author information from package.json
```typescript
author: {
  name: string;                   // Author name
  email: string;                  // Author email
}
```

**`url`** - Repository URL from package.json
```typescript
url: string
```

**`globalPrefix`** - Global API prefix (default: '/api')
```typescript
globalPrefix: string
```

**`http`** - HTTP server configuration
```typescript
http: {
  host: string;                   // Server host address
  port: number;                   // Server port number
}
```

**`urlVersion`** - API versioning configuration
```typescript
urlVersion: {
  enable: boolean;                // Enable URL versioning
  prefix: string;                 // Version prefix (default: 'v')
  version: string;                // Default API version
}
```

### Auth Configuration

**File**: `src/configs/auth.config.ts`
**Interface**: `IConfigAuth`

This configuration manages JWT authentication settings including token configuration, password policies, and social authentication.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`jwt`** - JWT authentication configuration
```typescript
jwt: {
  accessToken: {
    jwksUri: string;              // JWKS URI for access token
    kid: string;                  // Key ID for access token
    algorithm: Algorithm;         // JWT algorithm (ES256, ES512, etc.)
    privateKey: string;           // Private key for token signing
    publicKey: string;            // Public key for token verification
    expirationTimeInSeconds: number; // Token expiration in seconds
  };
  refreshToken: {
    jwksUri: string;              // JWKS URI for refresh token
    kid: string;                  // Key ID for refresh token
    algorithm: Algorithm;         // JWT algorithm
    privateKey: string;           // Private key for token signing
    publicKey: string;            // Public key for token verification
    expirationTimeInSeconds: number; // Token expiration in seconds
  };
  audience: string;               // JWT audience claim
  issuer: string;                 // JWT issuer claim
  header: string;                 // HTTP header for JWT (default: 'Authorization')
  prefix: string;                 // Token prefix (default: 'Bearer')
}
```

**`password`** - Password policy configuration
```typescript
password: {
  attempt: boolean;               // Enable login attempt tracking
  maxAttempt: number;             // Maximum failed login attempts
  saltLength: number;             // Salt length for password hashing
  expiredInSeconds: number;       // Password expiration time
  expiredTemporaryInSeconds: number; // Temporary password expiration
  periodInSeconds: number;        // Password renewal period
}
```

**`apple`** - Apple OAuth configuration
```typescript
apple: {
  header: string;                 // HTTP header for Apple auth
  prefix: string;                 // Token prefix for Apple auth
  clientId?: string;              // Apple OAuth client ID
  signInClientId?: string;        // Apple Sign In client ID
}
```

**`google`** - Google OAuth configuration
```typescript
google: {
  header: string;                 // HTTP header for Google auth
  prefix: string;                 // Token prefix for Google auth
  clientId?: string;              // Google OAuth client ID
  clientSecret?: string;          // Google OAuth client secret
}
```

**`xApiKey`** - API Key authentication configuration
```typescript
xApiKey: {
  header: string;                 // HTTP header for API key
  cachePrefixKey: string;         // Cache prefix for API keys
}
```

### Database Configuration

**File**: `src/configs/database.config.ts`
**Interface**: `IConfigDatabase`

This configuration manages database connection settings for MongoDB.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`url`** - Database connection string
```typescript
url: string                     // MongoDB connection URL
```

**`debug`** - Database debug mode
```typescript
debug: boolean                  // Enable/disable database query logging
```

### AWS Configuration

**File**: `src/configs/aws.config.ts`
**Interface**: `IConfigAws`

This configuration handles AWS service integration including S3 and SES services.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`s3`** - S3 service configuration
```typescript
s3: {
  presignExpired: number;         // Presigned URL expiration time in seconds
  region?: string;                // AWS region for S3
  credential: {
    key?: string;                 // AWS access key
    secret?: string;              // AWS secret key
  };
  config: {
    public: {
      bucket?: string;            // Public S3 bucket name
      baseUrl?: string;           // S3 base URL
      cdnUrl?: string;            // CDN URL if available
    };
    private: {
      bucket?: string;            // Private S3 bucket name
      baseUrl?: string;           // S3 base URL
      cdnUrl?: string;            // CDN URL if available
    };
  };
}
```

**`ses`** - Simple Email Service configuration
```typescript
ses: {
  credential: {
    key?: string;                 // AWS access key for SES
    secret?: string;              // AWS secret key for SES
  };
  region: string;                 // AWS region for SES
}
```

### Logger Configuration

**File**: `src/configs/logger.config.ts`
**Interface**: `IConfigDebug`

This configuration manages logging settings using Pino logger with customizable log levels and formatting.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`enable`** - Enable/disable logging
```typescript
enable: boolean                 // Turn logging on/off
```

**`level`** - Log level configuration
```typescript
level: string                   // Log levels: silent, trace, debug, info, warn, error, fatal
```

**`intoFile`** - File logging option
```typescript
intoFile: boolean               // Whether to write logs to files
```

**`filePath`** - Log file directory
```typescript
filePath: string                // Directory path for log files
```

**`auto`** - Automatic logging features
```typescript
auto: boolean                   // Enable automatic request/response logging
```

**`prettier`** - Log formatting option
```typescript
prettier: boolean               // Format logs for better readability
```

**`sentry`** - Sentry integration configuration
```typescript
sentry: {
  dsn?: string;                 // Sentry DSN for error tracking
  timeout: number;              // Sentry timeout in milliseconds
}
```

### Request Configuration

**File**: `src/configs/request.config.ts`
**Interface**: `IConfigRequest`

This configuration handles HTTP request settings including body size limits, CORS, and rate limiting.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`body`** - Request body size limits
```typescript
body: {
  json: {
    limitInBytes: number;         // Maximum JSON request size
  };
  raw: {
    limitInBytes: number;         // Maximum raw body size
  };
  text: {
    limitInBytes: number;         // Maximum text request size
  };
  urlencoded: {
    limitInBytes: number;         // Maximum URL-encoded request size
  };
  applicationOctetStream: {
    limitInBytes: number;         // Maximum octet-stream size
  };
}
```

**`timeoutInMs`** - Request timeout setting
```typescript
timeoutInMs: number             // Request timeout in milliseconds
```

**`cors`** - CORS configuration
```typescript
cors: {
  allowMethod: string[];          // Allowed HTTP methods
  allowOrigin: string[];          // Allowed origins (supports subdomain wildcards)
  allowHeader: string[];          // Allowed headers for CORS requests
}
```

**`throttle`** - Rate limiting configuration
```typescript
throttle: {
  ttlInMs: number;                // Time window in milliseconds
  limit: number;                  // Maximum requests per time window
}
```

### Redis Configuration

**File**: `src/configs/redis.config.ts`
**Interface**: `IConfigRedis`

This configuration manages Redis connection settings for caching and queue operations.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`cache`** - Cache Redis configuration
```typescript
cache: {
  url: string;                    // Redis URL for caching
  namespace: string;              // Cache namespace prefix
  ttlInMs: number;                // Cache TTL in milliseconds
}
```

**`queue`** - Queue Redis configuration
```typescript
queue: {
  url: string;                    // Redis URL for queues
  namespace: string;              // Queue namespace prefix
}
```

### User Configuration

**File**: `src/configs/user.config.ts`
**Interface**: `IUserConfig`

This configuration handles user-related settings including username patterns and file upload paths.

#### Configuration Keys:

**`usernamePrefix`** - Username generation prefix
```typescript
usernamePrefix: string          // Prefix for auto-generated usernames (default: 'user')
```

**`usernamePattern`** - Username validation pattern
```typescript
usernamePattern: RegExp         // Regex pattern for valid usernames
```

**`uploadPhotoProfilePath`** - User profile photo upload path template
```typescript
uploadPhotoProfilePath: string  // Path template for user profile photo uploads
```

### Documentation Configuration

**File**: `src/configs/doc.config.ts`
**Interface**: `IConfigDoc`

This configuration manages API documentation settings for Swagger/OpenAPI.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`name`** - Documentation title
```typescript
name: string                    // API documentation title
```

**`description`** - Documentation description
```typescript
description: string             // API documentation description
```

**`prefix`** - Documentation URL prefix
```typescript
prefix: string                  // URL prefix for API documentation (default: '/docs')
```

### Message Configuration

**File**: `src/configs/message.config.ts`
**Interface**: `IConfigMessage`

This configuration handles application messaging and internationalization settings.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`availableLanguage`** - Supported languages
```typescript
availableLanguage: string[]     // List of supported language codes
```

**`language`** - Default language
```typescript
language: string                // Default application language
```

### Email Configuration

**File**: `src/configs/email.config.ts`
**Interface**: `IConfigEmail`

This configuration manages default email addresses for system communications.

#### Configuration Keys:

**`noreply`** - No-reply email address
```typescript
noreply: string                 // No-reply email address for system emails
```

**`support`** - Support email address
```typescript
support: string                 // Support/contact email address
```

**`admin`** - Admin email address
```typescript
admin: string                   // Administrator email address
```

### Verification Configuration

**File**: `src/configs/verification.config.ts`
**Interface**: `IConfigVerification`

This configuration handles user verification processes including email verification.

#### Configuration Keys:

**`expiredInMinutes`** - Verification expiration time
```typescript
expiredInMinutes: number        // Verification expiration time in minutes
```

**`otpLength`** - OTP code length
```typescript
otpLength: number               // Length of OTP verification code
```

**`tokenLength`** - Verification token length
```typescript
tokenLength: number             // Length of verification token
```

**`linkBaseUrl`** - Verification link base URL
```typescript
linkBaseUrl: string             // Base URL for verification links
```

**`resendInMinutes`** - Resend cooldown period
```typescript
resendInMinutes: number         // Minimum time between resend attempts
```

**`reference`** - Verification reference configuration
```typescript
reference: {
  prefix: string;               // Prefix for verification references
  length: number;               // Length of verification reference ID
}
```

### Forgot Password Configuration

**File**: `src/configs/forgot-password.config.ts`
**Interface**: `IConfigForgotPassword`

This configuration manages password reset functionality and security policies.

#### Configuration Keys:

**`expiredInMinutes`** - Reset link expiration
```typescript
expiredInMinutes: number        // Password reset expiration in minutes
```

**`tokenLength`** - Reset token length
```typescript
tokenLength: number             // Length of password reset token
```

**`linkBaseUrl`** - Reset link base URL
```typescript
linkBaseUrl: string             // Base URL for password reset links
```

**`resendInMinutes`** - Resend cooldown period
```typescript
resendInMinutes: number         // Minimum time between resend attempts
```

**`reference`** - Reset reference configuration
```typescript
reference: {
  prefix: string;               // Prefix for reset references
  length: number;               // Length of reset reference ID
}
```

### Home Configuration

**File**: `src/configs/home.config.ts`
**Interface**: `IConfigHome`

This configuration handles home page and organization information.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`name`** - Organization/application name
```typescript
name: string                    // Display name for organization/application
```

**`url`** - Organization/home URL
```typescript
url: string                     // URL for organization/home page
```

### Session Configuration

**File**: `src/configs/session.config.ts`
**Interface**: `IConfigSession`

This configuration manages user session key patterns for Redis storage.

#### Configuration Keys:

**`keyPattern`** - Session key pattern
```typescript
keyPattern: string              // Redis key pattern for user sessions
```

### Term Policy Configuration

**File**: `src/configs/term-policy.config.ts`
**Interface**: `IConfigTermPolicy`

This configuration handles terms of service and privacy policy file management.

#### Configuration Keys:

**`uploadContentPath`** - Upload path pattern for policy content
```typescript
uploadContentPath: string       // Path pattern for uploading policy content files
```

**`contentPublicPath`** - Public path for policy content
```typescript
contentPublicPath: string       // Public path for accessing policy content
```

**`filenamePattern`** - Filename pattern for policy files
```typescript
filenamePattern: string         // Pattern for policy file names
```

### Feature Flag Configuration

**File**: `src/configs/feature-flag.config.ts`
**Interface**: `IConfigFeatureFlag`

This configuration manages feature flag caching settings.

#### Configuration Keys:

**`cachePrefixKey`** - Cache prefix for feature flags
```typescript
cachePrefixKey: string          // Redis cache prefix for feature flag data
```

**`cacheTtlMs`** - Cache TTL for feature flags
```typescript
cacheTtlMs: number              // Cache TTL in milliseconds for feature flag data
```

### Response Configuration

**File**: `src/configs/response.config.ts`
**Interface**: `IConfigRequest` *(Note: Interface name appears to be incorrect in the source file)*

This configuration handles API response caching settings.

#### Configuration Keys:

**`cachePrefix`** - Cache prefix for API responses
```typescript
cachePrefix: string             // Cache prefix for API response data
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