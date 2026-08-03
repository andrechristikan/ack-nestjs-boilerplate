# Configuration Documentation

This documentation explains the features and usage of **Config Module**: Located at `src/configs`

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
- [Firebase Configuration](#firebase-configuration)
- [Queue Configuration](#queue-configuration)
- [Health Configuration](#health-configuration)
- [Notification Configuration](#notification-configuration)
- [File Configuration](#file-configuration)

## Configuration Structure

All configuration files are located in the `src/configs` directory. Each configuration module uses the `registerAs` function from `@nestjs/config` and provides a TypeScript interface for type safety.

The configuration modules are imported and registered in `src/configs/index.ts` as an array and this configuration array is then loaded in `src/common/common.module.ts`:

```typescript
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
env: EnumAppEnvironment
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

**`encryptionSecretKey`** - AES-256 encryption secret key
```typescript
encryptionSecretKey: string     // Secret key used to derive AES-256 encryption key for sensitive data
```

### Auth Configuration

**File**: `src/configs/auth.config.ts`
**Interface**: `IConfigAuth`

This configuration manages JWT authentication settings including token configuration, password policies, social authentication, and two-factor authentication.

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
    expirationTimeInMs: number;   // Token expiration in ms; signer receives seconds
  };
  refreshToken: {
    jwksUri: string;              // JWKS URI for refresh token
    kid: string;                  // Key ID for refresh token
    algorithm: Algorithm;         // JWT algorithm
    privateKey: string;           // Private key for token signing
    publicKey: string;            // Public key for token verification
    expirationTimeInMs: number;   // Token expiration in ms; signer receives seconds
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
  expiredInMs: number;            // Password expiration time (ms)
  expiredTemporaryInMs: number;   // Temporary password expiration (ms)
  periodInMs: number;             // Password renewal period (ms)
}
```

**`twoFactor`** - Two-factor authentication configuration
```typescript
twoFactor: {
  issuer: string;                 // Issuer name for OTP (TOTP)
  strategy: string;               // OTP strategy (default: 'totp')
  algorithm: string;              // Hash algorithm for OTP (default: 'sha1')
  digits: number;                 // Number of digits in OTP
  periodInMs: number;             // OTP validity window (ms); otplib receives seconds
  window: number;                 // Allowed window for OTP validation
  secretLength: number;           // Length of OTP secret
  challengeTtlInMs: number;       // Challenge TTL in milliseconds
  challengeKeyPattern: string;    // Cache key pattern for challenge ('TwoFactor:Challenge:{token}')
  lockKeyPattern: string;         // Cache key pattern for lockout ('TwoFactor:Lock:{userId}')
  backupCodes: {
    count: number;                // Number of backup codes
    length: number;               // Length of each backup code
  };
  maxAttempt: number;             // Maximum failed two-factor attempts before lock
  lockAttemptDurationInMs: number; // Lock duration after max failed attempts (milliseconds)
  encryption: {
    key: string;                  // Encryption key for backup codes
  };
}
```

**`apple`** - Apple OAuth configuration
```typescript
apple: {
  header: string;                 // HTTP header for Apple auth
  prefix: string;                 // Token prefix for Apple auth
  clientId: string | null;        // Apple OAuth client ID
  signInClientId: string | null;  // Apple Sign In client ID
}
```

**`google`** - Google OAuth configuration
```typescript
google: {
  header: string;                 // HTTP header for Google auth
  prefix: string;                 // Token prefix for Google auth
  clientId: string | null;        // Google OAuth client ID
  clientSecret: string | null;    // Google OAuth client secret
}
```

**`xApiKey`** - API Key authentication configuration
```typescript
xApiKey: {
  header: string;                 // HTTP header for API key
  keyPattern: string;             // Cache key pattern for API keys ('ApiKey:{key}')
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

This configuration handles AWS service integration including S3 and SES services with support for IAM role-based authentication.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`s3`** - S3 service configuration
```typescript
s3: {
  multipartExpiredInMs: number;   // Multipart upload expiration (ms('3d')); lifecycle rule receives days
  presignExpiredInMs: number;     // Presigned URL expiration (ms('30m')); signer receives seconds
  corsMaxAgeLongInMs: number;     // CORS preflight max-age, long (ms('1d')); S3 receives seconds
  corsMaxAgeShortInMs: number;    // CORS preflight max-age, short (ms('1h')); S3 receives seconds
  maxAttempts: number;            // Maximum retry attempts for S3 operations (default: 3)
  timeoutInMs: number;            // Request timeout in milliseconds (default: 30000ms)
  region: string | null;          // AWS region for S3
  iam: {
    key: string | null;           // AWS IAM access key ID
    secret: string | null;        // AWS IAM secret access key
    arn: string | null;           // AWS IAM Role ARN for role-based access
  };
  config: {
    public: {
      bucket: string | null;      // Public S3 bucket name
      arn: string | null;         // Public S3 bucket ARN
      baseUrl: string | null;     // S3 base URL (auto-generated)
      cdnUrl: string | null;      // CDN URL if available
    };
    private: {
      bucket: string | null;      // Private S3 bucket name
      arn: string | null;         // Private S3 bucket ARN
      baseUrl: string | null;     // S3 base URL (auto-generated)
      cdnUrl: string | null;      // CDN URL if available
    };
  };
}
```

> [!NOTE]
> **IAM Configuration Notes**:
> - The `iam.key` and `iam.secret` are used for standard IAM user credentials
> - The `iam.arn` is used for IAM role assumption (recommended for production)
> - When using IAM roles, temporary credentials are automatically rotated
> - Bucket ARNs are auto-generated as `arn:aws:s3:::{bucket-name}`
> - Base URLs are auto-generated as `https://{bucket}.s3.{region}.amazonaws.com`

**`ses`** - Simple Email Service configuration
```typescript
ses: {
  iam: {
    key: string | null;           // AWS IAM access key ID for SES
    secret: string | null;        // AWS IAM secret access key for SES
    arn: string | null;           // AWS IAM Role ARN for SES operations
  };
  region: string | null;          // AWS region for SES
}
```

> [!NOTE]
> **SES IAM Configuration**:
> - Similar to S3, SES supports both standard credentials and IAM role-based access
> - Using IAM roles (`iam.arn`) is recommended for better security
> - Credentials are used for sending emails and managing SES operations

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
level: string                   // Log level: error, warn, info, verbose, debug, silly
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
  timeoutInMs: number;          // Sentry timeout in milliseconds
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
    limitInBytes: number;         // Maximum JSON request size (default: 500kb)
  };
  text: {
    limitInBytes: number;         // Maximum text request size (default: 1mb)
  };
  urlencoded: {
    limitInBytes: number;         // Maximum URL-encoded request size (default: 1mb)
  };
  applicationOctetStream: {
    limitInBytes: number;         // Maximum octet-stream size (from FileSizeInBytes constant)
  };
}
```

**`timeoutInMs`** - Request timeout setting
```typescript
timeoutInMs: number             // Request timeout in milliseconds (default: 30000ms)
```

**`cors`** - CORS configuration
```typescript
cors: {
  allowedMethod: string[];        // Allowed HTTP methods (GET, DELETE, PUT, PATCH, POST, HEAD, OPTIONS)
  allowedOrigin: string[];        // Allowed origins, parsed from CORS_ALLOWED_ORIGIN (comma-separated into an array)
  allowedHeader: string[];        // Allowed headers for CORS requests
}
```

> [!NOTE]
> **CORS Configuration Notes**:
> - `allowedOrigin` is populated from `CORS_ALLOWED_ORIGIN` environment variable or configuration
> - Multiple origins can be specified using comma separation (converted to array)
> - **Subdomain wildcards** are supported (e.g., `*.example.com` matches `api.example.com` and `example.com`)
> - **Exact port matching** is supported (e.g., `api.example.com:3000`) — port wildcards are NOT supported
> - **Protocol-agnostic** — both HTTP and HTTPS are allowed for the same hostname
> - **Credentials** are automatically allowed only for specific origins; wildcard (`*`) disables credentials
> - Default headers include standard headers plus custom headers like `x-api-key`, `x-timezone`, `x-request-id`, etc.

**`throttle`** - Rate limiting configuration (Redis-backed, shares the cache connection)
```typescript
throttle: {
  ttlInMs: number;                // Time window in milliseconds (default: 60000ms / 60s)
  limit: number;                  // Maximum requests per time window (default: 100)
  keyPattern: string;             // Counter key (default: 'Request:Throttler:{name}:{tracker}')
  blockKeyPattern: string;        // Block key (default: 'Request:Throttler:Block:{name}:{tracker}')
}
```

> `{name}` is the throttler name (default `default`); `{tracker}` is the client IP, or the authenticated user id when `@RequestThrottleByUser()` is applied. See [Security and Middleware](security-and-middleware.md).

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

**`default`** - Default role and country assigned to new users
```typescript
default: {
  role: string;                 // Default role name (default: 'user')
  country: string;              // Default country code (default: 'ID')
}
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

**`prefix`** - Documentation URL prefix
```typescript
prefix: string                  // URL prefix for API documentation (default: '/docs')
```

**`version`** - Static Swagger version
```typescript
version: string                 // Static version for Swagger documentation (default: '3.1.0')
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

This configuration manages default email addresses for system communications. Email addresses (`noreply`, `support`, `admin`) come from environment variables and fall back to `null` when unset.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`noreply`** - No-reply email address
```typescript
noreply: string | null          // No-reply email address for system emails
```

**`support`** - Support email address
```typescript
support: string | null          // Support/contact email address
```

**`admin`** - Admin email address
```typescript
admin: string | null            // Administrator email address
```

**`batchSize`** - Email batch size
```typescript
batchSize: number               // Maximum number of emails per batch (default: 100)
```

### Verification Configuration

**File**: `src/configs/verification.config.ts`
**Interface**: `IConfigVerification`

This configuration handles user verification processes including email verification.

#### Configuration Keys:

**`expiredInMs`** - Verification expiration time
```typescript
expiredInMs: number             // Verification expiration (ms('5m')); consumer converts to minutes
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

**`resendInMs`** - Resend cooldown period
```typescript
resendInMs: number              // Minimum time between resend attempts (ms('2m')); consumer converts to minutes
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

**`expiredInMs`** - Reset link expiration
```typescript
expiredInMs: number             // Password reset expiration (ms('5m')); consumer converts to minutes
```

**`tokenLength`** - Reset token length
```typescript
tokenLength: number             // Length of password reset token
```

**`linkBaseUrl`** - Reset link base URL
```typescript
linkBaseUrl: string             // Base URL for password reset links
```

**`resendInMs`** - Resend cooldown period
```typescript
resendInMs: number              // Minimum time between resend attempts (ms('2m')); consumer converts to minutes
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

### Feature Flag Configuration

**File**: `src/configs/feature-flag.config.ts`
**Interface**: `IConfigFeatureFlag`

This configuration manages feature flag caching settings.

#### Configuration Keys:

**`keyPattern`** - Cache key pattern for feature flags
```typescript
keyPattern: string              // Redis cache key pattern for feature flag data ('FeatureFlag:{key}')
```

**`cacheTtlInMs`** - Cache TTL for feature flags
```typescript
cacheTtlInMs: number            // Cache TTL in milliseconds for feature flag data
```

### Response Configuration

**File**: `src/configs/response.config.ts`
**Interface**: `IConfigResponse`

This configuration handles API response caching and file-export settings.

#### Configuration Keys:

**`keyPattern`** - Cache key pattern for API responses
```typescript
keyPattern: string              // Cache key pattern for API response data ('Apis:{key}')
```

**`filenameExportPattern`** - Default filename pattern for file exports (`ResponseFileInterceptor`); `{timestamp}` / `{extension}` placeholders are replaced at runtime
```typescript
filenameExportPattern: string   // e.g. 'export-{timestamp}.{extension}'
```

### Firebase Configuration

**File**: `src/configs/firebase.config.ts`  
**Interface**: `IConfigFirebase`

This configuration manages Firebase integration settings for push notification delivery via FCM.

> **Environment Variables**: See [Environment Documentation](environment.md) for detailed environment variable configuration.

#### Configuration Keys:

**`projectId`** - Firebase project ID
```typescript
projectId: string | null        // Firebase project ID from Firebase console
```

**`clientEmail`** - Firebase service account email
```typescript
clientEmail: string | null      // Firebase service account client email
```

**`privateKey`** - Firebase service account private key
```typescript
privateKey: string | null       // Service account private key (PEM); escaped `\n` sequences are converted to real newlines at load
```

> [!NOTE]
> All Firebase config fields are optional. They are required only when push notification features are enabled. The `FirebaseConfig` is registered in `src/configs/index.ts` alongside other config modules.

### Queue Configuration

**File**: `src/configs/queue.config.ts`
**Interface**: `IConfigQueue`

This configuration holds the BullMQ default job options applied by `queue.register.module.ts` to every registered queue.

#### Configuration Keys:

**`job`** - Default job options
```typescript
job: {
  attempts: number;                    // Retry attempts per job (default: 3)
  removeOnComplete: number;            // Completed jobs retained (default: 50)
  removeOnFail: number;                // Failed jobs retained (default: 100)
  emailBackoffDelayInMs: number;       // Email queue exponential backoff delay (ms('10s'))
  pushBackoffDelayInMs: number;        // Push queue exponential backoff delay (ms('5s'))
  notificationBackoffDelayInMs: number; // Notification queue exponential backoff delay (ms('3s'))
}
```

### Health Configuration

**File**: `src/configs/health.config.ts`
**Interface**: `IConfigHealth`

This configuration holds the thresholds consumed by `HealthInstanceIndicator` for the instance health check.

#### Configuration Keys:

**`memoryRssThresholdInBytes`** - RSS memory threshold
```typescript
memoryRssThresholdInBytes: number    // RSS memory alert threshold in bytes (bytes('300mb'))
```

**`memoryHeapThresholdInBytes`** - Heap memory threshold
```typescript
memoryHeapThresholdInBytes: number   // Heap memory alert threshold in bytes (bytes('300mb'))
```

**`diskThresholdPercent`** - Disk usage threshold
```typescript
diskThresholdPercent: number         // Disk usage alert threshold as a fraction (default: 0.75)
```

**`diskPath`** - Disk path checked
```typescript
diskPath: string                     // Filesystem path checked for storage (default: '/')
```

### Notification Configuration

**File**: `src/configs/notification.config.ts`
**Interface**: `IConfigNotification`

This configuration holds push-notification cleanup settings consumed by `NotificationPushUtil`.

#### Configuration Keys:

**`push`** - Push cleanup settings
```typescript
push: {
  cleanupDedupTtlInMs: number;   // Deduplication TTL for the cleanup job (ms('1h'))
  cleanupStaleTokensCron: string; // Cron pattern for the stale-token cleanup (default: '0 0 * * *')
}
```

### File Configuration

**File**: `src/configs/file.config.ts`
**Interface**: `IConfigFile`

This configuration holds file-import limits consumed by `FileCsvValidationPipe`.

#### Configuration Keys:

**`maxDataImport`** - CSV import row cap
```typescript
maxDataImport: number           // Maximum rows accepted in a CSV import (default: 1000)
```


<!-- REFERENCES -->

[ref-doc-environment]: environment.md
[ref-doc-database]: database.md
[ref-doc-cache]: cache.md