# Third Party Integration Documentation

## Overview

- Third-party clients are configured through environment variables.
- Each section below names the package and the env vars.

### Optional integrations

AWS S3, AWS SES, Firebase, Sentry, Google, and Apple are optional. `AppEnvSchema` (`src/app/dtos/app.env.dto.ts`) validates every key at boot:

- A blank `.env` line (`KEY=`) and an absent key both parse to `null`.
- What turns an integration on:
    - S3 and SES turn on when `*_IAM_CREDENTIAL_KEY` or `*_IAM_CREDENTIAL_SECRET` is set.
    - Firebase turns on when any `FIREBASE_*` key is set.
    - Once one of those is on, a missing member of the group fails boot with `<KEY> is required when ...`.
    - A region, bucket, or `EMAIL_*` value set alone does not turn an integration on and boots fine.
    - Google turns on with `AUTH_SOCIAL_GOOGLE_CLIENT_ID`, Apple with either Apple client id, and Sentry with `SENTRY_DSN`. Each needs nothing else.
    - The groups are listed under each integration below.
- An unconfigured adapter (`AwsS3Service`, `AwsSESService`, `FirebaseService`) logs a warning at startup and stays uninitialized. `isInitialized()` reports its state.
    - A call that reaches the provider logs a warning and returns without calling it.
    - S3 returns `null`, `[]`, `false`, or nothing.
    - SES returns an empty SDK output.
    - Firebase returns `false` from `sendPush`, and a result with `failureCount: tokens.length`, `failureTokens: []`, and `retryTokens: []` from `sendMulticast`.
    - Two S3 calls behave differently: `putItemMultiPart` returns the multipart record it received unchanged, and `mapPresign` never checks initialization because it builds the record from config without a provider call.
- A request path that cannot work without S3 throws `AwsS3NotConfiguredException` (HTTP 404). See [Error Codes](#error-codes).
- A disabled or unconfigured capability answers 404 (`FeatureFlagDisabledException`, `AwsS3NotConfiguredException`, `AuthSocialGoogleNotConfiguredException`, `AuthSocialAppleNotConfiguredException`). The exception filters report only 5xx to Sentry, so these stay out of it.
- A seed that needs an integration logs a warning and skips without it:
    - `templateEmailNotification` needs SES
    - `templateTermPolicy` needs S3
    - `awsS3Config` needs S3 plus `AWS_S3_IAM_ARN`
- The health indicators report an unconfigured integration as `down` with the message `<name> is not configured`. The health endpoints still answer HTTP 200.

## Related Documents

- [Configuration Documentation][ref-doc-configuration]: AWS, Firebase, Sentry config keys
- [Environment Documentation][ref-doc-environment]: Credential env vars
- [Authentication Documentation][ref-doc-authentication]: Google and Apple OAuth
- [File Upload Documentation][ref-doc-file-upload]: Multipart upload and S3 presign
- [Email Documentation][ref-doc-email]: SES templates and sync
- [Notification Documentation][ref-doc-notification]: Push and email delivery
- [Queue Documentation][ref-doc-queue]: BullMQ workers that call these services
- [Cache Documentation][ref-doc-cache]: Redis used by cache and rate limits
- [Database Documentation][ref-doc-database]: MongoDB connection expectations

## Table of Contents

- [Overview](#overview)
    - [Optional integrations](#optional-integrations)
- [Related Documents](#related-documents)
- [AWS Services](#aws-services)
    - [S3 Storage](#s3-storage)
        - [Bucket setup](#bucket-setup)
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
AWS_S3_ENDPOINT=
AWS_S3_PUBLIC_BUCKET=<your_aws_s3_public_bucket>
AWS_S3_PUBLIC_CDN=<your_aws_s3_public_cdn>
AWS_S3_PRIVATE_BUCKET=<your_aws_s3_private_bucket>
AWS_S3_PRIVATE_CDN=<your_aws_s3_private_cdn>
```

**Use Cases:**

- Public file uploads (user avatars, public documents)
- Private file storage (sensitive documents)
- Presigned URL generation for secure access

**Required group:** setting `AWS_S3_IAM_CREDENTIAL_KEY` or `AWS_S3_IAM_CREDENTIAL_SECRET` makes these required:

- `AWS_S3_IAM_CREDENTIAL_KEY`
- `AWS_S3_IAM_CREDENTIAL_SECRET`
- `AWS_S3_REGION`
- `AWS_S3_PUBLIC_BUCKET`
- `AWS_S3_PRIVATE_BUCKET`

The CDN keys are optional.

Without one, objects carry `cdnUrl: null`.

**Optional keys:**

- `AWS_S3_ENDPOINT`: a URL with no trailing slash for an S3-compatible store (MinIO, LocalStack).
    - When set, the client uses path-style addressing and object URLs follow `{endpoint}/{bucket}/{key}`.
    - Otherwise they follow `https://{bucket}.s3.{region}.amazonaws.com/{key}` (config `aws.s3.baseUrlPattern`).
- `AWS_S3_IAM_ARN`: read only by the `awsS3Config` command, as the principal of the public bucket policy. The application never assumes a role with it.

**Unconfigured:** with the credential pair blank, `AwsS3Service` stays uninitialized.

- Its provider methods return `null`, `[]`, `false`, or nothing.
- `putItemMultiPart` returns its input unchanged, and `mapPresign` runs without the check.
- The request paths that need S3 throw `AwsS3NotConfiguredException` (HTTP 404):
    - profile photo presign, upload, and update
    - term-policy create and publish
    - term-policy content presign, add, update, and get

For detailed upload and presign behavior, see [File Upload][ref-doc-file-upload].

### Bucket setup

`pnpm migration awsS3Config` is a migration command that applies bucket policy and settings on AWS for both the public and private buckets.

- It writes no MongoDB rows.
- It logs a warning and skips when S3 is unconfigured or `AWS_S3_IAM_ARN` is blank.

```bash
pnpm migration awsS3Config --type seed
```

`--type remove` is a no-op for this command.

The command runs the public and private buckets concurrently. Each bucket receives five settings:

- **Block public access**: Public access restrictions
- **Disable ACL**: Bucket-owner ownership controls
- **Bucket policy**: Read/write permissions for public vs private
- **CORS**: Cross-origin rules
- **Lifecycle**: Deletes incomplete multipart uploads

Ordering:

- On the public bucket, block public access finishes before the bucket policy applies. The other settings run alongside them.
- On the private bucket, all five settings run concurrently.

**Public bucket:**

- Public ACLs are blocked and public policies allowed.
- A bucket policy grants public read (`s3:GetObject`) and `s3:*` to the `AWS_S3_IAM_ARN` principal.
- CORS allows GET/HEAD from any origin and PUT/POST/DELETE from the origins in `CORS_ALLOWED_ORIGIN`.

**Private bucket:**

- All public access is blocked.
- The bucket policy is deleted, so access comes from IAM permissions alone.
- CORS allows GET/HEAD/PUT/POST/DELETE only from the origins in `CORS_ALLOWED_ORIGIN`.

The command needs:

- valid AWS credentials
- IAM permission to change those bucket settings
- `AWS_S3_IAM_ARN`
- both bucket names

The bucket ARNs derive from the bucket names.

### SES Email

[AWS SES][ref-aws-ses] handles transactional email delivery.

**Packages:**

- `@aws-sdk/client-ses`

**Environment Variables:**

```dotenv
AWS_SES_IAM_CREDENTIAL_KEY=<your_aws_ses_access_key>
AWS_SES_IAM_CREDENTIAL_SECRET=<your_aws_ses_secret_key>
AWS_SES_IDENTITY_ARN=
AWS_SES_REGION=ap-southeast-3
AWS_SES_ENDPOINT=

EMAIL_NO_REPLY=<no_reply_address>
EMAIL_SUPPORT=<support_address>
```

**Use Cases:**

- Welcome emails
- Password reset emails
- Email verification
- Notification emails

**Required group:** setting `AWS_SES_IAM_CREDENTIAL_KEY` or `AWS_SES_IAM_CREDENTIAL_SECRET` makes these required:

- `AWS_SES_IAM_CREDENTIAL_KEY`
- `AWS_SES_IAM_CREDENTIAL_SECRET`
- `AWS_SES_REGION`
- `EMAIL_NO_REPLY`
- `EMAIL_SUPPORT`

Both email keys are validated as addresses.

**Optional keys:**

- `AWS_SES_IDENTITY_ARN`: an SES identity ARN (`arn:aws:ses:<region>:<account>:identity/<identity>`, config `aws.ses.identityArn`). When set, `send` and `sendBulk` pass it as `SourceArn`.
- `AWS_SES_ENDPOINT`: a URL with no trailing slash for an SES-compatible endpoint (LocalStack).

**Unconfigured:** with the credential pair blank, `AwsSESService` stays uninitialized.

- `send` and `sendBulk` return an empty output and send nothing.
- Template calls return an empty output.

Templates, the sync command, and send flow: [Email Documentation][ref-doc-email].

Queue wiring: [Notification][ref-doc-notification] and [Queue][ref-doc-queue].

### Error Codes

AWS service errors use `EnumAwsStatusCodeError` located at `src/common/aws/enums/aws.status-code.enum.ts`:

| Enum | Code | i18n Key | Description |
| --- | --- | --- | --- |
| `EnumAwsStatusCodeError.s3KeyInvalid` | `51400` | `aws.error.s3KeyInvalid` | A key, path, source, or destination starts with `/`, or a `putItem` key contains `..` or `//` |
| `EnumAwsStatusCodeError.s3FileRequired` | `51401` | `aws.error.s3FileRequired` | `putItem` received no file content |
| `EnumAwsStatusCodeError.s3ObjectExist` | `51402` | `aws.error.s3ObjectExist` | The target key already holds an object and `forceUpdate` is off (HTTP 409) |
| `EnumAwsStatusCodeError.s3MaxPartNumberExceeded` | `51403` | `aws.error.s3MaxPartNumberExceeded` | A multipart upload asks for more parts than `AwsS3MaxPartNumber` |
| `EnumAwsStatusCodeError.s3IterationLimitExceeded` | `51404` | `aws.error.s3IterationLimitExceeded` | `deleteDir` reached its iteration cap before the prefix was empty |
| `EnumAwsStatusCodeError.sesTemplateBodyRequired` | `51405` | `aws.error.sesTemplateBodyRequired` | An SES template create or update has neither an HTML nor a plain-text body |
| `EnumAwsStatusCodeError.s3NotConfigured` | `51406` | `aws.error.s3NotConfigured` | A request path needs S3 and S3 is unconfigured (HTTP 404) |

Every code except `51402` (409) and `51406` (404) answers HTTP 500.

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

**Required group:** setting any of `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` makes all three required. `FIREBASE_CLIENT_EMAIL` is validated as an address.

**Unconfigured:** with all three blank, `FirebaseService` stays uninitialized.

- `sendPush` returns `false`.
- `sendMulticast` returns `failureCount: tokens.length` with `failureTokens: []` and `retryTokens: []`, with no call to FCM.
- The push domains check `isInitialized()` first and skip the job before calling `sendMulticast`, so no token cleanup runs.

**Configured but broken:** boot fails with an `AppUnknownException` subclass.

- A private key that does not normalize to PEM raises `FirebasePrivateKeyInvalidException`.
- An Admin SDK initialization error raises `FirebaseInitializationFailedException`, with the SDK error in `rawError`.

`FirebaseService.sendMulticast` raises `FirebaseChunkSizeInvalidException` (`52300`, `firebase.error.chunkSizeInvalid`, HTTP 500) when the chunk size falls outside 1 to `FirebaseMaxSendPushBatchSize` (500).

For notification details, see [Notification Documentation][ref-doc-notification].

## Sentry

[Sentry][ref-sentry] tracks errors and performance.

**Packages:**

- `@sentry/nestjs`
- `@sentry/profiling-node`

**Environment Variables:**

```dotenv
SENTRY_DSN=<your_sentry_dsn>
```

`src/instrument.ts` initializes Sentry only when `SENTRY_DSN` is set, and `AppEnvSchema` validates it as a URL. The sample rates are logger config keys, chosen by `APP_ENV`:

| Config key                                   | Value | Applies            |
| -------------------------------------------- | ----- | ------------------ |
| `logger.sentry.tracesSampleRate`             | `1`   | outside production |
| `logger.sentry.tracesSampleRateProduction`   | `0.3` | production         |
| `logger.sentry.profilesSampleRate`           | `0.5` | outside production |
| `logger.sentry.profilesSampleRateProduction` | `0.1` | production         |

**Features:**

- Automatic error tracking through `SentryService` (`src/common/sentry`), used by the exception filters and `QueueProcessorBase`
- Performance monitoring and profiling
- Queue job failure tracking (integrated in `QueueProcessorBase`)
- Request context capture, scrubbed in `src/instrument.ts` before it leaves the process. See [Logger][ref-doc-logger]
    - URLs are masked.
    - Sensitive headers, cookies, and body fields are redacted.

With `SENTRY_DSN` blank, Sentry stays uninitialized and `SentryService` calls send nothing.

## Redis

[Redis][ref-redis] is the cache store and the queue backend.

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
- Rate limiting data

**Unreachable:** a Redis call that must succeed, such as the session check of a JWT-protected request, answers `RedisUnavailableException` (`52400`, HTTP 503) when the Keyv client is not connected. A cache read elsewhere falls through as a miss. The per-call behaviour is in [Cache][ref-doc-cache].

For cache implementation, see [Cache][ref-doc-cache].

For queue details, see [Queue][ref-doc-queue].

## MongoDB

[MongoDB][ref-mongodb] with [Prisma][ref-prisma] as the primary database.

**Packages:**

- `@prisma/client` (runtime of the generated client)
- `prisma` (CLI and the `prisma-client` generator, which writes the client into `src/generated/prisma-client`)

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
```

**Turned on by:** `AUTH_SOCIAL_GOOGLE_CLIENT_ID`

- Nothing else is required.
- The client id is the audience `verifyIdToken` checks.

**Unconfigured:** with the client id blank:

- Google sign-in throws `AuthSocialGoogleNotConfiguredException` (`50817`, HTTP 404).
- The `google` health indicator reports it down.

**Unreachable:** when Google's certificate fetch fails, sign-in throws `AuthProviderUnavailableException` (`50819`, HTTP 503). A bad token answers 401.

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

**Turned on by:** either Apple client id

- Nothing else is required.
- A token is accepted when its audience matches any client id that is set.

**Unconfigured:** with both ids blank:

- Apple sign-in throws `AuthSocialAppleNotConfiguredException` (`50818`, HTTP 404).
- The `apple` health indicator reports it down.

**Unreachable:** when Apple's key fetch fails, sign-in throws `AuthProviderUnavailableException` (`50819`, HTTP 503). A bad token answers 401.

For authentication flow details, see [Authentication][ref-doc-authentication].

## HashiCorp Vault

[HashiCorp Vault][ref-vault] is integrated as an **optional** secret store.

- It acts as the source of truth for local secrets and writes them into `.env` on demand.
- The app never connects to it.
- The `vault` Docker Compose profile gates it, so it never starts unless you opt in.

**How it differs from the other integrations on this page:**

- It is **not** consumed by the application at runtime. The app still reads `.env`, and Vault only _produces_ that file.
- It runs with a persistent file backend, auto-unsealed by the container entrypoint, with secrets laid out per environment and read through a per-environment read-only AppRole.

> [!NOTE] For the full architecture, KV layout, usage flow, configuration reference, and scope/limitations, see the [Vault Documentation][ref-doc-vault].

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
[ref-doc-email]: email.md
[ref-doc-queue]: queue.md
[ref-doc-cache]: cache.md
[ref-doc-database]: database.md
[ref-doc-notification]: notification.md
[ref-doc-vault]: vault.md
[ref-doc-logger]: logger.md
