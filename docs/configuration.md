# Configuration Documentation

Config lives in `src/configs`.

## Overview

- NestJS `ConfigModule` loads one `registerAs` file per concern from `src/configs`.
- Each file has a TypeScript interface.

## Related Documents

- [Environment Documentation][ref-doc-environment]: Env var names and validation (`AppEnvSchema`)
- [Database Documentation][ref-doc-database]: MongoDB and Prisma usage
- [Cache Documentation][ref-doc-cache]: Redis cache usage

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Configuration Structure](#configuration-structure)
    - [Patterns and their placeholders](#patterns-and-their-placeholders)
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
- [Workspace Configuration](#workspace-configuration)
- [Project Configuration](#project-configuration)
- [Analytic Configuration](#analytic-configuration)

## Configuration Structure

All configuration files are in `src/configs`.

- Each file uses `registerAs` from `@nestjs/config` and a TypeScript interface.
- Env var names and validation live in [Environment Documentation][ref-doc-environment].
- This page documents the typed config objects the app injects.
- `ConfigModule` loads only `.env` and validates it through `AppEnvSchema` (`validationSchema`) before any provider resolves a config value.
- A factory reads `process.env` directly and parses no schema:
    - A required key is `process.env.KEY!`.
    - A boolean is `process.env.KEY === 'true'`.
    - A number is converted inline with `Number(...)`.
    - An optional key is `process.env.KEY === '' ? null : (process.env.KEY ?? null)`, so a blank or missing value reads as `null`.
- Only `src/configs/` and `src/queues/decorators/queue.decorator.ts` read `process.env`. Every other file reads `ConfigService`.
- `src/main.ts` writes `process.env.NODE_ENV` from `app.env` and `process.env.TZ` from `app.timezone` once the config is loaded.
- `src/instrument.ts` runs before Nest starts:
    - It loads `.env` through `dotenv/config`.
    - It calls `appConfigFunction()` and `loggerConfigFunction()` directly, so Sentry initializes from unvalidated values.

`src/configs/index.ts` imports and registers the configuration modules as an array, and `src/common/common.module.ts` loads that array:

```typescript
@Module({
    imports: [
        ConfigModule.forRoot({
            load: configs,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env'],
            expandVariables: false,
            validationSchema: AppEnvSchema,
        }),
        // ... other modules
    ],
})
export class CommonModule {}
```

### Patterns and their placeholders

A config value whose name ends in `Pattern` or `Path` is a template carrying `{token}` placeholders.

- The templates cover cache and Redis keys, S3 object paths and URLs, email links, and the export filename.
- The consumer fills the template at the point of use.

The number of placeholders decides how the consumer fills it:

- **One placeholder.** `String.prototype.replace('{name}', () => value)` fills it. The function form of the replacement stops a value containing `$&` or `$1` from being read as a replacement pattern.
- **Two or more.** `HelperStringService.fillPattern(pattern, values)` fills them.
    - It scans the pattern once, so a substituted value is never re-read as a token.
    - A `{token}` the caller supplied no value for raises `HelperPatternTokenMissingException` (`52202`, 500) naming that token, rather than leaving the literal `{token}` in the key or the link.

### App Configuration

**File**: `src/configs/app.config.ts` **Interface**: `IConfigApp`

#### Configuration Keys:

**`name`**: Application name used throughout the system

```typescript
name: string;
```

**`env`**: Current environment (development, production, staging, local)

```typescript
env: EnumAppEnvironment;
```

**`timezone`**: Default timezone for date operations

```typescript
timezone: string;
```

**`version`**: Application version, read from `src/generated/package/package.ts`

```typescript
version: string;
```

**`author`**: Author information, read from `src/generated/package/package.ts`

```typescript
author: {
    name: string; // Author name
    email: string; // Author email
}
```

**`url`**: Repository URL, read from `src/generated/package/package.ts`

```typescript
url: string;
```

**`globalPrefix`**: Global API prefix (default: '/api')

```typescript
globalPrefix: string;
```

**`http`**: HTTP server configuration

```typescript
http: {
    host: string; // Server host address
    port: number; // Server port number
    trustedProxy: string | null; // Express `trust proxy` network list, from HTTP_TRUSTED_PROXY; null trusts no proxy
}
```

> - `trustedProxy` is a trusted-NETWORK list (`proxy-addr` preset names or explicit CIDRs, comma-separated), never a hop count and never `true`.
> - It decides what `req.ip` resolves to, and therefore what the rate limiter keys on.
>
> See [Security and Middleware](security-and-middleware.md).

**`urlVersion`**: API versioning configuration

```typescript
urlVersion: {
    enable: boolean; // Enable URL versioning
    prefix: string; // Version prefix (default: 'v')
    version: string; // Default API version
}
```

**`encryptionSecretKey`**: Root secret for application-level encryption

```typescript
encryptionSecretKey: string; // From APP_ENCRYPTION_SECRET_KEY: 64 base64url characters (48 random bytes)
```

> - `pnpm generate:package` (part of `pnpm generate`) writes `src/generated/package/package.ts` from the `version`, `author`, and `repository` fields of `package.json`.
> - `encryptionSecretKey` is the HKDF key material `HelperEncryptionService` uses for the notification job payloads. The notification queue classes and email domains read it.
>
> See [Notification](notification.md).

### Auth Configuration

**File**: `src/configs/auth.config.ts` **Interface**: `IConfigAuth`

#### Configuration Keys:

**`jwt`**: JWT authentication configuration

```typescript
jwt: {
    accessToken: {
        jwksUri: string; // JWKS URI for access token
        kid: string; // Key ID for access token
        algorithm: Algorithm; // JWT algorithm (ES256, ES512, etc.)
        privateKey: string; // Private key for token signing
        publicKey: string; // Public key for token verification
        expirationTimeInSeconds: number; // Token expiration in seconds, parsed from the `ms()` string in the env var
    }
    refreshToken: {
        jwksUri: string; // JWKS URI for refresh token
        kid: string; // Key ID for refresh token
        algorithm: Algorithm; // JWT algorithm
        privateKey: string; // Private key for token signing
        publicKey: string; // Public key for token verification
        expirationTimeInSeconds: number; // Token expiration in seconds, parsed from the `ms()` string in the env var
    }
    audience: string; // JWT audience claim
    issuer: string; // JWT issuer claim
}
```

The token header and scheme are constants, not config, in `src/modules/auth/constants/auth.constant.ts`:

- `AuthHeaderName` is `Authorization`.
- `AuthBearerScheme` is `Bearer`.
- The Apple and Google guards read the same pair.

**`password`**: Password policy configuration

```typescript
password: {
    attempt: boolean; // Enable login attempt tracking
    maxAttempt: number; // Maximum failed login attempts
    saltLength: number; // Salt length for password hashing
    expiredInMs: number; // Password expiration time (ms)
    expiredTemporaryInMs: number; // Temporary password expiration (ms)
    periodInDays: number; // Password renewal period in days (`ms('90d') / ms('1d')`)
}
```

**`twoFactor`**: Two-factor authentication configuration

```typescript
twoFactor: {
    issuer: string; // Issuer name for OTP (TOTP)
    strategy: OTPStrategy; // OTP strategy (default: 'totp')
    algorithm: HashAlgorithm; // Hash algorithm for OTP (default: 'sha1')
    digits: number; // Number of digits in OTP
    periodInSeconds: number; // OTP validity window in seconds (`ms('30s') / 1000`)
    window: number; // Allowed window for OTP validation
    secretLength: number; // Length of OTP secret
    challengeTtlInMs: number; // Challenge TTL in milliseconds
    challengeKeyPattern: string; // Cache key pattern for challenge ('TwoFactor:Challenge:{token}')
    lockKeyPattern: string; // Cache key pattern for lockout ('TwoFactor:Lock:{userId}')
    backupCodes: {
        count: number; // Number of backup codes
        length: number; // Length of each backup code
    }
    maxAttempt: number; // Maximum failed two-factor attempts before lock
    lockAttemptDurationInMs: number; // Lock duration after max failed attempts (milliseconds)
    encryption: {
        key: string; // Root secret for TOTP secrets, from AUTH_TWO_FACTOR_ENCRYPTION_KEY (64 base64url characters)
    }
}
```

**`apple`**: Apple OAuth configuration

```typescript
apple: {
    clientId: string | null; // Apple OAuth client ID
    signInClientId: string | null; // Apple Sign In client ID
}
```

**`google`**: Google OAuth configuration

```typescript
google: {
    clientId: string | null; // Google OAuth client ID
}
```

**`xApiKey`**: API Key authentication configuration

```typescript
xApiKey: {
    keyPattern: string; // Cache key pattern for API keys ('ApiKey:{key}')
}
```

The API key header is the constant `ApiKeyHeaderName` (`x-api-key`) in `src/modules/api-key/constants/api-key.constant.ts`.

### Database Configuration

**File**: `src/configs/database.config.ts` **Interface**: `IConfigDatabase`

#### Configuration Keys:

**`url`**: Database connection string

```typescript
url: string; // MongoDB connection URL
```

**`debug`**: Database debug mode

```typescript
debug: boolean; // Enable/disable database query logging
```

**`seedTransactionTimeoutInMs`**: `withTransaction` timeout for the seed commands

```typescript
seedTransactionTimeoutInMs: number; // Timeout every seed passes to withTransaction, in seed() and remove() (ms('60s')); no env var
```

### AWS Configuration

**File**: `src/configs/aws.config.ts` **Interface**: `IConfigAws`

#### Configuration Keys:

**`s3`**: S3 service configuration

```typescript
s3: {
    multipartExpiredInDays: number; // Multipart upload expiration in days, handed straight to the lifecycle rule (`ms('3d') / ms('1d')`)
    presignExpiredInSeconds: number; // Presigned URL lifetime in seconds, handed straight to the signer (`ms('30m') / 1000`)
    corsMaxAgeLongInSeconds: number; // CORS preflight max-age in seconds, long (`ms('1d') / 1000`)
    corsMaxAgeShortInSeconds: number; // CORS preflight max-age in seconds, short (`ms('1h') / 1000`)
    maxAttempts: number; // Maximum retry attempts for S3 operations (default: 3)
    timeoutInMs: number; // Request timeout in milliseconds (default: 30000ms)
    region: string | null; // AWS region for S3
    endpoint: string | null; // Custom S3 endpoint (LocalStack or another S3-compatible store), from AWS_S3_ENDPOINT
    baseUrlPattern: string; // Bucket base URL template; '{endpoint}/{bucket}' with an endpoint, 'https://{bucket}.s3.{region}.amazonaws.com' without
    objectUrlPattern: string; // Object URL template ('{baseUrl}/{key}')
    cdnUrlPattern: string; // CDN URL template ('{cdnUrl}/{key}')
    iam: {
        key: string | null; // AWS IAM access key ID
        secret: string | null; // AWS IAM secret access key
        arn: string | null; // IAM principal ARN granted full access in the public bucket policy
    }
    config: {
        public: {
            bucket: string | null; // Public S3 bucket name
            arn: string | null; // Public S3 bucket ARN
            cdnUrl: string | null; // CDN URL if available
        }
        private: {
            bucket: string | null; // Private S3 bucket name
            arn: string | null; // Private S3 bucket ARN
            cdnUrl: string | null; // CDN URL if available
        }
    }
}
```

> [!NOTE] **S3 Configuration Notes**:
>
> - `AwsS3Service` builds its client from `iam.key`, `iam.secret`, and `region` on module init.
>     - With any of the three missing, S3 stays unconfigured.
>     - The service logs a warning.
>     - A request that needs S3 answers `AwsS3NotConfiguredException` (404).
> - With an `endpoint`, the client targets that endpoint with path-style addressing
> - `iam.arn` is read only by the bucket policy the `awsS3Config` seed applies to the public bucket. The seed skips with a warning when S3 or `iam.arn` is unset
> - Bucket ARNs are built as `arn:aws:s3:::{bucket-name}`, and a CDN URL as `https://{cdn}`
> - `AwsS3Service` fills `baseUrlPattern` per bucket at construction. A bucket with no name, or with neither `endpoint` nor `region`, has no base URL
> - `AwsS3Service.buildUrls` fills two patterns:
>     - `objectUrlPattern` with the bucket base URL and the object key
>     - `cdnUrlPattern` with the bucket `cdnUrl` and the same key
> - A bucket without a `cdnUrl` reports `cdnUrl: null`

**`ses`**: Simple Email Service configuration

```typescript
ses: {
    iam: {
        key: string | null; // AWS IAM access key ID for SES
        secret: string | null; // AWS IAM secret access key for SES
    }
    identityArn: string | null; // SES identity ARN, sent as `SourceArn` on every send when set
    region: string | null; // AWS region for SES
    endpoint: string | null; // Custom SES endpoint (LocalStack), from AWS_SES_ENDPOINT
}
```

> [!NOTE] **SES Configuration Notes**:
>
> - `AwsSESService` builds its client from `iam.key`, `iam.secret`, and `region` on module init.
>     - With any of the three missing, SES stays unconfigured and logs a warning.
>     - Email features are off.
> - `identityArn` is the ARN of a verified SES identity, used for sending authorization

### Logger Configuration

**File**: `src/configs/logger.config.ts` **Interface**: `IConfigLogger`

#### Configuration Keys:

**`enable`**: Enable/disable logging

```typescript
enable: boolean; // Turn logging on/off; false sets the Pino level to silent
```

**`level`**: Log level configuration

```typescript
level: EnumLoggerLevel; // Log level: fatal, error, warn, info, debug, trace
```

The level applies once `configure(app)` attaches Pino. Before that, `ConfigureOptions` limits Nest's default logger to `fatal` (see [Logger][ref-doc-logger]).

**`intoFile`**: File logging option

```typescript
intoFile: boolean; // Whether to write logs to files
```

**`filePath`**: Log file directory

```typescript
filePath: string; // Directory path for log files
```

**`auto`**: Automatic logging features

```typescript
auto: boolean; // Enable automatic request/response logging
```

**`excludedRoutes`**: Routes left out of request auto-logging and Sentry

```typescript
excludedRoutes: string[]        // Wildcard patterns built from app.globalPrefix and doc.prefix
```

- The list covers `{globalPrefix}/public/hello`, `{globalPrefix}/system/health`, `/metrics`, `{docPrefix}` (each with its `/*` variant), `/favicon.ico`, and `/`.
- With the defaults (`/api`, `/docs`) that is `/api/public/hello`, `/api/system/health`, and `/docs`.

The list has three consumers:

- `LoggerOptionService` skips matching requests in pino-http.
- `src/instrument.ts` drops matching Sentry events.
- `src/instrument.ts` samples matching traces at `0`.

**`prettier`**: Log formatting option

```typescript
prettier: boolean; // Format logs for better readability
```

**`sentry`**: Sentry integration configuration

```typescript
sentry: {
    dsn: string | null; // Sentry DSN for error tracking; null when unset
    timeoutInMs: number; // Sentry timeout in milliseconds (ms('10s'))
    tracesSampleRate: number; // Trace sample rate outside production (1)
    tracesSampleRateProduction: number; // Trace sample rate in production (0.3)
    profilesSampleRate: number; // Profile sample rate outside production (0.5)
    profilesSampleRateProduction: number; // Profile sample rate in production (0.1)
}
```

> `src/instrument.ts` picks the production or non-production rate from `APP_ENV`.

### Request Configuration

**File**: `src/configs/request.config.ts` **Interface**: `IConfigRequest`

#### Configuration Keys:

**`body`**: Request body size limits

```typescript
body: {
    json: {
        limitInBytes: number; // Maximum JSON request size (default: 500kb)
    }
    text: {
        limitInBytes: number; // Maximum text request size (default: 1mb)
    }
    urlencoded: {
        limitInBytes: number; // Maximum URL-encoded request size (default: 1mb)
    }
    applicationOctetStream: {
        limitInBytes: number; // Maximum octet-stream size (from FileSizeInBytes constant)
    }
}
```

**`timeoutInMs`**: Request timeout setting

```typescript
timeoutInMs: number; // Request timeout in milliseconds (default: 30000ms)
```

**`cors`**: CORS configuration

```typescript
cors: {
  allowedMethod: string[];        // Allowed HTTP methods (GET, DELETE, PUT, PATCH, POST, HEAD, OPTIONS)
  allowedOrigin: string[];        // Allowed origins, parsed from CORS_ALLOWED_ORIGIN (comma-separated into an array)
  allowedHeader: string[];        // Request headers a client may send
  exposedHeader: string[];        // Response headers a browser client may read (Access-Control-Expose-Headers)
}
```

> [!NOTE] **CORS Configuration Notes**:
>
> - `allowedOrigin` is populated from `CORS_ALLOWED_ORIGIN` environment variable or configuration
> - Multiple origins can be specified using comma separation (converted to array)
> - **Subdomain wildcards** are supported (e.g., `*.example.com` matches `api.example.com` and `example.com`)
> - **Exact port matching** is supported (e.g., `api.example.com:3000`)
> - Port wildcards are not supported
> - **Protocol-agnostic**: both HTTP and HTTPS are allowed for the same hostname
> - **Credentials** are automatically allowed only for specific origins
> - A wildcard (`*`) origin disables credentials
> - `allowedHeader` is a fixed list in `request.config.ts`, not environment-driven:
>     - standard CORS/HTTP headers, including `Authorization` and `user-agent`
>     - the custom headers `x-custom-lang`, `x-timestamp`, `x-api-key`, `x-timezone`, `x-workspace-id`, `x-anonymous-id`, `x-request-id`, `x-correlation-id`, `x-version`, `x-repo-version`, and `X-Response-Time`
>     - `x-request-id` and `x-correlation-id` are kept when they match `RequestIdRegex`, otherwise the server assigns a UUID v7
> - `exposedHeader` is likewise fixed in `request.config.ts`:
>     - `Retry-After`
>     - `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and the `-route` and `-user` suffixed variants of the three
>     - `x-custom-lang`, `x-timestamp`, `x-timezone`, `x-version`, `x-repo-version`, `x-request-id`, and `x-correlation-id`
>     - a response header that is not in this list is invisible to a cross-origin browser client
> - Every custom header in both lists comes from a header-name constant:
>     - `RequestCustomLangHeaderName`, `RequestCorrelationIdHeaderName`, `RequestIdHeaderName`, `RequestWorkspaceIdHeaderName`
>     - the `Response*HeaderName` constants
>     - `AuthHeaderName`, `ApiKeyHeaderName`, `FeatureFlagAnonymousIdHeaderName`
> - The `X-RateLimit-*` names are built from the `RequestThrottleHeaderName` constant (`X-RateLimit`) and the `EnumRequestThrottleName` values

**`helmet`**: Strict-Transport-Security parameters for the Helmet profile

```typescript
helmet: {
    maxAgeInSeconds: number; // HSTS max-age in seconds (365d)
    includeSubDomains: boolean; // Appends the includeSubDomains directive (true)
    preload: boolean; // Appends the preload directive (false)
}
```

> - These three are literals in `request.config.ts` and read no environment variable.
> - `RequestHelmetMiddleware` reads them in `use`.
> - The rest of the Helmet options object, including which headers are on and which are off, is written as literals in that middleware, not in this config.
>
> See [Security and Middleware](security-and-middleware.md).

**`throttle`**: Rate limiting configuration (Redis-backed, shares the cache connection)

```typescript
throttle: {
  default: IRequestThrottlePolicy;                              // Global per-IP limiter, always on (300 / 60s, block 60s)
  user: IRequestThrottlePolicy;                                 // Per-userId limiter, opt-in (100 / 60s, block 60s)
  route: Record<EnumRequestThrottleRoute, IRequestThrottlePolicy>; // Per-IP-per-handler tiers, opt-in
  keyPattern: string;             // Window log key (default: 'Request:Throttle:{name}:{tracker}')
  blockKeyPattern: string;        // Block key (default: 'Request:Throttle:Block:{name}:{tracker}')
  sequenceKeyPattern: string;     // Sequence counter key (default: 'Request:Throttle:Seq:{name}:{tracker}')
}

interface IRequestThrottlePolicy {
  ttlInMs: number;                // Sliding window length in milliseconds
  limit: number;                  // Maximum requests per window
  blockDurationInMs: number;      // How long a breaching tracker stays blocked
}
```

Route tiers (`EnumRequestThrottleRoute`), each with `ttlInMs` 60s and `blockDurationInMs` 5m:

| Tier       | `limit` |
| ---------- | ------- |
| `strict`   | 5       |
| `moderate` | 20      |
| `relaxed`  | 60      |

> - `{name}` is the limiter name: `default`, `user`, or `route`.
> - `{tracker}` is the client IP for `default`, the authenticated `userId` for `user`, and the composite `{tier}:{ControllerClass}.{handlerName}:{ip}` for `route`.
>
> See [Security and Middleware](security-and-middleware.md).

### Redis Configuration

**File**: `src/configs/redis.config.ts` **Interface**: `IConfigRedis`

#### Configuration Keys:

**`cache`**: Cache Redis configuration

```typescript
cache: {
    url: string; // Redis URL for caching
    namespace: string; // Cache namespace prefix
    ttlInMs: number; // Cache TTL in milliseconds
}
```

**`queue`**: Queue Redis configuration

```typescript
queue: {
    url: string; // Redis URL for queues
    namespace: string; // Queue namespace prefix
}
```

### User Configuration

**File**: `src/configs/user.config.ts` **Interface**: `IConfigUser`

#### Configuration Keys:

**`usernameRegex`**: Username validation expression

```typescript
usernameRegex: RegExp; // Regular expression a valid username matches (/^[a-zA-Z0-9-_]+$/)
```

**`uploadPhotoProfilePath`**: User profile photo upload path template

```typescript
uploadPhotoProfilePath: string; // Path template for user profile photo uploads
```

**`maxDataImport`**: User CSV import row cap

```typescript
maxDataImport: number; // Maximum rows accepted in a user CSV import (default: 50)
```

The user import route hands this key to `FileCsvValidationPipe`.

**`maxDataExport`**: User CSV export row cap

```typescript
maxDataExport: number; // User CSV export row cap (default: 500), overriding `file.maxDataExport`
```

- The user export route hands this key to `@ResponseFile`.
- `UserImportDomain.exportByAdmin` bounds its query by it.
- One row more raises `FileExceedMaxDataExportException`.

**`default`**: Default role and country assigned to new users

```typescript
default: {
  role: string;                 // Default role name (default: 'user')
  country: string;              // Default country code (default: 'ID')
}
```

**`onboarding`**: `withTransaction` timeouts `WorkspaceDomain.commitOnboarding` applies to the onboarding compose

```typescript
onboarding: {
    createTimeoutInMs: number; // Single-user compose (`WorkspaceDomain.commitOnboarding`) (ms('10s'))
    createBulkTimeoutInMs: number; // Bulk compose (`WorkspaceDomain.commitOnboarding`) (ms('30s'))
}
```

> - Single-user callers (`OnboardingDomain.createByAdmin`, `signUp`, and `loginWithSocial`) pass `createTimeoutInMs` from `UserOnboardingDomain.getCreateTimeoutInMs`.
> - `OnboardingDomain.importByAdmin` passes `createBulkTimeoutInMs` from `UserOnboardingDomain.getCreateBulkTimeoutInMs`.
> - Both reach `WorkspaceDomain.commitOnboarding` as `timeoutInMs`.

### Documentation Configuration

**File**: `src/configs/doc.config.ts` **Interface**: `IConfigDoc`

#### Configuration Keys:

**`name`**: Documentation title

```typescript
name: string; // API documentation title
```

**`prefix`**: Documentation URL prefix

```typescript
prefix: string; // URL prefix for API documentation (default: '/docs')
```

**`version`**: Static Swagger version

```typescript
version: string; // Static version for Swagger documentation (default: '3.1.0')
```

**`jsonUrlPattern`**: Path the OpenAPI JSON is served on

```typescript
jsonUrlPattern: string; // Relative path template ('{docPrefix}/json'), filled with `prefix` in `src/swagger.ts`
```

### Message Configuration

**File**: `src/configs/message.config.ts` **Interface**: `IConfigMessage`

#### Configuration Keys:

**`availableLanguage`**: Supported languages

```typescript
availableLanguage: string[]     // List of supported language codes
```

**`language`**: Default language

```typescript
language: string; // Default application language
```

### Email Configuration

**File**: `src/configs/email.config.ts` **Interface**: `IConfigEmail`

#### Configuration Keys:

**`noreply`**: No-reply email address

```typescript
noreply: string | null; // No-reply email address for system emails, from EMAIL_NO_REPLY
```

**`support`**: Support email address

```typescript
support: string | null; // Support/contact email address, from EMAIL_SUPPORT
```

**`batchSize`**: Email batch size

```typescript
batchSize: number; // Recipients per SES bulk send and per term-policy email job (50, the SES cap of destinations per call)
```

**`batchDelayInMs`**: Delay between email batches

```typescript
batchDelayInMs: number; // Per-job BullMQ delay: the term-policy email job at position i of one run waits i * batchDelayInMs (ms('1s'))
```

### Verification Configuration

**File**: `src/configs/verification.config.ts` **Interface**: `IConfigVerification`

#### Configuration Keys:

**`expiredInMs`**: Verification expiration time

```typescript
expiredInMs: number; // Verification expiration (ms('5m')); consumer converts to minutes
```

**`otpLength`**: OTP code length

```typescript
otpLength: number; // Length of OTP verification code
```

**`tokenLength`**: Verification token length

```typescript
tokenLength: number; // Length of verification token
```

**`linkPattern`**: Verification link template

```typescript
linkPattern: string; // Full verification link template ('{homeUrl}/verify-email/{token}')
```

**`resendInMs`**: Resend cooldown period

```typescript
resendInMs: number; // Minimum time between resend attempts (ms('2m')); consumer converts to minutes
```

**`reference`**: Verification reference configuration

```typescript
reference: {
    prefix: string; // Prefix for verification references
    length: number; // Length of verification reference ID
}
```

### Forgot Password Configuration

**File**: `src/configs/forgot-password.config.ts` **Interface**: `IConfigForgotPassword`

#### Configuration Keys:

**`expiredInMs`**: Reset link expiration

```typescript
expiredInMs: number; // Password reset expiration (ms('5m')); consumer converts to minutes
```

**`tokenLength`**: Reset token length

```typescript
tokenLength: number; // Length of password reset token
```

**`linkPattern`**: Reset link template

```typescript
linkPattern: string; // Full password reset link template ('{homeUrl}/forgot-password/{token}')
```

**`resendInMs`**: Resend cooldown period

```typescript
resendInMs: number; // Minimum time between resend attempts (ms('2m')); consumer converts to minutes
```

**`reference`**: Reset reference configuration

```typescript
reference: {
    prefix: string; // Prefix for reset references
    length: number; // Length of reset reference ID
}
```

### Home Configuration

**File**: `src/configs/home.config.ts` **Interface**: `IConfigHome`

#### Configuration Keys:

**`name`**: Organization/application name

```typescript
name: string; // Display name for organization/application
```

**`url`**: Organization/home URL

```typescript
url: string; // URL for organization/home page
```

### Session Configuration

**File**: `src/configs/session.config.ts` **Interface**: `IConfigSession`

#### Configuration Keys:

**`keyPattern`**: Session key pattern

```typescript
keyPattern: string; // Redis key pattern for user sessions ('User:{userId}:Session:{sessionId}')
```

### Term Policy Configuration

**File**: `src/configs/term-policy.config.ts` **Interface**: `IConfigTermPolicy`

#### Configuration Keys:

**`uploadContentPath`**: Upload path pattern for policy content

```typescript
uploadContentPath: string; // Path pattern for uploading policy content files
```

**`contentPublicPath`**: Public path for policy content

```typescript
contentPublicPath: string; // Public path for accessing policy content
```

### Feature Flag Configuration

**File**: `src/configs/feature-flag.config.ts` **Interface**: `IConfigFeatureFlag`

#### Configuration Keys:

**`keyPattern`**: Cache key pattern for feature flags

```typescript
keyPattern: string; // Redis cache key pattern for feature flag data ('FeatureFlag:{key}')
```

**`cacheTtlInMs`**: Cache TTL for feature flags

```typescript
cacheTtlInMs: number; // Cache TTL in milliseconds for feature flag data
```

**`anonymous`**: Anonymous evaluation identity configuration

```typescript
anonymous: {
    idMaxLength: number; // Maximum anonymous id length (default: 100)
    idRegex: RegExp; // Regular expression a valid anonymous id matches (/^[a-zA-Z0-9-_]+$/)
}
```

The anonymous id arrives in the `x-anonymous-id` header, named by the constant `FeatureFlagAnonymousIdHeaderName` in `src/modules/feature-flag/constants/feature-flag.constant.ts`.

### Response Configuration

**File**: `src/configs/response.config.ts` **Interface**: `IConfigResponse`

#### Configuration Keys:

**`keyPattern`**: Cache key pattern for API responses

```typescript
keyPattern: string; // Cache key pattern for API response data ('Apis:{key}')
```

**`filenameExportPattern`**: Default filename pattern for file exports (`ResponseFileInterceptor`)

```typescript
filenameExportPattern: string; // e.g. 'export-{timestamp}.{extension}'
```

The `{timestamp}` and `{extension}` placeholders are replaced at runtime.

### Firebase Configuration

**File**: `src/configs/firebase.config.ts`  
**Interface**: `IConfigFirebase`

#### Configuration Keys:

**`projectId`**: Firebase project ID

```typescript
projectId: string | null; // Firebase project ID from Firebase console
```

**`clientEmail`**: Firebase service account email

```typescript
clientEmail: string | null; // Firebase service account client email
```

**`privateKey`**: Firebase service account private key

```typescript
privateKey: string | null; // Service account private key (PEM), verbatim from the env var
```

`FirebaseUtil.normalizePrivateKey` turns escaped `\n` sequences into real newlines when `FirebaseService` reads it.

> [!NOTE]
>
> - The three Firebase fields are all set or all unset: `AppEnvSchema` rejects a partial set at boot.
> - With all three unset, push delivery is off.
> - The `FirebaseConfig` is registered in `src/configs/index.ts` alongside other config modules.

### Queue Configuration

**File**: `src/configs/queue.config.ts` **Interface**: `IConfigQueue`

#### Configuration Keys:

**`job`**: Default job options

```typescript
job: {
    attempts: number; // Retry attempts per job (default: 3)
    keepLogs: number; // Log lines BullMQ keeps per job (default: 20)
    removeOnCompleteAgeInSeconds: number; // How long a completed job is kept (`ms('7d') / 1000`)
    removeOnFailAgeInSeconds: number; // How long a failed job is kept (`ms('14d') / 1000`)
    emailBackoffDelayInMs: number; // Email queue exponential backoff delay (ms('10s'))
    pushBackoffDelayInMs: number; // Push queue exponential backoff delay (ms('5s'))
    notificationBackoffDelayInMs: number; // Notification queue exponential backoff delay (ms('3s'))
    workspaceBackoffDelayInMs: number; // Workspace queue exponential backoff delay (ms('10s'))
}
```

### Health Configuration

**File**: `src/configs/health.config.ts` **Interface**: `IConfigHealth`

#### Configuration Keys:

**`memoryRssThresholdInBytes`**: RSS memory threshold

```typescript
memoryRssThresholdInBytes: number; // RSS memory alert threshold in bytes (bytes('300mb'))
```

**`memoryHeapThresholdInBytes`**: Heap memory threshold

```typescript
memoryHeapThresholdInBytes: number; // Heap memory alert threshold in bytes (bytes('300mb'))
```

**`diskThresholdPercent`**: Disk usage threshold

```typescript
diskThresholdPercent: number; // Disk usage alert threshold as a fraction (default: 0.75)
```

**`diskPath`**: Disk path checked

```typescript
diskPath: string; // Filesystem path checked for storage (default: '/')
```

**`gracefulShutdownTimeoutInMs`**: Terminus graceful-shutdown window

```typescript
gracefulShutdownTimeoutInMs: number; // How long Terminus keeps serving after a shutdown signal (ms('30s'))
```

### Notification Configuration

**File**: `src/configs/notification.config.ts` **Interface**: `IConfigNotification`

#### Configuration Keys:

**`dedupTtlInMs`**: Default deduplication TTL

```typescript
dedupTtlInMs: number; // BullMQ deduplication TTL for a notification job (ms('1s'))
```

**`push`**: Push cleanup settings

```typescript
push: {
    cleanupStaleTokensCron: string; // Cron pattern for the stale-token cleanup (default: '0 0 * * *')
    staleTokenThresholdInMs: number; // Device inactivity after which its push token is cleared (ms('30d'))
}
```

### File Configuration

**File**: `src/configs/file.config.ts` **Interface**: `IConfigFile`

#### Configuration Keys:

**`maxDataImport`**: CSV import row cap

```typescript
maxDataImport: number; // Maximum rows accepted in a CSV import (default: 100)
```

`FileCsvValidationPipe` reads it unless the route passes its own config key.

**`maxDataExport`**: CSV export row cap

```typescript
maxDataExport: number; // Maximum data rows in a CSV export (default: 1000)
```

- `ResponseFileInterceptor` reads it unless the route passes its own config key through `@ResponseFile`.
- One row more raises `FileExceedMaxDataExportException`.

**`importValidationConcurrency`**: CSV row validation chunk size

```typescript
importValidationConcurrency: number; // Rows `FileCsvValidationPipe` validates concurrently per chunk (default: 10)
```

Chunks run one after another, and the rows keep their input order.

**`maxSizeExportInBytes`**: Export file size cap

```typescript
maxSizeExportInBytes: number; // Largest file `ResponseFileInterceptor` sends (bytes('2mb'))
```

A larger buffer raises `FileExceedMaxSizeExportException`.

### Workspace Configuration

**File**: `src/configs/workspace.config.ts` **Interface**: `IConfigWorkspace`

#### Configuration Keys:

The workspace header and its request-store key are constants in `src/common/request/constants/request.constant.ts`: `RequestWorkspaceIdHeaderName` (`x-workspace-id`) and `RequestWorkspaceIdStoreKey`.

**`maxWorkspacesPerUser`**: Workspace ownership cap

```typescript
maxWorkspacesPerUser: number; // Maximum workspaces a single user may own (default: 10)
```

**`personalNamePattern`**: Personal workspace name template

```typescript
personalNamePattern: string; // Name template for the personal workspace ("{username}'s Workspace")
```

**`slugPrefix`**: Workspace slug prefix

```typescript
slugPrefix: string; // Prefix applied to generated workspace slugs (default: 'w-')
```

**`slugRegex`**: Workspace slug validation expression

```typescript
slugRegex: RegExp; // Regular expression a valid workspace slug matches
```

**`slugMaxLength`**: Workspace slug length cap

```typescript
slugMaxLength: number; // Maximum slug length (default: 30)
```

**`slugMaxAttempts`**: Workspace slug generation retries

```typescript
slugMaxAttempts: number; // Maximum attempts to generate a unique slug (default: 5)
```

**`invite`**: Workspace invitation configuration

```typescript
invite: {
    expiredInDays: number; // Invitation validity in days (default: 7)
    tokenLength: number; // Length of the invitation token (default: 100)
    referencePrefix: string; // Prefix for invitation references (default: 'WIN')
    referenceRandomLength: number; // Random part length of the invitation reference (default: 25)
    linkPattern: string; // Claim link template for an invitee who already has an account ('{homeUrl}/workspace/invites/{token}')
    signUpLinkPattern: string; // Sign-up link template for an invitee without an account ('{homeUrl}/sign-up?inviteToken={token}')
    expirySweepCron: string; // Cron pattern for the invitation expiry sweep (default: '0 0 * * *')
}
```

**`joinRequest`**: Workspace join request configuration

```typescript
joinRequest: {
    reviewLinkPattern: string; // Review link template for a join request ('{homeUrl}/workspace/join-requests/{joinRequestId}')
}
```

### Project Configuration

**File**: `src/configs/project.config.ts` **Interface**: `IConfigProject`

#### Configuration Keys:

**`slugPrefix`**: Project slug prefix

```typescript
slugPrefix: string; // Prefix applied to generated project slugs (default: 'p-')
```

**`slugRegex`**: Project slug validation expression

```typescript
slugRegex: RegExp; // Regular expression a valid project slug matches
```

**`slugMaxLength`**: Project slug length cap

```typescript
slugMaxLength: number; // Maximum slug length (default: 30)
```

**`slugMaxAttempts`**: Project slug generation retries

```typescript
slugMaxAttempts: number; // Maximum attempts to generate a unique slug (default: 5)
```

### Analytic Configuration

**File**: `src/configs/analytic.config.ts` **Interface**: `IConfigAnalytic`

Live metric cache TTLs and key patterns, plus anomaly and fraud detection thresholds.

- Values are literals built with `ms(...)`, not environment-driven.
- Consumers: `AnalyticCache` and the analytic domains.
- Flow: [Analytic](analytic.md).

#### Configuration Keys:

**`cache`**: Redis key patterns and TTLs for dashboard, anomaly summary, fraud summary, and risk score entries

```typescript
cache: {
    dashboardTtlInMs: number; // Dashboard metric TTL (default: 1h)
    anomalySummaryTtlInMs: number; // Anomaly summary TTL (default: 5m)
    fraudSummaryTtlInMs: number; // Fraud summary TTL (default: 5m)
    riskScoreTtlInMs: number; // Per-user risk score TTL (default: 10m)
    keyPatterns: {
        dashboard: string; // Analytic:Dashboard:{metric}:{start}:{end}
        anomaly: string; // Analytic:Anomaly:{signal}:{window}
        fraud: string; // Analytic:Fraud:{signal}:{window}
        riskScore: string; // Analytic:Fraud:Risk:{userId}
    }
    windowTokenPattern: string; // '{start}:{end}'
    workspaceWindowTokenPattern: string; // '{workspaceId}:{start}:{end}'
}
```

- `AnalyticDateUtil` fills the two token patterns.
- `AnalyticCache` fills the four key patterns.
- A paginated dashboard metric appends `page=<n>:perPage=<n>` to its metric token, so one page of a list caches under its own key.

**`anomaly`**: Impossible-travel, login-spike, failed-login, device-proliferation, and login-time thresholds used by `AnalyticAnomalyDomain`

**`fraud`**: Credential-stuffing and related signal windows, risk weights, and band cutoffs used by `AnalyticFraudDomain`

- The band a score falls in is an `EnumAnalyticFraudBand` value (`monitor`, `review`, `elevate`, `critical`).
- `fraud.concurrency` (10) is the chunk size for the per-user lookups and risk scoring. Rows within a chunk run concurrently, and chunks run in sequence.

<!-- REFERENCES -->

[ref-doc-environment]: environment.md
[ref-doc-database]: database.md
[ref-doc-cache]: cache.md
[ref-doc-logger]: logger.md#startup-and-boot-failure
