# Environment Documentation

Environment variables are listed in `.env.example`.

## Overview

- Runtime config is environment variables. `AppEnvSchema` validates them at startup.
- Docker Compose is the recommended way to run MongoDB and Redis locally, described in [Installation][ref-doc-installation].
- The optional `DOCKER_*` variables configure Compose itself.
- The application does not read them: see [Docker Settings](#docker-settings).

## Related Documents

- [Configuration Documentation][ref-doc-configuration]: How env vars map into `registerAs` configs
- [Installation Documentation][ref-doc-installation]: Creating `.env` (Docker recommended)
- [Database Documentation][ref-doc-database]: MongoDB connection and replica set
- [Authentication Documentation][ref-doc-authentication]: JWT and OAuth
- [Vault Documentation][ref-doc-vault]: Optional secret sync into `.env`
- [Email Documentation][ref-doc-email]: SES templates
- [Logger Documentation][ref-doc-logger]: Boot failure logging and the logger variables

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
    - [Docker Settings](#docker-settings)

## Environment Validation

`process.env` is validated against a zod schema handed to `ConfigModule.forRoot()` in `src/common/common.module.ts`. The check runs while the module graph is being built, before any provider resolves a config value:

```typescript
ConfigModule.forRoot({
    load: configs,
    isGlobal: true,
    cache: true,
    envFilePath: ['.env'],
    expandVariables: false,
    validationSchema: AppEnvSchema,
}),
```

`AppEnvSchema` is located at `src/app/dtos/app.env.dto.ts`. Field shapes:

- An env boolean is `RequestBooleanStringSchema` (a case-sensitive `z.stringbool` accepting exactly `'true'` or `'false'`)
- An encryption secret is `RequestEncryptionSecretSchema` (exactly 64 base64url characters)
- A port is `z.coerce.number().int()`
- An enum-valued variable is `z.enum` over the matching `Enum*`, so a typo is caught by name at boot
- A third-party key is one of the named instances in `src/common/request/validations/request.optional-env.validation.ts`, each piped from `RequestOptionalEnvSchema`:
    - An absent value and a blank `.env` line (`KEY=`) both parse to `null`.
    - Any other value satisfies the inner schema.
    - The named instances:
        - `RequestOptionalEnvStringSchema`: a non-empty string (social client IDs, AWS credentials, regions, buckets, CDNs, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `HTTP_TRUSTED_PROXY`)
        - `RequestOptionalEnvEmailSchema`: an email checked by `RequestEmailSchema` (`EMAIL_NO_REPLY`, `EMAIL_SUPPORT`, `FIREBASE_CLIENT_EMAIL`)
        - `RequestOptionalEnvSesIdentityArnSchema`: an SES identity ARN (`AWS_SES_IDENTITY_ARN`)
        - `RequestOptionalEnvUrlNoTrailingSlashSchema`: an absolute URL without a trailing slash (`AWS_S3_ENDPOINT`, `AWS_SES_ENDPOINT`)
        - `RequestOptionalEnvUrlSchema`: an absolute URL (`SENTRY_DSN`)

The config files under `src/configs/` read each optional key as `process.env.KEY === '' ? null : (process.env.KEY ?? null)`:

- An absent value and a blank line both read as `null`.
- A config interface field is therefore `string | null`.
- The other read shapes are in [Configuration][ref-doc-configuration].

Each third-party integration is optional and validated as a group by a `superRefine` on `AppEnvSchema`:

| Integration | Turned on by | Then required |
| --- | --- | --- |
| AWS S3 | `AWS_S3_IAM_CREDENTIAL_KEY` or `AWS_S3_IAM_CREDENTIAL_SECRET` | `AWS_S3_IAM_CREDENTIAL_KEY`, `AWS_S3_IAM_CREDENTIAL_SECRET`, `AWS_S3_REGION`, `AWS_S3_PUBLIC_BUCKET`, `AWS_S3_PRIVATE_BUCKET` |
| AWS SES | `AWS_SES_IAM_CREDENTIAL_KEY` or `AWS_SES_IAM_CREDENTIAL_SECRET` | `AWS_SES_IAM_CREDENTIAL_KEY`, `AWS_SES_IAM_CREDENTIAL_SECRET`, `AWS_SES_REGION`, `EMAIL_NO_REPLY`, `EMAIL_SUPPORT` |
| Firebase | any `FIREBASE_*` key | all three `FIREBASE_*` keys |
| Google sign-in | `AUTH_SOCIAL_GOOGLE_CLIENT_ID` | nothing else |
| Apple sign-in | `AUTH_SOCIAL_APPLE_CLIENT_ID` or `AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID` | nothing else |
| Sentry | `SENTRY_DSN` | nothing else |

An integration left unset boots fine:

- A request that needs it answers a not-configured error (`AwsS3NotConfiguredException`, `AuthSocialGoogleNotConfiguredException`, `AuthSocialAppleNotConfiguredException`, each 404).
- Its health indicator reports it down (`AWS S3 is not configured`, `Google is not configured`, and so on).
- `GET /api/system/health/aws` (S3 and SES) and `GET /api/system/health/third-party` (Sentry, Firebase, Google, Apple) still answer 200.
- A seed that needs it logs a warning and skips:
    - `templateEmailNotification` needs SES
    - `templateTermPolicy` needs S3
    - `awsS3Config` needs S3 plus `AWS_S3_IAM_ARN`

If validation fails:

- The application does not start.
- It reports which environment variables are missing or invalid.
- The error reaches the `bootstrap().catch()` handler in `src/main.ts`.
- The handler logs one `FATAL [Bootstrap]` line, reports the error to Sentry when `SENTRY_DSN` is set, and calls `process.exit(1)`.
- `src/migration.ts` runs the same handler for the seed commands.
- Details: [Logger Documentation][ref-doc-logger].

## Example Configuration

Below is an example `.env` file based on the current `.env.example`:

> [!WARNING] **Security**: All secret and key values below (`*_ENCRYPTION_SECRET_KEY`, `*_ENCRYPTION_KEY`, `AUTH_JWT_*_KEY`) are placeholders for illustration only.
>
> - They are empty in `.env.example`, so startup validation fails until they are set.
> - `AUTH_TWO_FACTOR_ISSUER` is also required and empty in `.env.example`. `pnpm generate:secret` does not set it, so it is set by hand.
> - `pnpm generate:secret` generates a unique set:
>     - the JWT keys and KIDs under `keys/`
>     - both encryption secrets in `keys/encryption-secret.env`
>     - the MongoDB keyfile `keys/mongo-keyfile`
> - With `--direct-insert` it also writes the JWT and encryption values into `.env`. The keyfile never goes into `.env`.
>
> See [Installation][ref-doc-installation].

```bash
# Application Settings
APP_NAME=ACKNestJs
APP_ENV=local
APP_LANGUAGE=en
APP_TIMEZONE=Asia/Jakarta
APP_ENCRYPTION_SECRET_KEY=<your_app_encryption_secret_key>

# Home/Organization
HOME_URL=https://example.com
HOME_NAME=ACKNestJs

# HTTP Server
HTTP_HOST=localhost
HTTP_PORT=3000
HTTP_TRUSTED_PROXY=

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

# Database (Compose replica set locally; Atlas without Docker)
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?retryWrites=true&w=majority&replicaSet=rs0
DATABASE_DEBUG=true

# JWT Authentication
AUTH_JWT_ISSUER=https://example.com
AUTH_JWT_AUDIENCE=ACKNestJs

# Access Token Configuration
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=http://localhost:3011/.well-known/access-jwks.json
AUTH_JWT_ACCESS_TOKEN_KID=<your_jwt_access_token_kid>
AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY=<your_jwt_access_token_private_key>
AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY=<your_jwt_access_token_public_key>
AUTH_JWT_ACCESS_TOKEN_EXPIRED=1h

# Refresh Token Configuration
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=http://localhost:3011/.well-known/refresh-jwks.json
AUTH_JWT_REFRESH_TOKEN_KID=<your_jwt_refresh_token_kid>
AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY=<your_jwt_refresh_token_private_key>
AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY=<your_jwt_refresh_token_public_key>
AUTH_JWT_REFRESH_TOKEN_EXPIRED=30d

# Two-Factor Authentication
AUTH_TWO_FACTOR_ISSUER=
AUTH_TWO_FACTOR_ENCRYPTION_KEY=<your_two_factor_encryption_key>

# Social Authentication (Optional)
AUTH_SOCIAL_GOOGLE_CLIENT_ID=
AUTH_SOCIAL_APPLE_CLIENT_ID=
AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID=

# AWS S3 Configuration (Optional)
AWS_S3_IAM_CREDENTIAL_KEY=
AWS_S3_IAM_CREDENTIAL_SECRET=
AWS_S3_IAM_ARN=
AWS_S3_REGION=
AWS_S3_ENDPOINT=
AWS_S3_PUBLIC_BUCKET=
AWS_S3_PUBLIC_CDN=
AWS_S3_PRIVATE_BUCKET=
AWS_S3_PRIVATE_CDN=

# AWS SES Configuration (Optional)
AWS_SES_IAM_CREDENTIAL_KEY=
AWS_SES_IAM_CREDENTIAL_SECRET=
AWS_SES_IDENTITY_ARN=
AWS_SES_REGION=
AWS_SES_ENDPOINT=

# Email (Optional; required with SES)
EMAIL_NO_REPLY=
EMAIL_SUPPORT=

# Firebase (Optional)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Redis (Compose locally; ElastiCache without Docker)
CACHE_REDIS_URL=redis://localhost:6379/0
QUEUE_REDIS_URL=redis://localhost:6379/1

# Debug (Optional)
SENTRY_DSN=

# Docker Compose (Optional; read by Compose, not by the application)
DOCKER_MONGO_ROOT_USERNAME=
DOCKER_MONGO_ROOT_PASSWORD=
DOCKER_MONGO_PORT=
DOCKER_REDIS_PASSWORD=
DOCKER_BULLBOARD_USER=
DOCKER_BULLBOARD_PASSWORD=
```

## Environment Variables

`AppEnvSchema` validates the application variables below.

The `DOCKER_*` variables under [Docker Settings](#docker-settings) are read by Compose and never validated.

### Application Settings

**`APP_NAME`** _(required)_  
The name of your application, used throughout the system for identification.

```bash
APP_NAME=ACKNestJs
```

**`APP_ENV`** _(required)_  
The environment the application is running in. Possible values: `development`, `staging`, `production`, `local`

```bash
APP_ENV=local
```

**`APP_LANGUAGE`** _(required)_  
Default language for the application.

- It is validated against `EnumMessageLanguage`.
- Only `en` is supported.

```bash
APP_LANGUAGE=en
```

**`APP_TIMEZONE`** _(required)_  
Default timezone for date operations.

- It is validated against `EnumRequestTimezone`.
- Only `Asia/Jakarta` is supported.
- `src/main.ts` writes it into `TZ` once the config is loaded.

```bash
APP_TIMEZONE=Asia/Jakarta
```

**`APP_ENCRYPTION_SECRET_KEY`** _(required)_  
Root secret `HelperEncryptionService` derives AES-256-GCM keys from (HKDF-SHA256).

- It encrypts the sensitive fields of notification job payloads.
- It is exactly 64 base64url characters, the encoding of 48 random bytes (`RequestEncryptionSecretSchema`).
- It is empty by default, and startup validation rejects an unset or malformed value.
- `pnpm generate:secret:encryption` generates a unique value per environment.
- Rotating it makes queued notification jobs that were encrypted under the old value fail to decrypt.

```bash
APP_ENCRYPTION_SECRET_KEY=<your_app_encryption_secret_key>
```

**`NODE_ENV`** _(optional)_  
Node.js run mode.

- `ConfigModule.forRoot` in `src/common/common.module.ts` loads only `.env`.
- No `.env.<NODE_ENV>` file is read.
- It is not part of `AppEnvSchema`.
- `src/main.ts` overwrites it with `APP_ENV` (`app.env`) once the config is loaded.

```bash
NODE_ENV=local
```

### Home/Organization Settings

**`HOME_NAME`** _(required)_  
Display name for your organization/home page.

```bash
HOME_NAME=ACKNestJs
```

**`HOME_URL`** _(required)_  
URL for your home/landing page.

```bash
HOME_URL=https://example.com
```

### HTTP Server Settings

**`HTTP_HOST`** _(required)_  
Address to bind the HTTP server to.

- It accepts a hostname such as `localhost` or an IPv4 literal like `0.0.0.0` or `127.0.0.1`.
- Inside a container, use `0.0.0.0`. With `localhost` the app listens on the container's loopback only, and the published port resets connections.

```bash
HTTP_HOST=localhost
```

**`HTTP_PORT`** _(required)_  
Port number for the HTTP server.

```bash
HTTP_PORT=3000
```

**`HTTP_TRUSTED_PROXY`** _(optional)_  
Comma-separated list of proxy NETWORKS whose forwarding headers Express may trust, passed straight to `trust proxy`.

- It accepts the `proxy-addr` preset names (`loopback`, `linklocal`, `uniquelocal`) and explicit CIDRs.
- It is never a hop count and never `true`.

Effects:

- Empty trusts no proxy: `req.ip` is then the direct socket peer and a client cannot forge it through `X-Forwarded-For`.
- Behind a CDN or edge proxy that connects from a public address, a value without that provider's CIDRs puts every client behind it in one rate-limit bucket.

```bash
# no proxy trusted
HTTP_TRUSTED_PROXY=

# private-network proxies
HTTP_TRUSTED_PROXY=loopback,uniquelocal

# an edge provider on public addresses
HTTP_TRUSTED_PROXY=173.245.48.0/20,103.21.244.0/22
```

### Logging Settings

**`LOGGER_ENABLE`** _(required)_  
Enable or disable application logging.

- `false` sets the Pino level to `silent`.
- Nest's default console logger prints `fatal` entries before Pino is attached, whatever this value says.

```bash
LOGGER_ENABLE=true
```

**`LOGGER_LEVEL`** _(required)_  
Minimum log level once Pino is attached.

- It is validated against `EnumLoggerLevel`, which declares Pino's own level set.
- Options: `fatal`, `error`, `warn`, `info`, `debug`, `trace`

```bash
LOGGER_LEVEL=debug
```

**`LOGGER_INTO_FILE`** _(required)_  
Whether to write logs to files.

```bash
LOGGER_INTO_FILE=true
```

**`LOGGER_PRETTIER`** _(required)_  
Whether to format logs in a prettier, readable way.

```bash
LOGGER_PRETTIER=true
```

**`LOGGER_AUTO`** _(required)_  
Log every HTTP request and response automatically, except the routes in `logger.excludedRoutes`.

```bash
LOGGER_AUTO=false
```

### CORS Settings

**`CORS_ALLOWED_ORIGIN`** _(required)_  
Comma-separated list of allowed CORS origins.

- Subdomain wildcards and explicit ports are supported.
- Port wildcards are not.

**Syntax:**

- `*`: allow all origins (credentials disabled)
- `hostname`: single origin (e.g., `example.com`)
- `*.subdomain`: wildcard subdomains (e.g., `*.example.com` matches `api.example.com` and `example.com`)
- `hostname:port`: specific hostname with port (e.g., `api.example.com:3000`)
- `*.subdomain:port`: wildcard with explicit port (e.g., `*.example.com:3000`)

**Examples:**

```bash
# Allow all origins (development only); credentials NOT allowed
CORS_ALLOWED_ORIGIN=*

# Specific origins
CORS_ALLOWED_ORIGIN=example.com,app.example.com

# Subdomain wildcard (matches api.example.com and example.com)
CORS_ALLOWED_ORIGIN=*.example.com,api.myapp.com

# Multiple domains with explicit ports
CORS_ALLOWED_ORIGIN=*.example.com:3000,api.myapp.com:8080,localhost:3000

# Mixed; wildcards and specific ports
CORS_ALLOWED_ORIGIN=*.example.com,api.production.com:443,localhost:3000
```

**Port Matching Behavior:**

```bash
# ✅ SUPPORTED; Exact port matching
CORS_ALLOWED_ORIGIN=api.example.com:3000  # Matches: http://api.example.com:3000, https://api.example.com:3000

# ❌ NOT SUPPORTED; Port wildcards
CORS_ALLOWED_ORIGIN=api.example.com:*     # Does NOT work

# ✅ SUPPORTED; Default port (implicit)
CORS_ALLOWED_ORIGIN=api.example.com       # Matches: http://api.example.com, https://api.example.com (no explicit port)
```

**Protocol Behavior:**

- Both `http` and `https` are automatically allowed for the same origin
- Protocol is **not** part of the pattern (no need to specify `https://` in the pattern)

**Credentials Behavior:**

- **Wildcard (`*`)**: Credentials are **disabled** (CORS security restriction)
- **Specific origins**: Credentials are **enabled**

> [!TIP] Production: name explicit origins. A wildcard with credentials off is for development.

### URL Versioning Settings

**`URL_VERSIONING_ENABLE`** _(required)_  
Enable URL versioning for your API (e.g., `/api/v1/shared/user/profile/get`).

```bash
URL_VERSIONING_ENABLE=true
```

**`URL_VERSION`** _(required)_  
Default API version number.

```bash
URL_VERSION=1
```

### Database Settings

**`DATABASE_URL`** _(required)_  
MongoDB connection string.

- It targets a **replica set** (Prisma transactions need one).
- Docker Compose is the recommended local path.
- Without Docker, use [MongoDB Atlas][ref-mongodb-atlas] or any MongoDB 8.0+ replica set.
- The project runs MongoDB 9: the production Compose file pins `mongo:9.0.2`, and the local Compose file uses `mongo:latest`.
- The local Compose port is `DOCKER_MONGO_PORT` (default `27017`).
- Changing `DOCKER_MONGO_PORT` does not change `DATABASE_URL`. Set the port in `DATABASE_URL` to the same value by hand.
- Setup: [Installation][ref-doc-installation].

```bash
# Local Compose replica set (recommended)
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?retryWrites=true&w=majority&replicaSet=rs0

# Local Compose replica set with DOCKER_MONGO_ROOT_PASSWORD set; <user> is DOCKER_MONGO_ROOT_USERNAME (root by default)
# DATABASE_URL=mongodb://<user>:<password>@localhost:27017/ACKNestJs?authSource=admin&retryWrites=true&w=majority&replicaSet=rs0

# MongoDB Atlas (replica set via mongodb+srv)
# DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/ACKNestJs
```

**`DATABASE_DEBUG`** _(required)_  
Log Prisma queries when `true`.

```bash
DATABASE_DEBUG=true
```

### Authentication Settings

**`AUTH_JWT_ISSUER`** _(required)_  
JWT issuer claim value (usually your domain).

```bash
AUTH_JWT_ISSUER=https://example.com
```

**`AUTH_JWT_AUDIENCE`** _(required)_  
JWT audience claim value (usually your application name).

```bash
AUTH_JWT_AUDIENCE=ACKNestJs
```

#### Access Token Settings

**`AUTH_JWT_ACCESS_TOKEN_JWKS_URI`** _(required)_  
Public URI where access token JWKS is hosted.

```bash
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=http://localhost:3011/.well-known/access-jwks.json
```

**`AUTH_JWT_ACCESS_TOKEN_KID`** _(required)_  
Key ID for access token.

- `pnpm generate:secret:jwt` prints it.
- With `--direct-insert`, the command also writes it into `.env`.

```bash
AUTH_JWT_ACCESS_TOKEN_KID=<your_jwt_access_token_kid>
```

**`AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY`** _(required)_  
Private key content for signing access tokens.

```bash
AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY=<your_jwt_access_token_private_key>
```

**`AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY`** _(required)_  
Public key content for verifying access tokens.

```bash
AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY=<your_jwt_access_token_public_key>
```

**`AUTH_JWT_ACCESS_TOKEN_EXPIRED`** _(required)_  
Access token expiration time. Format: `1h`, `30m`, `2d`

```bash
AUTH_JWT_ACCESS_TOKEN_EXPIRED=1h
```

#### Refresh Token Settings

**`AUTH_JWT_REFRESH_TOKEN_JWKS_URI`** _(required)_  
Public URI where refresh token JWKS is hosted.

```bash
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=http://localhost:3011/.well-known/refresh-jwks.json
```

**`AUTH_JWT_REFRESH_TOKEN_KID`** _(required)_  
Key ID for refresh token.

- `pnpm generate:secret:jwt` prints it.
- With `--direct-insert`, the command also writes it into `.env`.

```bash
AUTH_JWT_REFRESH_TOKEN_KID=<your_jwt_refresh_token_kid>
```

**`AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY`** _(required)_  
Private key content for signing refresh tokens.

```bash
AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY=<your_jwt_refresh_token_private_key>
```

**`AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY`** _(required)_  
Public key content for verifying refresh tokens.

```bash
AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY=<your_jwt_refresh_token_public_key>
```

**`AUTH_JWT_REFRESH_TOKEN_EXPIRED`** _(required)_  
Refresh token expiration time. Format: `7d`, `30d`, `90d`

```bash
AUTH_JWT_REFRESH_TOKEN_EXPIRED=30d
```

### Social Authentication Settings

> [!NOTE] All social authentication settings are optional. Leave them blank to keep social sign-in off. The matching sign-in route then answers 404 (`AuthSocialGoogleNotConfiguredException` or `AuthSocialAppleNotConfiguredException`).

**`AUTH_SOCIAL_GOOGLE_CLIENT_ID`** _(optional)_  
Google OAuth client ID.

- It is the audience when verifying a Google ID token.
- Setting it turns Google sign-in on.

```bash
AUTH_SOCIAL_GOOGLE_CLIENT_ID=
```

**`AUTH_SOCIAL_APPLE_CLIENT_ID`** _(optional)_  
First of the two accepted Apple audiences.

- Either Apple client ID turns Apple sign-in on.
- An Apple ID token is accepted when its audience matches any client ID that is set.

```bash
AUTH_SOCIAL_APPLE_CLIENT_ID=
```

**`AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID`** _(optional)_  
Second of the two accepted Apple audiences, checked alongside `AUTH_SOCIAL_APPLE_CLIENT_ID`.

```bash
AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID=
```

### Two-Factor Authentication Settings

**`AUTH_TWO_FACTOR_ISSUER`** _(required)_  
Issuer name displayed in authenticator apps.

- It is empty in `.env.example`, and `pnpm generate:secret` leaves it alone.
- Startup validation rejects an unset value.
- The value below is illustrative.

```bash
AUTH_TWO_FACTOR_ISSUER=ACKNestJsTwoFactor
```

**`AUTH_TWO_FACTOR_ENCRYPTION_KEY`** _(required)_  
Root secret `HelperEncryptionService` derives the AES-256-GCM keys for stored TOTP secrets from.

- It is exactly 64 base64url characters, the encoding of 48 random bytes (`RequestEncryptionSecretSchema`).
- It is empty by default, and startup validation rejects an unset or malformed value.
- `pnpm generate:secret:encryption` generates a unique value per environment.
- Rotating it leaves every stored TOTP secret undecryptable, and an authenticator code check then returns `409 twoFactorSecretUnavailable` (see [Two-Factor][ref-doc-two-factor]).

```bash
AUTH_TWO_FACTOR_ENCRYPTION_KEY=<your_two_factor_encryption_key>
```

### AWS Settings

> [!NOTE] AWS settings are optional.
>
> - S3 turns on when an S3 credential is set, and SES when an SES credential is set. Each then requires its group (see [Environment Validation](#environment-validation)).
> - Without S3, file upload and term-policy content routes answer `AwsS3NotConfiguredException` (404).
> - Without SES, email is off.

#### S3 Configuration

**`AWS_S3_IAM_CREDENTIAL_KEY`** _(optional, turns S3 on)_  
AWS IAM access key ID for S3 bucket operations.

```bash
AWS_S3_IAM_CREDENTIAL_KEY=
```

**`AWS_S3_IAM_CREDENTIAL_SECRET`** _(optional, turns S3 on)_  
AWS IAM secret access key for S3 bucket operations.

```bash
AWS_S3_IAM_CREDENTIAL_SECRET=
```

**`AWS_S3_IAM_ARN`** _(optional, needed by the `awsS3Config` seed)_  
IAM principal ARN the public bucket policy grants full access to.

- Only the `awsS3Config` seed reads it, and that seed skips with a warning when it is unset.
- The application authenticates with the credential key and secret.

```bash
AWS_S3_IAM_ARN=
```

**`AWS_S3_REGION`** _(required with S3)_  
AWS region for S3 services.

```bash
AWS_S3_REGION=
```

**`AWS_S3_ENDPOINT`** _(optional)_  
Custom S3 endpoint, such as LocalStack, as a URL without a trailing slash.

- When set, the client uses path-style addressing.
- Object URLs are built as `{endpoint}/{bucket}/{key}`.

```bash
AWS_S3_ENDPOINT=http://localhost:4566
```

**`AWS_S3_PUBLIC_BUCKET`** _(required with S3)_  
Name of the public S3 bucket for file storage.

```bash
AWS_S3_PUBLIC_BUCKET=
```

**`AWS_S3_PUBLIC_CDN`** _(optional)_  
CloudFront CDN hostname for the public bucket.

- Set the hostname only, without a scheme.
- `aws.config.ts` builds the config value as `https://{AWS_S3_PUBLIC_CDN}`.

```bash
AWS_S3_PUBLIC_CDN=
```

#### S3 Private Bucket (for private files)

**`AWS_S3_PRIVATE_BUCKET`** _(required with S3)_  
Name of the private S3 bucket for secure file storage.

```bash
AWS_S3_PRIVATE_BUCKET=
```

**`AWS_S3_PRIVATE_CDN`** _(optional)_  
CloudFront CDN hostname for the private bucket.

- Set the hostname only, without a scheme.
- `aws.config.ts` builds the config value as `https://{AWS_S3_PRIVATE_CDN}`.

```bash
AWS_S3_PRIVATE_CDN=
```

#### SES (Email Service)

**`AWS_SES_IAM_CREDENTIAL_KEY`** _(optional, turns SES on)_  
AWS IAM access key ID for SES email service.

```bash
AWS_SES_IAM_CREDENTIAL_KEY=
```

**`AWS_SES_IAM_CREDENTIAL_SECRET`** _(optional, turns SES on)_  
AWS IAM secret access key for SES email service.

```bash
AWS_SES_IAM_CREDENTIAL_SECRET=
```

**`AWS_SES_IDENTITY_ARN`** _(optional)_  
ARN of a verified SES identity, in the form `arn:aws:ses:<region>:<account-id>:identity/<identity>`.

When set, every send passes it as `SourceArn` (sending authorization).

```bash
AWS_SES_IDENTITY_ARN=
```

**`AWS_SES_REGION`** _(required with SES)_  
AWS region for SES service.

```bash
AWS_SES_REGION=
```

**`AWS_SES_ENDPOINT`** _(optional)_  
Custom SES endpoint, such as LocalStack, as a URL without a trailing slash.

```bash
AWS_SES_ENDPOINT=http://localhost:4566
```

### Email Settings

> [!NOTE] Email settings are optional and required together with SES.

**`EMAIL_NO_REPLY`** _(required with SES)_  
Sender email address used for no-reply emails (e.g., transactional, notifications).

```bash
EMAIL_NO_REPLY=noreply@mail.com
```

**`EMAIL_SUPPORT`** _(required with SES)_  
Support email address shown in email templates.

```bash
EMAIL_SUPPORT=support@mail.com
```

### Firebase Settings

> [!NOTE] Firebase settings are optional and all-or-none: setting any one requires all three. With none set, push delivery is off.

**`FIREBASE_PROJECT_ID`** _(optional, all three together)_  
Firebase project ID from your Firebase console.

```bash
FIREBASE_PROJECT_ID=
```

**`FIREBASE_CLIENT_EMAIL`** _(optional, all three together)_  
Firebase service account client email.

```bash
FIREBASE_CLIENT_EMAIL=
```

**`FIREBASE_PRIVATE_KEY`** _(optional, all three together)_  
Firebase service account private key, accepted either as the PEM block with its newlines written as `\n`, or as the bare base64 PKCS#8 DER body.

`FirebaseUtil.normalizePrivateKey` in `src/common/firebase/utils/firebase.util.ts` turns either form into the PEM the Admin SDK expects.

```bash
FIREBASE_PRIVATE_KEY=
```

### Redis Settings

**`CACHE_REDIS_URL`** _(required)_  
Redis URL for cache (`db:0`).

- Locally, Compose Redis is the default choice.
- Without Docker, use a hosted Redis such as [Amazon ElastiCache][ref-elasticache].
- Redis 6.0 or later is required, because `SessionCache` runs `SCAN` with the `TYPE` option.
- Setup: [Installation][ref-doc-installation].

```bash
# Local Compose
CACHE_REDIS_URL=redis://localhost:6379/0

# Local Compose with DOCKER_REDIS_PASSWORD set
# CACHE_REDIS_URL=redis://:<password>@localhost:6379/0
```

**`QUEUE_REDIS_URL`** _(required)_  
Redis URL for BullMQ (`db:1`).

- The same host as cache is fine.
- A different logical DB from cache keeps the two apart.

```bash
# Local Compose
QUEUE_REDIS_URL=redis://localhost:6379/1

# Local Compose with DOCKER_REDIS_PASSWORD set
# QUEUE_REDIS_URL=redis://:<password>@localhost:6379/1
```

### Debug Settings

**`SENTRY_DSN`** _(optional)_  
Sentry DSN for error tracking and monitoring.

- A URL when set.
- Blank leaves Sentry off.

```bash
SENTRY_DSN=
```

### Docker Settings

> [!NOTE] Every `DOCKER_*` variable is optional and empty in `.env.example`.
>
> - Docker Compose reads them to configure the `mongo`, `redis`, and `redis-bullboard` services.
> - The application never reads them, and `AppEnvSchema` does not validate them.
> - Each is read as `${VAR:-default}` in `docker-compose.yml`, and all but `DOCKER_MONGO_PORT` also in `ci/docker-compose.production.yml`, so an unset variable and an empty one both take the default.
> - The two passwords default to empty, which means no authentication.
> - The production file takes its values only when started with `--env-file .env` (see [Release][ref-doc-release]).

> [!WARNING] Without `--env-file`, the production file starts MongoDB and Redis without authentication, and BullBoard accepts the login `admin` / `admin123`.

Both Compose files bind-mount `keys/mongo-keyfile` into the `mongo` service whether or not authentication is on.

- The mount sets `create_host_path: false`, so Compose does not create the file and fails the start when it is missing.
- The file is required even when MongoDB runs plain.
- `pnpm generate:secret` and `pnpm generate:secret:mongo` create it.

**`DOCKER_MONGO_ROOT_USERNAME`** _(optional)_  
Name of the MongoDB root user.

- It falls back to `root`.
- It is used only when `DOCKER_MONGO_ROOT_PASSWORD` is set.
- It is the `<user>` in the `DATABASE_URL` that carries credentials.

```bash
DOCKER_MONGO_ROOT_USERNAME=
```

**`DOCKER_MONGO_ROOT_PASSWORD`** _(optional)_  
Turns MongoDB authentication on.

- Unset or empty starts MongoDB plain.
- The keyfile `keys/mongo-keyfile` (created by `pnpm generate:secret` or `pnpm generate:secret:mongo`) is mounted either way. The password decides whether `mongod` uses it.
- When set, `mongod` starts with `--keyFile` and `--auth` and creates the root user on the first start of a database without one.
- An existing user is left as it is, so changing the variable later does not change the stored password.
- `DATABASE_URL` then carries the credentials, with `DOCKER_MONGO_ROOT_USERNAME` as `<user>`, and `authSource=admin`.
- Special characters in the password are percent-encoded inside the URL.
- A `$` in the password makes the stored password and the one in the URL differ, because Compose interpolates `$` in values it reads with `--env-file` while the app reads `.env` literally (`expandVariables: false`).

```bash
DOCKER_MONGO_ROOT_PASSWORD=
```

**`DOCKER_MONGO_PORT`** _(optional)_  
Host port the local `mongo` service publishes.

- It falls back to `27017`.
- Only `docker-compose.yml` reads it. The production file keeps the member host `mongo:27017` on the Compose network.
- It does not change `DATABASE_URL`. Set the port in `DATABASE_URL` to the same value by hand.
- `docker-compose.yml` passes `RS_HOST=host.docker.internal:<port>` to the `mongo` container, and `ci/mongo/entrypoint.sh` uses it as the replica set member host when it first initiates the replica set on an empty volume.
- The replica set advertises that member host to every client with `replicaSet=rs0`, `localhost` URLs included, so the host machine must resolve `host.docker.internal`. See [Installation][ref-doc-installation].

```bash
DOCKER_MONGO_PORT=
```

**`DOCKER_REDIS_PASSWORD`** _(optional)_  
Turns Redis authentication on.

- Unset or empty starts Redis plain.
- When set, Redis starts with `--requirepass`, and BullBoard uses the same value to connect to Redis.
- BullBoard's own login is `DOCKER_BULLBOARD_USER` and `DOCKER_BULLBOARD_PASSWORD`.
- `CACHE_REDIS_URL` and `QUEUE_REDIS_URL` then carry the password, percent-encoded where it holds special characters.
- A `$` in the password causes the same mismatch as for `DOCKER_MONGO_ROOT_PASSWORD`.

```bash
DOCKER_REDIS_PASSWORD=
```

**`DOCKER_BULLBOARD_USER`** _(optional)_  
BullBoard login name, falling back to `admin`.

```bash
DOCKER_BULLBOARD_USER=
```

**`DOCKER_BULLBOARD_PASSWORD`** _(optional)_  
BullBoard login password, falling back to `admin123`.

```bash
DOCKER_BULLBOARD_PASSWORD=
```

<!-- REFERENCES -->

[ref-doc-configuration]: configuration.md
[ref-doc-installation]: installation.md
[ref-doc-database]: database.md
[ref-doc-authentication]: authentication.md
[ref-doc-two-factor]: two-factor.md
[ref-doc-vault]: vault.md
[ref-doc-email]: email.md
[ref-doc-logger]: logger.md#startup-and-boot-failure
[ref-doc-release]: release.md
[ref-mongodb-atlas]: https://www.mongodb.com/products/platform/atlas-database
[ref-elasticache]: https://aws.amazon.com/elasticache/
