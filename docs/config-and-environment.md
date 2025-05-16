# Overview

This document provides a detailed explanation of how configuration works in the ACK NestJS Boilerplate project, including the configuration files structure and environment variables used.

The project uses a modular configuration approach through the NestJS `ConfigModule`. Configuration is split into multiple dedicated files for different aspects of the application, making it easier to maintain and understand.

This documentation explains the features and usage of:
- **Config Module**: Located at `src/configs`
- **Env File**: Located at `.env`

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Configuration](#configuration)
    - [App Configuration](#app-configuration)
    - [Auth Configuration](#auth-configuration)
    - [Database Configuration](#database-configuration)
    - [AWS Configuration](#aws-configuration)
    - [Debug Configuration](#debug-configuration)
    - [Middleware Configuration](#middleware-configuration)
    - [Redis Configuration](#redis-configuration)
    - [User Configuration](#user-configuration)
    - [Documentation Configuration](#documentation-configuration)
    - [Message Configuration](#message-configuration)
    - [Email Configuration](#email-configuration)
    - [Verification Configuration](#verification-configuration)
    - [Reset Password Configuration](#reset-password-configuration)
    - [Home Configuration](#home-configuration)
    - [Helper Configuration](#helper-configuration)
  - [Environment Variables](#environment-variables)
    - [Application Settings](#application-settings)
    - [Database Settings](#database-settings)
    - [Authentication Settings](#authentication-settings)
    - [Social Authentication Settings](#social-authentication-settings)
    - [AWS Settings](#aws-settings)
    - [Redis Settings](#redis-settings)
    - [Debug Settings](#debug-settings)
    - [Middleware Settings](#middleware-settings)
    - [Home Settings](#home-settings)
  - [Conclusion](#conclusion)


## Configuration

The configuration files are located in the `/src/configs` directory and are loaded in the `CommonModule` using `ConfigModule.forRoot()`. Each configuration file is registered using the `registerAs` function from `@nestjs/config`.

### App Configuration

Contains general application settings:

```typescript
{
  name: process.env.APP_NAME,                                       // Application name used throughout the system
  env: process.env.APP_ENV,                                         // Current environment (development, production, etc.)
  timezone: process.env.APP_TIMEZONE,                               // Default timezone for date operations
  version: version,                                                 // Application version imported from package.json
  globalPrefix: '/api',                                             // Global prefix for all API endpoints
  http: {
    host: process.env.HTTP_HOST,                                    // Host for the HTTP server
    port: Number.parseInt(process.env.HTTP_PORT),                   // Port for the HTTP server
  },
  urlVersion: {
    enable: process.env.URL_VERSIONING_ENABLE === 'true',           // Whether to enable URL versioning
    prefix: 'v',                                                    // Prefix for version in URL (e.g., /v1/...)
    version: process.env.URL_VERSION,                               // Default API version
  },
}
```

### Auth Configuration

JWT and authentication related settings:

```typescript
{
  jwt: {
    accessToken: {
      kid: process.env.AUTH_JWT_ACCESS_TOKEN_KID,                   // Key ID for access token (used in JWKS)
      privateKeyPath: process.env.AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY_PATH, // Path to private key for signing access tokens
      publicKeyPath: process.env.AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY_PATH,   // Path to public key for verifying access tokens
      expirationTime: ms(process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED) / 1000, // Access token expiration in seconds
    },
    refreshToken: {
      kid: process.env.AUTH_JWT_REFRESH_TOKEN_KID,                  // Key ID for refresh token (used in JWKS)
      privateKeyPath: process.env.AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY_PATH, // Path to private key for signing refresh tokens
      publicKeyPath: process.env.AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY_PATH,   // Path to public key for verifying refresh tokens
      expirationTime: ms(process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRED) / 1000, // Refresh token expiration in seconds
    },
    algorithm: 'ES512',                                             // JWT signing algorithm (ES512 provides strong security)
    jwksUri: process.env.AUTH_JWT_JWKS_URI,                         // URI for JSON Web Key Set for token validation
    audience: process.env.AUTH_JWT_AUDIENCE,                        // JWT audience claim value
    issuer: process.env.AUTH_JWT_ISSUER,                            // JWT issuer claim value
    header: 'Authorization',                                        // HTTP header used for JWT
    prefix: 'Bearer',                                               // Prefix for JWT in the Authorization header
  },
  password: {
    attempt: true,                                                  // Whether to track login attempts
    maxAttempt: 5,                                                  // Maximum allowed failed login attempts
    saltLength: 8,                                                  // Length of salt for password hashing
    expiredIn: ms('182d') / 1000,                                   // Password expiration (0.5 years)
    expiredInTemporary: ms('3d') / 1000,                            // Temporary password expiration (3 days)
    period: ms('90d') / 1000,                                   // Password renewal period (3 months)
  },
  apple: {
    header: 'Authorization',                                        // HTTP header for Apple auth
    prefix: 'Bearer',                                               // Prefix for Apple auth token
    clientId: process.env.AUTH_SOCIAL_APPLE_CLIENT_ID,              // Apple OAuth client ID
    signInClientId: process.env.AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID,// Apple Sign In client ID
  },
  google: {
    header: 'Authorization',                                        // HTTP header for Google auth
    prefix: 'Bearer',                                               // Prefix for Google auth token
    clientId: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_ID,             // Google OAuth client ID
    clientSecret: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_SECRET,     // Google OAuth client secret
  },
  xApiKey: {
    header: 'x-api-key',                                            // HTTP header for API key authentication
  },
}
```

### Database Configuration

Database connection settings:

```typescript
{
  url: process.env.DATABASE_URL,                                    // MongoDB connection string
  debug: process.env.DATABASE_DEBUG === 'true',                     // Enable/disable database debug mode
  timeoutOptions: {},                                               // MongoDB timeout options (empty by default)
}
```

### AWS Configuration

Settings for AWS services:

```typescript
{
  s3: {
    presignExpired: 30 * 60,                                        // Presigned URL expiration time (30 mins in seconds)
    config: {
      public: {
        credential: {
          key: process.env.AWS_S3_PUBLIC_CREDENTIAL_KEY,            // AWS access key for public bucket
          secret: process.env.AWS_S3_PUBLIC_CREDENTIAL_SECRET,      // AWS secret key for public bucket
        },
        bucket: process.env.AWS_S3_PUBLIC_BUCKET ?? 'bucketPublic', // S3 public bucket name (with fallback)
        region: process.env.AWS_S3_PUBLIC_REGION,                   // AWS region for public bucket
        baseUrl: `https://${process.env.AWS_S3_PUBLIC_BUCKET}.s3.${process.env.AWS_S3_PUBLIC_REGION}.amazonaws.com`, // S3 base URL
        cdnUrl: process.env.AWS_S3_PUBLIC_CDN ? `https://${process.env.AWS_S3_PUBLIC_CDN}` : undefined, // CDN URL if available
      },
      private: {
        credential: {
          key: process.env.AWS_S3_PRIVATE_CREDENTIAL_KEY,           // AWS access key for private bucket
          secret: process.env.AWS_S3_PRIVATE_CREDENTIAL_SECRET,     // AWS secret key for private bucket
        },
        bucket: process.env.AWS_S3_PRIVATE_BUCKET ?? 'bucketPrivate', // S3 private bucket name (with fallback)
        region: process.env.AWS_S3_PRIVATE_REGION,                  // AWS region for private bucket
        baseUrl: `https://${process.env.AWS_S3_PRIVATE_BUCKET}.s3.${process.env.AWS_S3_PRIVATE_REGION}.amazonaws.com`, // S3 base URL
        cdnUrl: process.env.AWS_S3_PRIVATE_CDN ? `https://${process.env.AWS_S3_PRIVATE_CDN}` : undefined, // CDN URL if available
      },
    },
  },
  ses: {
    credential: {
      key: process.env.AWS_SES_CREDENTIAL_KEY,                      // AWS access key for SES (email service)
      secret: process.env.AWS_SES_CREDENTIAL_SECRET,                // AWS secret key for SES
    },
    region: process.env.AWS_SES_REGION,                             // AWS region for SES
  },
  pinpoint: {
    credential: {
      key: process.env.AWS_PINPOINT_CREDENTIAL_KEY,                 // AWS access key for Pinpoint (mobile push notifications and SMS service)
      secret: process.env.AWS_PINPOINT_CREDENTIAL_SECRET,           // AWS secret key for Pinpoint
    },
    region: process.env.AWS_PINPOINT_REGION,                        // AWS region for Pinpoint
    applicationId: process.env.AWS_PINPOINT_APPLICATION_ID,         // Pinpoint application ID
  },
}
```

### Debug Configuration

Debugging and logging settings:

```typescript
{
  enable: process.env.DEBUG_ENABLE === 'true',                      // Enable/disable debug mode
  level: process.env.DEBUG_LEVEL,                                   // Log level (debug, info, warn, error)
  intoFile: process.env.DEBUG_INTO_FILE === 'true',                 // Whether to write logs to file
  filePath: '/logs',                                                // Path for log files
  autoLogger: false,                                                // Whether to enable automatic logging
  prettier: process.env.DEBUG_PRETTIER === 'true',                  // Format logs for readability
  sentry: {
    dsn: process.env.SENTRY_DSN,                                    // Sentry DSN for error tracking
    timeout: ms('10s'),                                             // Sentry timeout setting (fixed at 10 seconds)
  },
}
```

### Middleware Configuration

Settings for middleware components:

```typescript
{
  body: {
    json: {
      maxFileSize: bytes('100kb'),                                 // Maximum size for JSON requests
    },
    raw: {
      maxFileSize: bytes('100kb'),                                 // Maximum size for raw body requests
    },
    text: {
      maxFileSize: bytes('100kb'),                                 // Maximum size for text requests
    },
    urlencoded: {
      maxFileSize: bytes('100kb'),                                 // Maximum size for URL-encoded requests
    },
  },
  timeout: ms('30s'),                                              // Request timeout (30 seconds)
  cors: {
    allowMethod: ['GET', 'DELETE', 'PUT', 'PATCH', 'POST', 'HEAD'], // Allowed HTTP methods for CORS
    allowOrigin: process.env.MIDDLEWARE_CORS_ORIGIN?.split(',') ?? [], // Allowed origins for CORS
    allowHeader: [
      // Various headers allowed for CORS requests
      'Accept',
      'Accept-Language',
      'Content-Language',
      'Content-Type',
      'Origin',
      'Authorization',
      // ...and many more headers for proper CORS support
      'x-api-key',                                                 // For API key authentication
      'x-part-number',                                             // For multipart uploads
      // ...more headers
    ],
  },
  throttle: {
    ttl: ms('500'),                                                // Rate limiting period (0.5 seconds)
    limit: 10,                                                     // Maximum requests per ttl period
  },
}
```

### Redis Configuration

Redis settings for caching and queues:

```typescript
{
  cached: {
    host: process.env.REDIS_HOST,                                  // Redis server hostname for caching
    port: Number.parseInt(process.env.REDIS_PORT),                 // Redis server port for caching
    password: process.env.REDIS_PASSWORD,                          // Redis password for caching
    username: process.env.REDIS_USERNAME,                          // Redis username for caching
    ttl: 5 * 60 * 1000,                                            // Cache TTL (5 minutes)
    max: 10,                                                       // Maximum cache size
  },
  queue: {
    host: process.env.REDIS_HOST,                                  // Redis server hostname for queues
    port: Number.parseInt(process.env.REDIS_PORT),                 // Redis server port for queues
    password: process.env.REDIS_PASSWORD,                          // Redis password for queues
    username: process.env.REDIS_USERNAME,                          // Redis username for queues
  },
}
```

### User Configuration

User-related settings:

```typescript
{
  usernamePrefix: 'user',                                           // Prefix for auto-generated usernames
  usernamePattern: /^[a-zA-Z0-9-_]+$/,                              // Regex pattern for valid usernames
  uploadPath: '/users/{user}',                                       // Path template for user file uploads
}
```

### Documentation Configuration

Swagger documentation settings:

```typescript
{
  name: `${process.env.APP_NAME} APIs Specification`,              // Documentation title
  description: 'Section for describe whole APIs',                  // Documentation description
  prefix: '/docs',                                                 // Path prefix for API documentation
}
```

### Message Configuration

Internationalization settings:

```typescript
{
  availableLanguage: Object.values(ENUM_MESSAGE_LANGUAGE),         // List of supported languages
  language: process.env.APP_LANGUAGE,                              // Default application language
}
```

### Email Configuration

Default email addresses for system communications:

```typescript
{
  fromEmail: 'noreply@mail.com',                                  // Default sender email address
  supportEmail: 'support@mail.com',                               // Support email address
}
```

### Verification Configuration

Settings for verification processes:

```typescript
{
  expiredInMinutes: 5,                                             // OTP expiration time in minutes
  otpLength: 6,                                                    // Length of OTP code
  reference: {
    prefix: 'VER',                                                 // Prefix for verification references
    length: 10,                                                    // Length of verification reference
  },
}
```

### Reset Password Configuration

Settings for password reset functionality:

```typescript
{
    expiredInMinutes: 5,                                           // Password reset link expiration time
    otpLength: 6,                                                  // Length of OTP for password reset
    tokenLength: 20,                                               // Length of reset token
    prefixUrl: 'reset-password',                                   // URL prefix for password reset
    reference: {
        prefix: 'RES',                                             // Prefix for reset references
        length: 10,                                                // Length of reset reference
    },
}
```

### Home Configuration

Settings for the home/landing page:

```typescript
{
  name: process.env.HOME_NAME,                                     // Name for the home/landing page
  url: process.env.HOME_URL,                                       // URL for the home/landing page
}
```

### Helper Configuration

Common utility settings:

```typescript
{
  salt: {
    length: 8,                                                     // Length of salt for various hashing operations
  },
}
```

## Environment Variables

The application uses a `.env` file to store environment-specific values. These values are validated using the `AppEnvDto` class to ensure all required variables are present and properly formatted.

> **Note**: You can find an example configuration in the `.env.example` file in the project root directory. This file provides a template with all supported environment variables and their expected formats.

Here's a comprehensive list of supported environment variables:

### Application Settings
- **`APP_NAME`** (required): Name of the application
- **`APP_ENV`** (required): Environment type (development, production, etc.) based on `ENUM_APP_ENV`
- **`APP_TIMEZONE`** (required): Timezone for the application (e.g., Asia/Jakarta)
- **`APP_LANGUAGE`** (required): Default language for the application (e.g., en)
- **`HTTP_HOST`** (required): Host for the HTTP server (e.g., localhost)
- **`HTTP_PORT`** (required): Port for the HTTP server (e.g., 3000)
- **`URL_VERSIONING_ENABLE`** (required): Enable/disable URL versioning (true/false)
- **`URL_VERSION`** (required): Default URL version number (e.g., 1)

### Database Settings
- **`DATABASE_URL`** (required): MongoDB connection string (e.g., mongodb://localhost:27017/db)
- **`DATABASE_DEBUG`** (required): Enable/disable database debug mode (true/false)

### Authentication Settings
- **`AUTH_JWT_AUDIENCE`** (required): JWT audience claim value
- **`AUTH_JWT_ISSUER`** (required): JWT issuer claim value
- **`AUTH_JWT_JWKS_URI`** (required): JWKS URI for JWT verification

- **`AUTH_JWT_ACCESS_TOKEN_KID`** (required): Key ID for access token
- **`AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY_PATH`** (required): Path to private key for access token
- **`AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY_PATH`** (required): Path to public key for access token
- **`AUTH_JWT_ACCESS_TOKEN_EXPIRED`** (required): Access token expiration time (e.g., 1h)

- **`AUTH_JWT_REFRESH_TOKEN_KID`** (required): Key ID for refresh token
- **`AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY_PATH`** (required): Path to private key for refresh token
- **`AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY_PATH`** (required): Path to public key for refresh token
- **`AUTH_JWT_REFRESH_TOKEN_EXPIRED`** (required): Refresh token expiration time (e.g., 7d)

### Social Authentication Settings
- **`AUTH_SOCIAL_GOOGLE_CLIENT_ID`** (optional): Google OAuth client ID
- **`AUTH_SOCIAL_GOOGLE_CLIENT_SECRET`** (optional): Google OAuth client secret
- **`AUTH_SOCIAL_APPLE_CLIENT_ID`** (optional): Apple OAuth client ID
- **`AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID`** (optional): Apple Sign In client ID

### AWS Settings
- **`AWS_S3_PUBLIC_CREDENTIAL_KEY`** (optional): AWS S3 public bucket access key
- **`AWS_S3_PUBLIC_CREDENTIAL_SECRET`** (optional): AWS S3 public bucket secret key
- **`AWS_S3_PUBLIC_REGION`** (optional): AWS S3 public bucket region
- **`AWS_S3_PUBLIC_BUCKET`** (optional): AWS S3 public bucket name
- **`AWS_S3_PUBLIC_CDN`** (optional): AWS S3 public CDN URL

- **`AWS_S3_PRIVATE_CREDENTIAL_KEY`** (optional): AWS S3 private bucket access key
- **`AWS_S3_PRIVATE_CREDENTIAL_SECRET`** (optional): AWS S3 private bucket secret key
- **`AWS_S3_PRIVATE_REGION`** (optional): AWS S3 private bucket region
- **`AWS_S3_PRIVATE_BUCKET`** (optional): AWS S3 private bucket name
- **`AWS_S3_PRIVATE_CDN`** (optional): AWS S3 private CDN URL

- **`AWS_SES_CREDENTIAL_KEY`** (optional): AWS SES access key
- **`AWS_SES_CREDENTIAL_SECRET`** (optional): AWS SES secret key
- **`AWS_SES_REGION`** (optional): AWS SES region

- **`AWS_PINPOINT_CREDENTIAL_KEY`** (optional): AWS Pinpoint access key
- **`AWS_PINPOINT_CREDENTIAL_SECRET`** (optional): AWS Pinpoint secret key
- **`AWS_PINPOINT_REGION`** (optional): AWS Pinpoint region
- **`AWS_PINPOINT_APPLICATION_ID`** (optional): AWS Pinpoint application ID

### Redis Settings
- **`REDIS_HOST`** (required): Redis server hostname
- **`REDIS_PORT`** (required): Redis server port
- **`REDIS_USERNAME`** (optional): Redis username
- **`REDIS_PASSWORD`** (optional): Redis password
- **`REDIS_TLS_ENABLE`** (optional): Enable TLS for Redis connections (true/false)

### Debug Settings
- **`DEBUG_ENABLE`** (required): Enable/disable debug mode (true/false)
- **`DEBUG_LEVEL`** (required): Debug log level (debug, info, warn, error)
- **`DEBUG_INTO_FILE`** (required): Write debug logs to file (true/false)
- **`DEBUG_PRETTIER`** (required): Format debug logs (true/false)
- **`SENTRY_DSN`** (optional): Sentry DSN for error reporting

### Middleware Settings
- **`MIDDLEWARE_CORS_ORIGIN`** (required): Comma-separated list of allowed CORS origins

### Home Settings
- **`HOME_NAME`** (required): Display Name for the application
- **`HOME_URL`** (required): URL for the home/landing page

## Conclusion

The configuration system in ACK NestJS Boilerplate is designed to be modular, type-safe, and environment-aware. By separating configuration into logical modules, the application becomes more maintainable and easier to understand. The validation of environment variables ensures that the application won't start with an invalid configuration.

For quick setup of your local environment, copy the `.env.example` file to a new `.env` file and update the values as needed for your development environment.