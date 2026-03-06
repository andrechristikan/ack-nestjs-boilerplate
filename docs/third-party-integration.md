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

## AWS Services

### S3 Storage

[AWS S3][ref-aws-s3] is used for file storage with support for both public and private buckets.

**Packages:**
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

**Environment Variables:**
```dotenv
AWS_S3_IAM_CREDENTIAL_KEY=your_access_key
AWS_S3_IAM_CREDENTIAL_SECRET=your_secret_key
AWS_S3_IAM_ARN=your_iam_arn
AWS_S3_REGION=ap-southeast-3
AWS_S3_PUBLIC_BUCKET=your_public_bucket
AWS_S3_PUBLIC_CDN=https://your-cdn.cloudfront.net
AWS_S3_PRIVATE_BUCKET=your_private_bucket
AWS_S3_PRIVATE_CDN=https://your-private-cdn.cloudfront.net
```

**Use Cases:**
- Public file uploads (user avatars, public documents)
- Private file storage (sensitive documents)
- Presigned URL generation for secure access

**No-Op Mode:**

If any of `AWS_S3_IAM_CREDENTIAL_KEY`, `AWS_S3_IAM_CREDENTIAL_SECRET`, or `AWS_S3_REGION` is not set, `AwsS3Service` will not create an S3 client and will operate in **no-op mode**. On startup, it logs:

```
AWS S3 credentials not configured. S3 functionalities will be disabled.
```

Use `isInitialized()` to check readiness before calling S3 operations:

```typescript
if (!this.awsS3Service.isInitialized()) {
    // S3 is disabled — skip upload
    return;
}
```

When not initialized, each method returns a safe typed default and emits the same warn log instead of throwing:

| Method | Default return |
|---|---|
| `checkConnection`, `checkBucket` | `false` |
| `checkItem`, `getItem`, `putItem`, `createMultiPart` | `null` |
| `presignGetItem`, `presignPutItem`, `presignPutItemPart`, `moveItem` | `null` |
| `getItems`, `moveItems` | `[]` |
| `deleteItem`, `deleteItems`, `deleteDir`, `completeMultipart`, `abortMultipart`, bucket-config methods | `void` (silent no-op) |
| `putItemMultiPart` | the unmodified `multipart` input |

> **Callers must null-check** methods that return `AwsS3Dto | null`, `AwsS3MultipartDto | null`, or `AwsS3PresignDto | null` before using the result.

For detailed implementation, see [File Upload][ref-doc-file-upload].

### SES Email

[AWS SES][ref-aws-ses] handles transactional email delivery.

**Packages:**
- `@aws-sdk/client-ses`

**Environment Variables:**
```dotenv
AWS_SES_IAM_CREDENTIAL_KEY=your_access_key
AWS_SES_IAM_CREDENTIAL_SECRET=your_secret_key
AWS_SES_IAM_ARN=your_iam_arn
AWS_SES_REGION=ap-southeast-3
```

**Use Cases:**
- Welcome emails
- Password reset emails
- Email verification
- Notification emails

**No-Op Mode:**

If any of `AWS_SES_IAM_CREDENTIAL_KEY`, `AWS_SES_IAM_CREDENTIAL_SECRET`, or `AWS_SES_REGION` is not set, `AwsSESService` will not create an SES client and will operate in **no-op mode**. On startup, it logs:

```
AWS SES credentials not configured. Email functionalities will be disabled.
```

Use `isInitialized()` to check readiness before sending emails:

```typescript
if (!this.awsSesService.isInitialized()) {
    // SES is disabled — skip email
    return;
}
```

When not initialized, each method returns a safe typed default and emits the same warn log instead of throwing:

| Method | Default return |
|---|---|
| `checkConnection` | `false` |
| `listTemplates` | `{ TemplatesMetadata: [], $metadata: {} }` |
| `getTemplate` | `{ $metadata: {}, Template: null }` |
| `createTemplate`, `updateTemplate`, `deleteTemplate` | `{ $metadata: {} }` |
| `send` | `{ MessageId: null, $metadata: {} }` |
| `sendBulk` | `{ Status: [], $metadata: {} }` |

**Bulk Email (`AwsSESSendBulkDto<T>`):**

For sending the same template to multiple recipients, use `AwsSESSendBulkDto`. Each recipient can carry its own `templateData`, and the optional `defaultTemplateData` field provides fallback values applied to all recipients that do not supply their own data:

```typescript
await this.awsSesService.sendBulk({
    templateName: 'welcome',
    sender: 'no-reply@mail.com',
    defaultTemplateData: { appName: 'ACKNestJs' },   // fallback for all recipients
    recipients: [
        { to: 'a@mail.com', templateData: { name: 'Alice' } },
        { to: 'b@mail.com', templateData: { name: 'Bob' } },
    ],
});
```

`defaultTemplateData` is serialized as `DefaultTemplateData` in the SES `SendBulkTemplatedEmail` command. If omitted, it defaults to `{}`.

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
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_base64_encoded_private_key
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
SENTRY_DSN=https://your-dsn@sentry.io/project-id
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
AUTH_SOCIAL_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
AUTH_SOCIAL_GOOGLE_CLIENT_SECRET=your_client_secret
```

For authentication flow details, see [Authentication][ref-doc-authentication].

### Apple Sign In

[Apple Sign In][ref-apple-signin] for iOS authentication.

**Packages:**
- `verify-apple-id-token`

**Environment Variables:**
```dotenv
AUTH_SOCIAL_APPLE_CLIENT_ID=your_service_id
AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID=your_app_bundle_id
```

For authentication flow details, see [Authentication][ref-doc-authentication].




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

[ref-doc-configuration]: configuration.md
[ref-doc-environment]: environment.md
[ref-doc-authentication]: authentication.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-queue]: queue.md
[ref-doc-cache]: cache.md
[ref-doc-database]: database.md
[ref-doc-notification]: notification.md
