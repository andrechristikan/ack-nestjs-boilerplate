---
title: Configuration Reference
description: Every config key under src/configs with its type, default, and environment variable, plus the integration triggers and the variables only Compose reads.
---

# Configuration Reference

This page lists every key of the 30 config namespaces in `src/configs/` with its environment variable, for a developer who looks up a value, and the variables only Docker Compose and the AI harness read.

## Table of Contents

- [Related Documents](#related-documents)
- [Conventions](#conventions)
- [Namespaces](#namespaces)
    - [analytic](#analytic)
    - [app](#app)
    - [auth](#auth)
    - [aws](#aws)
    - [database](#database)
    - [doc](#doc)
    - [email](#email)
    - [featureFlag](#featureflag)
    - [file](#file)
    - [firebase](#firebase)
    - [forgotPassword](#forgotpassword)
    - [frontend](#frontend)
    - [health](#health)
    - [helper](#helper)
    - [logger](#logger)
    - [message](#message)
    - [mfa](#mfa)
    - [notification](#notification)
    - [outbox](#outbox)
    - [project](#project)
    - [queue](#queue)
    - [redis](#redis)
    - [request](#request)
    - [response](#response)
    - [sentry](#sentry)
    - [session](#session)
    - [termPolicy](#termpolicy)
    - [user](#user)
    - [verification](#verification)
    - [workspace](#workspace)
- [Integration triggers](#integration-triggers)
- [Compose variables](#compose-variables)
- [Harness variables](#harness-variables)

## Related Documents

- [Configuration][ref-doc-concept-configuration]: how an `.env` value becomes a config key
- [Installation][ref-doc-installation]: creating `.env` and `.env.docker` for the local stack
- [Production][ref-doc-production]: the values a deployed environment sets by hand
- [Dependencies][ref-doc-dependencies]: what each optional integration does while it is unset
- [Vault][ref-doc-vault]: filling and pulling an env file

## Conventions

- Key: the path `ConfigService.get('<path>')` reads. The first segment is the namespace: the camelCase of the file name without `.config.ts` (`feature-flag.config.ts` is `featureFlag`).
- Type: the TypeScript type of the config interface. `T | null` is `null` while the environment line is absent or blank.
- Default: the value fixed in code, empty when an environment variable supplies the value. A default may interpolate an environment value: `<APP_NAME>` stands for that variable's value, and a default that depends on another setting names it (`aws.s3.baseUrlPattern` with `AWS_S3_ENDPOINT` set).
- A duration default is written in the notation of the `ms` package (`500ms`, `30s`, `30m`, `7d`), and a size default in the notation of the `bytes` package (`2mb`). The config stores the number in the unit the key name ends in: `InMs`, `InSeconds`, `InMinutes`, `InDays`, `InBytes`.
- Two other unit suffixes hold plain numbers: `Km` is kilometers (`analytic.anomaly.impossibleTravelMinDistanceKm`), and `Percent` is a fraction from 0 to 1 (`health.diskThresholdPercent` `0.75` is 75 percent).
- A default holding `{token}` placeholders is a pattern: [Pattern placeholders][ref-doc-concept-configuration-patterns].
- Env var: the variable `AppEnvSchema` (`src/app/dtos/app.env.dto.ts`) validates and the value comes from. Empty means the value is fixed in code or built from other keys the Default names.
- Variable formats:
    - A boolean variable is exactly `true` or `false`, lower case.
    - `APP_ENV` takes `production`, `staging`, `development`, or `local`.
    - `LOGGER_LEVEL` takes `fatal`, `error`, `warn`, `info`, `debug`, or `trace`.
    - A `string[]` variable is a comma-separated list. Each entry is trimmed and an empty entry is dropped, so an unset or empty optional list (`AUTH_SOCIAL_APPLE_CLIENT_IDS`) holds `[]`. `REQUEST_CORS_ALLOWED_ORIGINS` and `MFA_PASSKEY_ORIGINS` are required and need at least one entry.

## Namespaces

### analytic

Config file: `src/configs/analytic.config.ts`, interface `IConfigAnalytic`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `analytic.cache.dashboardTtlInMs` | `number` | `30m` |  |
| `analytic.cache.anomalySummaryTtlInMs` | `number` | `15m` |  |
| `analytic.cache.liveSummaryTtlInMs` | `number` | `1m` |  |
| `analytic.cache.dashboardKeyPattern` | `string` | `Analytic:Dashboard:{metric}:{start}:{end}` |  |
| `analytic.cache.dashboardPageKeyPattern` | `string` | `Analytic:Dashboard:{metric}:{start}:{end}:{page}:{perPage}` |  |
| `analytic.cache.workspaceSummaryKeyPattern` | `string` | `Analytic:Workspace:{workspaceId}:Summary:{start}:{end}` |  |
| `analytic.cache.workspaceInviteFunnelKeyPattern` | `string` | `Analytic:Workspace:{workspaceId}:InviteFunnel:{start}:{end}` |  |
| `analytic.cache.workspaceJoinOutcomesKeyPattern` | `string` | `Analytic:Workspace:{workspaceId}:JoinOutcomes:{start}:{end}` |  |
| `analytic.cache.workspaceMemberRolesKeyPattern` | `string` | `Analytic:Workspace:{workspaceId}:MemberRoles` |  |
| `analytic.cache.anomalySummaryKeyPattern` | `string` | `Analytic:Anomaly:{signal}:{window}` |  |
| `analytic.cache.fraudSummaryKeyPattern` | `string` | `Analytic:Fraud:{signal}:{window}` |  |
| `analytic.maxWindowInMs` | `number` | `90d` |  |
| `analytic.anomaly.lookbackInMs` | `number` | `30d` |  |
| `analytic.anomaly.impossibleTravelMinDistanceKm` | `number` | `500` |  |
| `analytic.anomaly.impossibleTravelMaxDeltaInMs` | `number` | `1h` |  |
| `analytic.anomaly.loginSpikeIpWindowInMs` | `number` | `10m` |  |
| `analytic.anomaly.loginSpikeIpMinUniqueAccounts` | `number` | `5` |  |
| `analytic.anomaly.deviceProliferationZScoreThreshold` | `number` | `3` |  |
| `analytic.device.inactivityInMs` | `number` | `30d` |  |
| `analytic.user.active.dailyInMs` | `number` | `1d` |  |
| `analytic.user.active.weeklyInMs` | `number` | `7d` |  |
| `analytic.user.active.monthlyInMs` | `number` | `30d` |  |
| `analytic.fraud.credentialStuffingWindowInMs` | `number` | `5m` |  |
| `analytic.fraud.credentialStuffingMinUniqueAccounts` | `number` | `10` |  |
| `analytic.fraud.accountTakeoverNewDeviceAfterPasswordChangeInMs` | `number` | `1h` |  |
| `analytic.fraud.massRegistrationWindowInMs` | `number` | `1h` |  |
| `analytic.fraud.massRegistrationMinAccountsPerIp` | `number` | `5` |  |
| `analytic.fraud.passwordResetEnumerationWindowInMs` | `number` | `10m` |  |
| `analytic.fraud.passwordResetEnumerationMinRequestsPerIp` | `number` | `10` |  |
| `analytic.fraud.sharedFingerprintMinUsersPerFingerprint` | `number` | `2` |  |
| `analytic.fraud.sessionAfterAdmin.sessionAfterAdminRevokeInMs` | `number` | `5m` |  |
| `analytic.fraud.forgotPasswordTokenAbuseWindowInMs` | `number` | `24h` |  |
| `analytic.fraud.forgotPasswordTokenAbuseMinUnusedTokens` | `number` | `5` |  |
| `analytic.fraud.weights.sessionAfterAdmin` | `number` | `50` |  |
| `analytic.fraud.weights.impossibleTravel` | `number` | `40` |  |
| `analytic.fraud.weights.newDeviceAfterPasswordChange` | `number` | `30` |  |
| `analytic.fraud.weights.credentialStuffingIp` | `number` | `30` |  |
| `analytic.fraud.weights.sharedFingerprint` | `number` | `25` |  |
| `analytic.fraud.weights.nearLockout` | `number` | `20` |  |
| `analytic.fraud.weights.massRegistrationIp` | `number` | `20` |  |
| `analytic.fraud.weights.forgotPasswordAbuse` | `number` | `15` |  |
| `analytic.fraud.bands.monitorMax` | `number` | `30` |  |
| `analytic.fraud.bands.reviewMax` | `number` | `60` |  |
| `analytic.fraud.bands.elevateMax` | `number` | `90` |  |
| `analytic.fraud.riskScoreLookbackInMs` | `number` | `24h` |  |
| `analytic.fraud.nearLockoutOffset` | `number` | `1` |  |
| `analytic.project.perWorkspaceLimit` | `number` | `100` |  |
| `analytic.snapshot.writeBatchSize` | `number` | `1000` |  |
| `analytic.snapshot.refreshIntervalInMs` | `number` | `15m` |  |

### app

Config file: `src/configs/app.config.ts`, interface `IConfigApp`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `app.name` | `string` |  | `APP_NAME` |
| `app.env` | `EnumAppEnvironment` |  | `APP_ENV` |
| `app.timezone` | `string` | `Asia/Jakarta` |  |
| `app.encryptionSecret` | `string` |  | `APP_ENCRYPTION_SECRET` |
| `app.author.name` | `string` | `author.name` in `package.json` |  |
| `app.author.emailAddress` | `string` | `author.email` in `package.json` |  |
| `app.url` | `string` | `repository.url` in `package.json` |  |
| `app.globalPrefix` | `string` | `/api` |  |
| `app.http.host` | `string` |  | `APP_HTTP_HOST` |
| `app.http.port` | `number` |  | `APP_HTTP_PORT` |
| `app.http.trustedProxies` | `string \| null` |  | `APP_HTTP_TRUSTED_PROXIES` |
| `app.urlVersioning.enabled` | `boolean` | `true` |  |
| `app.urlVersioning.prefix` | `string` | `v` |  |
| `app.urlVersioning.defaultVersion` | `string` | `1` |  |

### auth

Config file: `src/configs/auth.config.ts`, interface `IConfigAuth`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `auth.jwt.accessToken.jwksUri` | `string` |  | `AUTH_JWT_ACCESS_TOKEN_JWKS_URI` |
| `auth.jwt.accessToken.kid` | `string` |  | `AUTH_JWT_ACCESS_TOKEN_KID` |
| `auth.jwt.accessToken.algorithm` | `Algorithm` | `ES256` |  |
| `auth.jwt.accessToken.privateKey` | `string` |  | `AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY` |
| `auth.jwt.accessToken.expiresInSeconds` | `number` | `1h` |  |
| `auth.jwt.refreshToken.jwksUri` | `string` |  | `AUTH_JWT_REFRESH_TOKEN_JWKS_URI` |
| `auth.jwt.refreshToken.kid` | `string` |  | `AUTH_JWT_REFRESH_TOKEN_KID` |
| `auth.jwt.refreshToken.algorithm` | `Algorithm` | `ES512` |  |
| `auth.jwt.refreshToken.privateKey` | `string` |  | `AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY` |
| `auth.jwt.refreshToken.expiresInSeconds` | `number` | `30d` |  |
| `auth.jwt.audience` | `string` |  | `AUTH_JWT_AUDIENCE` |
| `auth.jwt.issuer` | `string` |  | `AUTH_JWT_ISSUER` |
| `auth.jwt.jtiLength` | `number` | `32` |  |
| `auth.password.temporaryExpiresInMs` | `number` | `3d` |  |
| `auth.password.periodInDays` | `number` | `90d` |  |
| `auth.password.temporaryLength` | `number` | `10` |  |
| `auth.password.contextWordMinLength` | `number` | `4` |  |
| `auth.social.google.clientId` | `string \| null` |  | `AUTH_SOCIAL_GOOGLE_CLIENT_ID` |
| `auth.social.apple.clientIds` | `string[]` |  | `AUTH_SOCIAL_APPLE_CLIENT_IDS` |
| `auth.social.nonce.length` | `number` | `32` |  |
| `auth.social.nonce.expiresInMs` | `number` | `5m` |  |
| `auth.xApiKey.keyLength` | `number` | `25` |  |
| `auth.xApiKey.secretLength` | `number` | `50` |  |
| `auth.xApiKey.keyPattern` | `string` | `ApiKey:{key}` |  |
| `auth.xApiKey.cacheTtlInMs` | `number` | `5m` |  |
| `auth.xApiKey.leaseKeyPattern` | `string` | `ApiKey:Lease:{key}` |  |
| `auth.xApiKey.leaseTtlInMs` | `number` | `10s` |  |
| `auth.jwks.requestsPerMinute` | `number` | `60` |  |
| `auth.jwks.cacheMaxAgeInMs` | `number` | `10m` |  |

### aws

Config file: `src/configs/aws.config.ts`, interface `IConfigAws`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `aws.s3.multipartExpiresInDays` | `number` | `3d` |  |
| `aws.s3.temporaryPath` | `string` | `temporary` |  |
| `aws.s3.temporaryExpiresInDays` | `number` | `1d` |  |
| `aws.s3.presignExpiresInSeconds` | `number` | `30m` |  |
| `aws.s3.corsMaxAgeLongInSeconds` | `number` | `1d` |  |
| `aws.s3.corsMaxAgeShortInSeconds` | `number` | `1h` |  |
| `aws.s3.maxAttempts` | `number` | `3` |  |
| `aws.s3.timeoutInMs` | `number` | `30s` |  |
| `aws.s3.deleteDirMaxIterations` | `number` | `100` |  |
| `aws.s3.listMaxKeys` | `number` | `100` |  |
| `aws.s3.region` | `string \| null` |  | `AWS_S3_REGION` |
| `aws.s3.endpoint` | `string \| null` |  | `AWS_S3_ENDPOINT` |
| `aws.s3.baseUrlPattern` | `string` | `{endpoint}/{bucket}` with `AWS_S3_ENDPOINT` set, else `https://{bucket}.s3.{region}.amazonaws.com` |  |
| `aws.s3.objectUrlPattern` | `string` | `{baseUrl}/{key}` |  |
| `aws.s3.cdnUrlPattern` | `string` | `{cdnUrl}/{key}` |  |
| `aws.s3.accessKeyId` | `string \| null` |  | `AWS_S3_ACCESS_KEY_ID` |
| `aws.s3.secretAccessKey` | `string \| null` |  | `AWS_S3_SECRET_ACCESS_KEY` |
| `aws.s3.iamPrincipalArn` | `string \| null` |  | `AWS_S3_IAM_PRINCIPAL_ARN` |
| `aws.s3.public.bucket` | `string \| null` |  | `AWS_S3_PUBLIC_BUCKET` |
| `aws.s3.public.arn` | `string \| null` | `arn:aws:s3:::<bucket>` when the bucket is set |  |
| `aws.s3.public.cdnUrl` | `string \| null` |  | `AWS_S3_PUBLIC_CDN_URL` |
| `aws.s3.private.bucket` | `string \| null` |  | `AWS_S3_PRIVATE_BUCKET` |
| `aws.s3.private.arn` | `string \| null` | `arn:aws:s3:::<bucket>` when the bucket is set |  |
| `aws.s3.private.cdnUrl` | `string \| null` |  | `AWS_S3_PRIVATE_CDN_URL` |
| `aws.ses.accessKeyId` | `string \| null` |  | `AWS_SES_ACCESS_KEY_ID` |
| `aws.ses.secretAccessKey` | `string \| null` |  | `AWS_SES_SECRET_ACCESS_KEY` |
| `aws.ses.identityArn` | `string \| null` |  | `AWS_SES_IDENTITY_ARN` |
| `aws.ses.region` | `string \| null` |  | `AWS_SES_REGION` |
| `aws.ses.endpoint` | `string \| null` |  | `AWS_SES_ENDPOINT` |
| `aws.ses.maxAttempts` | `number` | `1` |  |
| `aws.ses.timeoutInMs` | `number` | `30s` |  |

### database

Config file: `src/configs/database.config.ts`, interface `IConfigDatabase`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `database.url` | `string` |  | `DATABASE_URL` |
| `database.debugEnabled` | `boolean` |  | `DATABASE_DEBUG_ENABLED` |
| `database.seedTransactionTimeoutInMs` | `number` | `60s` |  |
| `database.seedBatchSize` | `number` | `1000` |  |
| `database.serverSelectionTimeoutInMs` | `number` | `5s` |  |
| `database.connectTimeoutInMs` | `number` | `5s` |  |
| `database.slowQueryThresholdInMs` | `number` | `500ms` |  |

### doc

Config file: `src/configs/doc.config.ts`, interface `IConfigDoc`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `doc.name` | `string` | `<APP_NAME> APIs Specification` | `APP_NAME` |
| `doc.prefix` | `string` | `/docs` |  |
| `doc.version` | `string` | `3.1.0` |  |
| `doc.jsonUrlPattern` | `string` | `{docPrefix}/json` |  |

### email

Config file: `src/configs/email.config.ts`, interface `IConfigEmail`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `email.noReplyAddress` | `string \| null` |  | `EMAIL_NO_REPLY_ADDRESS` |
| `email.supportAddress` | `string \| null` |  | `EMAIL_SUPPORT_ADDRESS` |
| `email.batchSize` | `number` | `50` |  |

### featureFlag

Config file: `src/configs/feature-flag.config.ts`, interface `IConfigFeatureFlag`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `featureFlag.keyPattern` | `string` | `FeatureFlag:{key}` |  |
| `featureFlag.cacheTtlInMs` | `number` | `1h` |  |
| `featureFlag.leaseKeyPattern` | `string` | `FeatureFlag:Lease:{key}` |  |
| `featureFlag.leaseTtlInMs` | `number` | `10s` |  |
| `featureFlag.anonymous.idMaxLength` | `number` | `100` |  |

### file

Config file: `src/configs/file.config.ts`, interface `IConfigFile`.

| Key                                | Type     | Default | Env var |
| ---------------------------------- | -------- | ------- | ------- |
| `file.maxDataImport`               | `number` | `100`   |         |
| `file.maxDataExport`               | `number` | `1000`  |         |
| `file.maxSizeExportInBytes`        | `number` | `2mb`   |         |
| `file.importValidationConcurrency` | `number` | `10`    |         |

### firebase

Config file: `src/configs/firebase.config.ts`, interface `IConfigFirebase`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `firebase.projectId` | `string \| null` |  | `FIREBASE_PROJECT_ID` |
| `firebase.clientEmailAddress` | `string \| null` |  | `FIREBASE_CLIENT_EMAIL_ADDRESS` |
| `firebase.privateKey` | `string \| null` |  | `FIREBASE_PRIVATE_KEY` |

### forgotPassword

Config file: `src/configs/forgot-password.config.ts`, interface `IConfigForgotPassword`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `forgotPassword.expiresInMinutes` | `number` | `5m` |  |
| `forgotPassword.tokenLength` | `number` | `100` |  |
| `forgotPassword.linkPattern` | `string` | `{frontendBaseUrl}/forgot-password?token={token}` |  |
| `forgotPassword.resendInMinutes` | `number` | `2m` |  |
| `forgotPassword.retentionInMs` | `number` | `90d` |  |
| `forgotPassword.reference.prefix` | `string` | `FG` |  |
| `forgotPassword.reference.length` | `number` | `25` |  |

### frontend

Config file: `src/configs/frontend.config.ts`, interface `IConfigFrontend`.

| Key                | Type     | Default | Env var             |
| ------------------ | -------- | ------- | ------------------- |
| `frontend.name`    | `string` |         | `FRONTEND_NAME`     |
| `frontend.baseUrl` | `string` |         | `FRONTEND_BASE_URL` |

### health

Config file: `src/configs/health.config.ts`, interface `IConfigHealth`.

| Key                                  | Type     | Default | Env var |
| ------------------------------------ | -------- | ------- | ------- |
| `health.memoryRssThresholdInBytes`   | `number` | `300mb` |         |
| `health.memoryHeapThresholdInBytes`  | `number` | `300mb` |         |
| `health.diskThresholdPercent`        | `number` | `0.75`  |         |
| `health.diskPath`                    | `string` | `/`     |         |
| `health.gracefulShutdownTimeoutInMs` | `number` | `30s`   |         |
| `health.jwksTimeoutInMs`             | `number` | `3s`    |         |

### helper

Config file: `src/configs/helper.config.ts`, interface `IConfigHelper`.

| Key                           | Type     | Default | Env var |
| ----------------------------- | -------- | ------- | ------- |
| `helper.argon2.memoryInBytes` | `number` | `19mb`  |         |
| `helper.argon2.passes`        | `number` | `2`     |         |
| `helper.argon2.parallelism`   | `number` | `1`     |         |
| `helper.argon2.saltLength`    | `number` | `16`    |         |
| `helper.argon2.tagLength`     | `number` | `32`    |         |

### logger

Config file: `src/configs/logger.config.ts`, interface `IConfigLogger`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `logger.enabled` | `boolean` |  | `LOGGER_ENABLED` |
| `logger.level` | `EnumLoggerLevel` |  | `LOGGER_LEVEL` |
| `logger.fileEnabled` | `boolean` |  | `LOGGER_FILE_ENABLED` |
| `logger.filePath` | `string` | `/logs` |  |
| `logger.accessLogEnabled` | `boolean` |  | `LOGGER_ACCESS_LOG_ENABLED` |
| `logger.excludedRoutes` | `string[]` | `/api/public/hello`, `/api/system/health`, their sub-paths, `/metrics`, `/favicon.ico`, `/docs`, `/` |  |
| `logger.prettyEnabled` | `boolean` |  | `LOGGER_PRETTY_ENABLED` |

### message

Config file: `src/configs/message.config.ts`, interface `IConfigMessage`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `message.availableLanguages` | `string[]` | every `EnumMessageLanguage` value |  |
| `message.defaultLanguage` | `EnumMessageLanguage` | `en` |  |

### mfa

Config file: `src/configs/mfa.config.ts`, interface `IConfigMfa`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `mfa.totp.strategy` | `OTPStrategy` | `totp` |  |
| `mfa.totp.algorithm` | `HashAlgorithm` | `sha1` |  |
| `mfa.totp.issuer` | `string` |  | `MFA_TOTP_ISSUER` |
| `mfa.totp.digits` | `number` | `6` |  |
| `mfa.totp.periodInSeconds` | `number` | `30s` |  |
| `mfa.totp.window` | `number` | `1` |  |
| `mfa.totp.secretLength` | `number` | `32` |  |
| `mfa.totp.encryptionSecret` | `string` |  | `MFA_TOTP_ENCRYPTION_SECRET` |
| `mfa.challengeExpiresInMs` | `number` | `5m` |  |
| `mfa.challengeRetentionInMs` | `number` | `7d` |  |
| `mfa.backupCodes.count` | `number` | `8` |  |
| `mfa.backupCodes.length` | `number` | `10` |  |
| `mfa.passkey.rpId` | `string` |  | `MFA_PASSKEY_RP_ID` |
| `mfa.passkey.rpName` | `string` |  | `APP_NAME` |
| `mfa.passkey.origins` | `string[]` |  | `MFA_PASSKEY_ORIGINS` |

### notification

Config file: `src/configs/notification.config.ts`, interface `IConfigNotification`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `notification.push.cleanupStaleTokensCron` | `string` | `0 0 * * *` |  |
| `notification.push.staleTokenThresholdInMs` | `number` | `30d` |  |
| `notification.idempotencyKey.userPattern` | `string` | `{process}-{userId}` |  |
| `notification.idempotencyKey.referencePattern` | `string` | `{process}-{reference}` |  |
| `notification.idempotencyKey.joinRequestPattern` | `string` | `{process}-{joinRequestId}-{userId}` |  |
| `notification.idempotencyKey.termPolicyBatchPattern` | `string` | `{process}-{termPolicyId}-{batchId}` |  |
| `notification.idempotencyKey.termPolicyBatchResendPattern` | `string` | `{process}-{termPolicyId}-{batchId}-{resendNonce}` |  |
| `notification.idempotencyKey.userTermPolicyPattern` | `string` | `{process}-{userId}-{termPolicyId}` |  |
| `notification.idempotencyKey.stepPattern` | `string` | `{process}-{notificationId}` |  |

### outbox

Config file: `src/configs/outbox.config.ts`, interface `IConfigOutbox`.

| Key                         | Type     | Default | Env var |
| --------------------------- | -------- | ------- | ------- |
| `outbox.sweepIntervalInMs`  | `number` | `1m`    |         |
| `outbox.pendingAfterInMs`   | `number` | `30s`   |         |
| `outbox.enqueuedAfterInMs`  | `number` | `1h`    |         |
| `outbox.sweepBatch`         | `number` | `100`   |         |
| `outbox.sweepKeepCompleted` | `number` | `20`    |         |

### project

Config file: `src/configs/project.config.ts`, interface `IConfigProject`.

| Key                          | Type     | Default        | Env var |
| ---------------------------- | -------- | -------------- | ------- |
| `project.slugPrefix`         | `string` | `p-`           |         |
| `project.slugMaxLength`      | `number` | `30`           |         |
| `project.slugMaxAttempts`    | `number` | `5`            |         |
| `project.deletedSlugPattern` | `string` | `deleted-{id}` |         |
| `project.delete.chunkSize`   | `number` | `100`          |         |

### queue

Config file: `src/configs/queue.config.ts`, interface `IConfigQueue`.

| Key                                      | Type     | Default | Env var |
| ---------------------------------------- | -------- | ------- | ------- |
| `queue.job.maxAttempts`                  | `number` | `3`     |         |
| `queue.job.keepLogs`                     | `number` | `20`    |         |
| `queue.job.removeOnCompleteAgeInSeconds` | `number` | `7d`    |         |
| `queue.job.removeOnFailAgeInSeconds`     | `number` | `14d`   |         |
| `queue.job.defaultBackoffDelayInMs`      | `number` | `3s`    |         |
| `queue.job.emailBackoffDelayInMs`        | `number` | `10s`   |         |
| `queue.job.pushBackoffDelayInMs`         | `number` | `5s`    |         |
| `queue.job.smsBackoffDelayInMs`          | `number` | `5s`    |         |
| `queue.job.notificationBackoffDelayInMs` | `number` | `3s`    |         |
| `queue.job.workspaceBackoffDelayInMs`    | `number` | `10s`   |         |
| `queue.job.analyticBackoffDelayInMs`     | `number` | `10s`   |         |
| `queue.job.activityLogBackoffDelayInMs`  | `number` | `10s`   |         |
| `queue.job.termPolicyBackoffDelayInMs`   | `number` | `10s`   |         |
| `queue.job.userBackoffDelayInMs`         | `number` | `10s`   |         |
| `queue.job.userAuthBackoffDelayInMs`     | `number` | `3s`    |         |
| `queue.job.outboxBackoffDelayInMs`       | `number` | `10s`   |         |
| `queue.job.cacheBackoffDelayInMs`        | `number` | `3s`    |         |

### redis

Config file: `src/configs/redis.config.ts`, interface `IConfigRedis`.

| Key                                | Type     | Default | Env var           |
| ---------------------------------- | -------- | ------- | ----------------- |
| `redis.cache.url`                  | `string` |         | `REDIS_CACHE_URL` |
| `redis.cache.namespace`            | `string` | `Cache` |                   |
| `redis.queue.url`                  | `string` |         | `REDIS_QUEUE_URL` |
| `redis.queue.namespace`            | `string` | `Queue` |                   |
| `redis.queue.connectTimeoutInMs`   | `number` | `5s`    |                   |
| `redis.queue.maxRetriesPerRequest` | `number` | `1`     |                   |
| `redis.commandTimeoutInMs`         | `number` | `2s`    |                   |
| `redis.connectTimeoutInMs`         | `number` | `5s`    |                   |

### request

Config file: `src/configs/request.config.ts`, interface `IConfigRequest`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `request.body.json.limitInBytes` | `number` | `500kb` |  |
| `request.body.text.limitInBytes` | `number` | `1mb` |  |
| `request.body.urlencoded.limitInBytes` | `number` | `1mb` |  |
| `request.body.applicationOctetStream.limitInBytes` | `number` | `FileSizeInBytes` (`src/common/file/constants/file.constant.ts`) |  |
| `request.timeoutInMs` | `number` | `30s` |  |
| `request.cors.allowedMethods` | `string[]` | `GET`, `DELETE`, `PUT`, `PATCH`, `POST`, `HEAD`, `OPTIONS` |  |
| `request.cors.allowedOrigins` | `string[]` |  | `REQUEST_CORS_ALLOWED_ORIGINS` |
| `request.cors.allowedHeaders` | `string[]` | the standard CORS request headers plus `Authorization`, `x-api-key`, `x-workspace-id`, `x-anonymous-id`, `x-custom-lang`, `x-request-id`, `x-correlation-id`, `x-timestamp`, `x-timezone`, `x-version`, `x-repo-version` |  |
| `request.cors.exposedHeaders` | `string[]` | `Retry-After`, the `X-RateLimit-*` headers, `x-custom-lang`, `x-timestamp`, `x-timezone`, `x-version`, `x-repo-version`, `x-request-id`, `x-correlation-id` |  |
| `request.cors.maxAgeInSeconds` | `number` | `1d` |  |
| `request.helmet.maxAgeInSeconds` | `number` | `365d` |  |
| `request.helmet.includeSubDomainsEnabled` | `boolean` | `true` |  |
| `request.helmet.preloadEnabled` | `boolean` | `false` |  |
| `request.throttle.default.ttlInMs` | `number` | `1m` |  |
| `request.throttle.default.limit` | `number` | `300` |  |
| `request.throttle.default.blockDurationInMs` | `number` | `1m` |  |
| `request.throttle.user.ttlInMs` | `number` | `1m` |  |
| `request.throttle.user.limit` | `number` | `100` |  |
| `request.throttle.user.blockDurationInMs` | `number` | `1m` |  |
| `request.throttle.route.strict.ttlInMs` | `number` | `1m` |  |
| `request.throttle.route.strict.limit` | `number` | `5` |  |
| `request.throttle.route.strict.blockDurationInMs` | `number` | `5m` |  |
| `request.throttle.route.moderate.ttlInMs` | `number` | `1m` |  |
| `request.throttle.route.moderate.limit` | `number` | `20` |  |
| `request.throttle.route.moderate.blockDurationInMs` | `number` | `5m` |  |
| `request.throttle.route.relaxed.ttlInMs` | `number` | `1m` |  |
| `request.throttle.route.relaxed.limit` | `number` | `60` |  |
| `request.throttle.route.relaxed.blockDurationInMs` | `number` | `5m` |  |
| `request.throttle.keyPattern` | `string` | `Request:Throttle:{name}:{tracker}` |  |
| `request.throttle.blockKeyPattern` | `string` | `Request:Throttle:Block:{name}:{tracker}` |  |
| `request.throttle.sequenceKeyPattern` | `string` | `Request:Throttle:Seq:{name}:{tracker}` |  |

### response

Config file: `src/configs/response.config.ts`, interface `IConfigResponse`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `response.filenameExportPattern` | `string` | `export-{timestamp}.{extension}` |  |

### sentry

Config file: `src/configs/sentry.config.ts`, interface `IConfigSentry`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `sentry.dsn` | `string \| null` |  | `SENTRY_DSN` |
| `sentry.tracesSampleRate` | `number` |  | `SENTRY_TRACES_SAMPLE_RATE` |
| `sentry.profilesSampleRate` | `number` |  | `SENTRY_PROFILES_SAMPLE_RATE` |
| `sentry.maxBreadcrumbs` | `number` | `30` |  |
| `sentry.normalizeDepth` | `number` | `3` |  |
| `sentry.maxValueLength` | `number` | `1000` |  |

### session

Config file: `src/configs/session.config.ts`, interface `IConfigSession`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `session.keyPattern` | `string` | `User:{userId}:Session:{sessionId}` |  |
| `session.loginCacheTtlInMs` | `number` | `15m` |  |
| `session.idleTimeoutInMs` | `number` | `7d` |  |
| `session.retentionInMs` | `number` | `90d` |  |

### termPolicy

Config file: `src/configs/term-policy.config.ts`, interface `IConfigTermPolicy`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `termPolicy.uploadContentPathPattern` | `string` | `term-policies/{type}/v{version}` |  |
| `termPolicy.contentPublicPathPattern` | `string` | `term-policies/{type}/v{version}` |  |
| `termPolicy.contentKeyRandomLength` | `number` | `20` |  |
| `termPolicy.content.maxSizeInBytes` | `number` | `10mb` |  |
| `termPolicy.idempotencyKey.publishPattern` | `string` | `{process}-{termPolicyId}` |  |
| `termPolicy.idempotencyKey.resendPublishPattern` | `string` | `{process}-{termPolicyId}-{resendNonce}` |  |

### user

Config file: `src/configs/user.config.ts`, interface `IConfigUser`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `user.uploadPhotoProfilePathPattern` | `string` | `users/{userId}/profile` |  |
| `user.photo.maxSizeInBytes` | `number` | `2mb` |  |
| `user.photo.filenameRandomLength` | `number` | `20` |  |
| `user.purgeExpiredCron` | `string` | `0 3 * * *` |  |
| `user.maxDataImport` | `number` | `50` |  |
| `user.maxDataExport` | `number` | `5000` |  |
| `user.default.role` | `string` | `user` |  |
| `user.default.country` | `string` | `ID` |  |
| `user.createTimeoutInMs` | `number` | `10s` |  |
| `user.createBulkTimeoutInMs` | `number` | `30s` |  |
| `user.export.pathPattern` | `string` | `{temporaryPath}/exports/users/{outboxId}.csv` |  |
| `user.export.presignExpiresInSeconds` | `number` | `24h` |  |
| `user.deleteSelfTimeoutInMs` | `number` | `30s` |  |
| `user.deleteSelfEmailPattern` | `string` | `deleted.{id}` |  |
| `user.deleteSelfUsernamePattern` | `string` | `deleted.{id}` |  |

### verification

Config file: `src/configs/verification.config.ts`, interface `IConfigVerification`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `verification.expiresInMinutes` | `number` | `5m` |  |
| `verification.otpLength` | `number` | `6` |  |
| `verification.tokenLength` | `number` | `100` |  |
| `verification.linkPattern` | `string` | `{frontendBaseUrl}/verify-email?token={token}` |  |
| `verification.resendInMinutes` | `number` | `2m` |  |
| `verification.retentionInMs` | `number` | `90d` |  |
| `verification.reference.prefix` | `string` | `VER` |  |
| `verification.reference.length` | `number` | `25` |  |

### workspace

Config file: `src/configs/workspace.config.ts`, interface `IConfigWorkspace`.

| Key | Type | Default | Env var |
| --- | --- | --- | --- |
| `workspace.personalNamePattern` | `string` | `{username}'s workspace` |  |
| `workspace.slugPrefix` | `string` | `w-` |  |
| `workspace.slugMaxLength` | `number` | `30` |  |
| `workspace.slugMaxAttempts` | `number` | `5` |  |
| `workspace.deletedSlugPattern` | `string` | `deleted-{id}` |  |
| `workspace.delete.timeoutInMs` | `number` | `10s` |  |
| `workspace.invite.tokenLength` | `number` | `100` |  |
| `workspace.invite.referencePrefix` | `string` | `WIN` |  |
| `workspace.invite.referenceRandomLength` | `number` | `25` |  |
| `workspace.invite.referenceMaxAttempts` | `number` | `5` |  |
| `workspace.invite.expireChunkSize` | `number` | `100` |  |
| `workspace.invite.linkPattern` | `string` | `{frontendBaseUrl}/workspace/invites?inviteToken={token}` |  |
| `workspace.invite.signUpLinkPattern` | `string` | `{frontendBaseUrl}/sign-up?inviteToken={token}` |  |
| `workspace.invite.expirySweepCron` | `string` | `0 * * * *` |  |
| `workspace.joinRequest.reviewLinkPattern` | `string` | `{frontendBaseUrl}/workspace/join-requests/{joinRequestId}` |  |
| `workspace.joinRequest.expireChunkSize` | `number` | `100` |  |

## Integration triggers

Each optional integration turns on from the variables in the second column, and `AppEnvSchema` then requires the variables in the third. An integration whose trigger is unset boots as a no-op: [Optional adapters][ref-doc-dependencies-optional-adapters].

| Integration | Turned on by | Then required |
| --- | --- | --- |
| AWS S3 | `AWS_S3_ACCESS_KEY_ID` or `AWS_S3_SECRET_ACCESS_KEY` | `AWS_S3_ACCESS_KEY_ID`, `AWS_S3_SECRET_ACCESS_KEY`, `AWS_S3_REGION`, `AWS_S3_PUBLIC_BUCKET`, `AWS_S3_PRIVATE_BUCKET` |
| AWS SES | `AWS_SES_ACCESS_KEY_ID` or `AWS_SES_SECRET_ACCESS_KEY` | `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`, `AWS_SES_REGION`, `EMAIL_NO_REPLY_ADDRESS`, `EMAIL_SUPPORT_ADDRESS` |
| Firebase | any `FIREBASE_*` key | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL_ADDRESS`, `FIREBASE_PRIVATE_KEY` |
| Google sign-in | `AUTH_SOCIAL_GOOGLE_CLIENT_ID` | nothing else |
| Apple sign-in | `AUTH_SOCIAL_APPLE_CLIENT_IDS` | nothing else |
| Sentry | `SENTRY_DSN` | nothing else |

- A missing member of a triggered group fails boot with `<KEY> is required when <reason>`.
- A region, bucket, CDN, endpoint, or `EMAIL_*` value set alone does not turn an integration on.
- `AWS_S3_IAM_PRINCIPAL_ARN` is read by the `awsS3Config` seed only: [Cloud setup][ref-doc-production-cloud-setup].
- `SENTRY_TRACES_SAMPLE_RATE` and `SENTRY_PROFILES_SAMPLE_RATE` are required numbers from 0 to 1 whether or not `SENTRY_DSN` is set.

`MFA_PASSKEY_ORIGINS` is a comma-separated list and each entry takes one of four shapes:

- An exact origin: `https://host` or `http://host[:port]`, no path, no trailing slash.
- `https://*.<domain>`, with `<domain>` the `MFA_PASSKEY_RP_ID` value or a name under it.
- `android:apk-key-hash:<hash>`.
- `*`, accepted outside production only, which admits any origin.

The values a deployed environment sets: [Variables set by hand][ref-doc-production-variables].

## Compose variables

The `DOCKER_*` variables sit in `.env.docker`, a file Docker Compose reads and the application never loads. Every Compose command passes it with `--env-file .env.docker`. There is no example file.

| Variable | Local default | Effect | Required by `ci/docker-compose.yml` |
| --- | --- | --- | --- |
| `DOCKER_APIS_PORT` | `3000` | Host port of the `apis` container in `docker-compose.yml` | not read |
| `DOCKER_MONGO_PORT` | `27017` | Host port of MongoDB and the port in the replica set member host `host.docker.internal:<port>` | not read |
| `DOCKER_MONGO_ROOT_USERNAME` | `root` | Name of the MongoDB root account | yes |
| `DOCKER_MONGO_ROOT_PASSWORD` | empty | Empty starts MongoDB without authentication. Set, MongoDB starts with `--keyFile` and `--auth` and the entrypoint creates the root user in `admin` | yes |
| `DOCKER_MONGO_APP_USERNAME` | empty | With the password and the database set, the entrypoint creates this user with `readWrite` on that database | yes |
| `DOCKER_MONGO_APP_PASSWORD` | empty | Password of the application user | yes |
| `DOCKER_MONGO_APP_DATABASE` | empty | Database of the application user | yes |
| `DOCKER_REDIS_QUEUE_PASSWORD` | empty | `--requirepass` of `redis-queue`, and the password BullBoard connects with | yes |
| `DOCKER_REDIS_CACHE_PASSWORD` | empty | `--requirepass` of `redis-cache` | yes |
| `DOCKER_BULLBOARD_USERNAME` | `admin` | BullBoard login name | yes |
| `DOCKER_BULLBOARD_PASSWORD` | `admin123` | BullBoard login password | yes |
| `DOCKER_APIS_UID` | none | User id the `apis` and `migrate` containers run as: the id of the host account that owns `.env` | yes |
| `DOCKER_APIS_GID` | none | Group id of that account | yes |

- The local file reads each variable as `${DOCKER_X:-default}`, so an absent `.env.docker` entry takes the default.
- `ci/docker-compose.yml` reads the eleven required variables as `${DOCKER_X:?message}` and stops every command, naming the empty one.
- With authentication on, the credentials go into the application URLs: [Installation][ref-doc-installation].

## Harness variables

`.env.harness` is read by the AI harness only. The application never loads it, and no agent reads it.

| Variable | Effect |
| --- | --- |
| `TYPESAFE_API_KEY` | Turns on TypeSafe's Jev routing |
| `JEV_ROUTER_ENABLED` | `false` turns Jev off |
| `MCP_MONGODB_URL` | Connection URL of the read-only MongoDB MCP server |
| `MCP_REDIS_CACHE_URL` | Connection URL of the read-only cache Redis MCP server |
| `MCP_REDIS_QUEUE_URL` | Connection URL of the read-only queue Redis MCP server |

What each one controls: [Model and effort][ref-doc-harness-model] and [Database and Redis reads][ref-doc-harness-reads].

<!-- REFERENCES -->

[ref-doc-concept-configuration]: ../concepts/configuration.md
[ref-doc-concept-configuration-patterns]: ../concepts/configuration.md#pattern-placeholders
[ref-doc-installation]: ../getting-started/installation.md
[ref-doc-production]: ../production.md
[ref-doc-production-variables]: ../production.md#variables-set-by-hand
[ref-doc-production-cloud-setup]: ../production.md#cloud-setup
[ref-doc-dependencies]: ../concepts/dependencies.md
[ref-doc-dependencies-optional-adapters]: ../concepts/dependencies.md#optional-adapters
[ref-doc-vault]: ../concepts/vault.md
[ref-doc-harness-model]: ../concepts/ai-harness.md#model-and-effort
[ref-doc-harness-reads]: ../concepts/ai-harness.md#database-and-redis-reads
