# Third Party Integration Documentation

## Overview

ACK NestJS Boilerplate integrates with various third-party services and providers to handle authentication, storage, email, caching, monitoring, and database operations. All integrations are configured through environment variables.

## Related Documents

- [Configuration Documentation][ref-doc-configuration]
- [Environment Documentation][ref-doc-environment]
- [Authentication Documentation][ref-doc-authentication]
- [File Upload Documentation][ref-doc-file-upload]
- [Queue Documentation][ref-doc-queue]
- [Cache Documentation][ref-doc-cache]
- [Database Documentation][ref-doc-database]

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [AWS Services](#aws-services)
  - [S3 Storage](#s3-storage)
  - [SES Email](#ses-email)
  - [Error Codes](#error-codes)
- [Firebase](#firebase)
- [Sentry](#sentry)
- [Redis](#redis)
- [MongoDB](#mongodb)
- [Social Authentication](#social-authentication)
  - [Google OAuth](#google-oauth)
  - [Apple Sign In](#apple-sign-in)
- [HashiCorp Vault](#hashicorp-vault)

## AWS Services

### S3 Storage

[AWS S3][ref-aws-s3] is used for file storage with support for both public and private buckets.

**Packages:**
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

**Environment Variables:**
```dotenv
AWS_S3_IAM_CREDENTIAL_KEY=<your_aws_s3_access_key>
AWS_S3_IAM_CREDENTIAL_SECRET=<your_aws_s3_secret_key>
AWS_S3_IAM_ARN=<your_aws_s3_iam_arn>
AWS_S3_REGION=ap-southeast-3
AWS_S3_PUBLIC_BUCKET=<your_aws_s3_public_bucket>
AWS_S3_PUBLIC_CDN=<your_aws_s3_public_cdn>
AWS_S3_PRIVATE_BUCKET=<your_aws_s3_private_bucket>
AWS_S3_PRIVATE_CDN=<your_aws_s3_private_cdn>
```

**Use Cases:**
- Public file uploads (user avatars, public documents)
- Private file storage (sensitive documents)
- Presigned URL generation for secure access

**No-Op Mode:**

If any of `AWS_S3_IAM_CREDENTIAL_KEY`, `AWS_S3_IAM_CREDENTIAL_SECRET`, or `AWS_S3_REGION` is not set, the S3 integration runs in no-op mode: it is disabled, logs a warning on startup, and S3 operations return safe defaults instead of failing.

For detailed behavior and implementation, see [File Upload][ref-doc-file-upload].

### SES Email

[AWS SES][ref-aws-ses] handles transactional email delivery.

**Packages:**
- `@aws-sdk/client-ses`

**Environment Variables:**
```dotenv
AWS_SES_IAM_CREDENTIAL_KEY=<your_aws_ses_access_key>
AWS_SES_IAM_CREDENTIAL_SECRET=<your_aws_ses_secret_key>
AWS_SES_IAM_ARN=<your_aws_ses_iam_arn>
AWS_SES_REGION=ap-southeast-3
```

**Use Cases:**
- Welcome emails
- Password reset emails
- Email verification
- Notification emails

**No-Op Mode:**

If any of `AWS_SES_IAM_CREDENTIAL_KEY`, `AWS_SES_IAM_CREDENTIAL_SECRET`, or `AWS_SES_REGION` is not set, the SES integration runs in no-op mode: it is disabled, logs a warning on startup, and email operations return safe defaults instead of failing.

Email processing is handled through the queue system. See [Queue][ref-doc-queue] for details.

### Error Codes

AWS service errors use `EnumAwsStatusCodeError` located at `src/common/aws/enums/aws.status-code.enum.ts`:

| Enum | Code | i18n Key | Description |
|---|---|---|---|
| `EnumAwsStatusCodeError.serviceUnavailable` | `5240` | `aws.error.serviceUnavailable` | AWS service is unavailable |

## Firebase

[Firebase Admin SDK][ref-firebase] is used for sending push notifications to mobile devices.

**Packages:**
- `firebase-admin`

**Environment Variables:**
```dotenv
FIREBASE_PROJECT_ID=<your_firebase_project_id>
FIREBASE_CLIENT_EMAIL=<your_firebase_client_email>
FIREBASE_PRIVATE_KEY=<your_firebase_private_key>
```

**Features:**
- Push notification delivery via FCM
- Batch send support
- Invalid token detection and cleanup

Leave `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` empty to disable Firebase in development.

For notification details, see [Notification Documentation][ref-doc-notification].

## Sentry

[Sentry][ref-sentry] provides error tracking and performance monitoring.

**Packages:**
- `@sentry/nestjs`
- `@sentry/profiling-node`

**Environment Variables:**
```dotenv
SENTRY_DSN=<your_sentry_dsn>
```

**Features:**
- Automatic error tracking
- Performance monitoring
- Queue job failure tracking (integrated in `QueueProcessorBase`)
- Request context capture

Leave `SENTRY_DSN` empty to disable Sentry in development.

## Redis

[Redis][ref-redis] serves as cache storage and queue backend.

**Packages:**
- `@keyv/redis`
- `keyv`
- `bullmq`
- `cache-manager`

**Environment Variables:**
```dotenv
CACHE_REDIS_URL=redis://localhost:6379/0
QUEUE_REDIS_URL=redis://localhost:6379/1
```

**Use Cases:**
- Application caching (DB 0)
- Background job queues (DB 1)
- Session storage
- Rate limiting data

For cache implementation, see [Cache][ref-doc-cache]. For queue details, see [Queue][ref-doc-queue].

## MongoDB

[MongoDB][ref-mongodb] with [Prisma][ref-prisma] as the primary database.

**Packages:**
- `@prisma/client`
- `prisma`

**Environment Variables:**
```dotenv
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?retryWrites=true&w=majority&replicaSet=rs0
DATABASE_DEBUG=true
```

**Features:**
- Replica set support
- Transaction support
- Type-safe queries via Prisma

For database setup and usage, see [Database][ref-doc-database].

## Social Authentication

### Google OAuth

[Google OAuth][ref-google-oauth] for social login integration.

**Packages:**
- `google-auth-library`

**Environment Variables:**
```dotenv
AUTH_SOCIAL_GOOGLE_CLIENT_ID=<your_google_client_id>
AUTH_SOCIAL_GOOGLE_CLIENT_SECRET=<your_google_client_secret>
```

For authentication flow details, see [Authentication][ref-doc-authentication].

### Apple Sign In

[Apple Sign In][ref-apple-signin] for iOS authentication.

**Packages:**
- `verify-apple-id-token`

**Environment Variables:**
```dotenv
AUTH_SOCIAL_APPLE_CLIENT_ID=<your_apple_client_id>
AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID=<your_apple_sign_in_client_id>
```

For authentication flow details, see [Authentication][ref-doc-authentication].

## HashiCorp Vault

[HashiCorp Vault][ref-vault] is integrated as an **optional** secret store. Rather than connecting to the app at runtime, it acts as the source of truth for local secrets and writes them into `.env` on demand.

**Gated by the `vault` Docker Compose profile**, so it never starts unless you opt in.

**How it differs from the other integrations on this page:**
- It is **not** consumed by the application at runtime; the app still reads `.env`. Vault only *produces* that file.
- It runs with a persistent file backend, auto-unsealed by the container entrypoint, with secrets laid out per environment and read through a per-environment read-only AppRole.

> [!NOTE]
> For the full architecture, KV layout, usage flow, configuration reference, and scope/limitations, see the [Vault Documentation][ref-doc-vault].




<!-- REFERENCES -->

[ref-aws-s3]: https://docs.aws.amazon.com/s3/
[ref-aws-ses]: https://docs.aws.amazon.com/ses/
[ref-firebase]: https://firebase.google.com/docs/admin/setup
[ref-sentry]: https://sentry.io
[ref-redis]: https://redis.io
[ref-mongodb]: https://docs.mongodb.com/
[ref-prisma]: https://www.prisma.io
[ref-google-oauth]: https://developers.google.com/identity/protocols/oauth2
[ref-apple-signin]: https://developer.apple.com/sign-in-with-apple/
[ref-vault]: https://developer.hashicorp.com/vault

[ref-doc-configuration]: configuration.md
[ref-doc-environment]: environment.md
[ref-doc-authentication]: authentication.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-queue]: queue.md
[ref-doc-cache]: cache.md
[ref-doc-database]: database.md
[ref-doc-notification]: notification.md
[ref-doc-vault]: vault.md
