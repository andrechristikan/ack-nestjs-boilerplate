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
  - [CORS Settings](#cors-settings)
  - [URL Versioning Settings](#url-versioning-settings)
  - [Database Settings](#database-settings)
  - [Authentication Settings](#authentication-settings)
  - [Social Authentication Settings](#social-authentication-settings)
  - [Two-Factor Authentication Settings](#two-factor-authentication-settings)
  - [AWS Settings](#aws-settings)
  - [Email Settings](#email-settings)
  - [Firebase Settings](#firebase-settings)
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
APP_ENCRYPTION_SECRET_KEY=qwerty1234567890abcdefghijklmnop

# Home/Organization
HOME_URL=https://example.com
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

# CORS
CORS_ALLOWED_ORIGIN=*

# URL Versioning
URL_VERSIONING_ENABLE=true
URL_VERSION=1

# Database
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?retryWrites=true&w=majority&replicaSet=rs0
DATABASE_DEBUG=true

# JWT Authentication
AUTH_JWT_ISSUER=https://example.com
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

# Two-Factor Authentication
AUTH_TWO_FACTOR_ISSUER=ACKNestJsTwoFactor
AUTH_TWO_FACTOR_ENCRYPTION_KEY=qwerty1234567890

# Social Authentication (Optional)
AUTH_SOCIAL_GOOGLE_CLIENT_ID=
AUTH_SOCIAL_GOOGLE_CLIENT_SECRET=
AUTH_SOCIAL_APPLE_CLIENT_ID=
AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID=

# AWS S3 Configuration (Optional)
AWS_S3_IAM_CREDENTIAL_KEY=
AWS_S3_IAM_CREDENTIAL_SECRET=
AWS_S3_IAM_ARN=
AWS_S3_REGION=ap-southeast-3
AWS_S3_PUBLIC_BUCKET=
AWS_S3_PUBLIC_CDN=
AWS_S3_PRIVATE_BUCKET=
AWS_S3_PRIVATE_CDN=

# AWS SES Configuration (Optional)
AWS_SES_IAM_CREDENTIAL_KEY=
AWS_SES_IAM_CREDENTIAL_SECRET=
AWS_SES_IAM_ARN=
AWS_SES_REGION=ap-southeast-3

# Email
EMAIL_NO_REPLY=no-reply@mail.com
EMAIL_SUPPORT=support@mail.com
EMAIL_ADMIN=admin@mail.com

# Firebase (Optional)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Redis
CACHE_REDIS_URL=redis://localhost:6379/0
QUEUE_REDIS_URL=redis://localhost:6379/1

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

**`APP_ENCRYPTION_SECRET_KEY`** *(required)*  
Secret key used to derive an AES-256 encryption key for encrypting sensitive data (recommended 32+ characters).
```bash
APP_ENCRYPTION_SECRET_KEY=qwerty1234567890abcdefghijklmnop
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
HOME_URL=https://example.com
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

### CORS Settings

**`CORS_ALLOWED_ORIGIN`** *(required)*  
Comma-separated list of allowed CORS origins. Supports subdomain wildcards and explicit ports, but not port wildcards.

**Syntax:**
- `*` — Allow all origins (credentials disabled)
- `hostname` — Single origin (e.g., `example.com`)
- `*.subdomain` — Wildcard subdomains (e.g., `*.example.com` matches `api.example.com` and `example.com`)
- `hostname:port` — Specific hostname with port (e.g., `api.example.com:3000`)
- `*.subdomain:port` — Wildcard with explicit port (e.g., `*.example.com:3000`)

**Examples:**
```bash
# Allow all origins (development only) — credentials NOT allowed
CORS_ALLOWED_ORIGIN=*

# Specific origins
CORS_ALLOWED_ORIGIN=example.com,app.example.com

# Subdomain wildcard (matches api.example.com and example.com)
CORS_ALLOWED_ORIGIN=*.example.com,api.myapp.com

# Multiple domains with explicit ports
CORS_ALLOWED_ORIGIN=*.example.com:3000,api.myapp.com:8080,localhost:3000

# Mixed — wildcards and specific ports
CORS_ALLOWED_ORIGIN=*.example.com,api.production.com:443,localhost:3000
```

**Port Matching Behavior:**
```bash
# ✅ SUPPORTED — Exact port matching
CORS_ALLOWED_ORIGIN=api.example.com:3000  # Matches: http://api.example.com:3000, https://api.example.com:3000

# ❌ NOT SUPPORTED — Port wildcards
CORS_ALLOWED_ORIGIN=api.example.com:*     # Does NOT work

# ✅ SUPPORTED — Default port (implicit)
CORS_ALLOWED_ORIGIN=api.example.com       # Matches: http://api.example.com, https://api.example.com (no explicit port)
```

**Protocol Behavior:**
- Both `http` and `https` are automatically allowed for the same origin
- Protocol is **not** part of the pattern (no need to specify `https://` in the pattern)

**Credentials Behavior:**
- **Wildcard (`*`)**: Credentials are **disabled** (CORS security restriction)
- **Specific origins**: Credentials are **enabled**

> **Best Practice**: For production, always specify explicit origins instead of using wildcard. Wildcard origins with credentials disabled should only be used in development environments.

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
AUTH_JWT_ISSUER=https://example.com
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
AUTH_TWO_FACTOR_ISSUER=ACKNestJsTwoFactor
```

**`AUTH_TWO_FACTOR_ENCRYPTION_KEY`** *(required for 2FA)*  
Secret used to derive an AES-256 key for encrypting TOTP secrets (recommended 32+ chars).  
```bash
AUTH_TWO_FACTOR_ENCRYPTION_KEY=qwerty1234567890
```

### AWS Settings

> **Note**: AWS settings are optional by default. However, if you want to test file uploads (S3) or email functionality (SES), these become required for those specific features to work.

#### S3 Configuration

**`AWS_S3_IAM_CREDENTIAL_KEY`** *(optional/required for file uploads)*  
AWS IAM access key ID for S3 bucket operations.
```bash
AWS_S3_IAM_CREDENTIAL_KEY=
```

**`AWS_S3_IAM_CREDENTIAL_SECRET`** *(optional/required for file uploads)*  
AWS IAM secret access key for S3 bucket operations.
```bash
AWS_S3_IAM_CREDENTIAL_SECRET=
```

**`AWS_S3_IAM_ARN`** *(optional)*  
AWS IAM Role ARN for S3 operations. Used for role-based access control and temporary credentials.
```bash
AWS_S3_IAM_ARN=
```

> **Best Practice**: Using IAM Role ARN (`AWS_S3_IAM_ARN`) is recommended over long-lived credentials for production environments as it provides:
> - Temporary security credentials
> - Better security through role assumption
> - Fine-grained access control
> - Automatic credential rotation

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

**`AWS_SES_IAM_CREDENTIAL_KEY`** *(optional/required for email features)*  
AWS IAM access key ID for SES email service.
```bash
AWS_SES_IAM_CREDENTIAL_KEY=
```

**`AWS_SES_IAM_CREDENTIAL_SECRET`** *(optional/required for email features)*  
AWS IAM secret access key for SES email service.
```bash
AWS_SES_IAM_CREDENTIAL_SECRET=
```

**`AWS_SES_IAM_ARN`** *(optional)*  
AWS IAM Role ARN for SES operations. Used for role-based access control and temporary credentials.
```bash
AWS_SES_IAM_ARN=
```

> **Best Practice**: Using IAM Role ARN (`AWS_SES_IAM_ARN`) is recommended over long-lived credentials for production environments as it provides:
> - Temporary security credentials
> - Better security through role assumption
> - Fine-grained access control
> - Automatic credential rotation

**`AWS_SES_REGION`** *(optional/required for email features)*  
AWS region for SES service.
```bash
AWS_SES_REGION=ap-southeast-3
```

### Email Settings

> **Note**: Email settings are optional.

**`EMAIL_NO_REPLY`** *(optional/required for email features)*  
Sender email address used for no-reply emails (e.g., transactional, notifications).
```bash
EMAIL_NO_REPLY=no-reply@mail.com
```

**`EMAIL_SUPPORT`** *(optional/required for email features)*  
Support email address shown in email templates.
```bash
EMAIL_SUPPORT=support@mail.com
```

**`EMAIL_ADMIN`** *(optional/required for email features)*  
Admin email address for internal notifications.
```bash
EMAIL_ADMIN=admin@mail.com
```

### Firebase Settings

> **Note**: Firebase settings are optional. Required only if push notification features are enabled.

**`FIREBASE_PROJECT_ID`** *(optional/required for push notifications)*  
Firebase project ID from your Firebase console.
```bash
FIREBASE_PROJECT_ID=
```

**`FIREBASE_CLIENT_EMAIL`** *(optional/required for push notifications)*  
Firebase service account client email.
```bash
FIREBASE_CLIENT_EMAIL=
```

**`FIREBASE_PRIVATE_KEY`** *(optional/required for push notifications)*  
Firebase service account private key. Replace newlines with `\n` when storing in `.env`.
```bash
FIREBASE_PRIVATE_KEY=
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

[ref-doc-configuration]: configuration.md
[ref-doc-installation]: installation.md
[ref-doc-database]: database.md
[ref-doc-authentication]: authentication.md