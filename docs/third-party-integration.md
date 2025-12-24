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
AWS_S3_PUBLIC_CREDENTIAL_KEY=your_access_key
AWS_S3_PUBLIC_CREDENTIAL_SECRET=your_secret_key
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

For detailed implementation, see [File Upload][ref-doc-file-upload].

### SES Email

[AWS SES][ref-aws-ses] handles transactional email delivery.

**Packages:**
- `@aws-sdk/client-ses`

**Environment Variables:**
```dotenv
AWS_SES_CREDENTIAL_KEY=your_access_key
AWS_SES_CREDENTIAL_SECRET=your_secret_key
AWS_SES_REGION=ap-southeast-3
```

**Use Cases:**
- Welcome emails
- Password reset emails
- Email verification
- Notification emails

Email processing is handled through the queue system. See [Queue][ref-doc-queue] for details.

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
[pnpm-shield]: https://img.shields.io/badge/pnpm-%232C8EBB.svg?style=for-the-badge&logo=pnpm&logoColor=white&color=F9AD00
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
[ref-nestjs-swagger]: https://docs.nestjs.com/openapi/introduction
[ref-nestjs-swagger-types]: https://docs.nestjs.com/openapi/types-and-parameters
[ref-prisma]: https://www.prisma.io
[ref-prisma-mongodb]: https://www.prisma.io/docs/orm/overview/databases/mongodb#commonalities-with-other-database-provider
[ref-prisma-setup]: https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project#switching-databases
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-pnpm]: https://pnpm.io
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

[ref-doc-root]: ../readme.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-cache]: cache.md
[ref-doc-configuration]: configuration.md
[ref-doc-database]: database.md
[ref-doc-environment]: environment.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-installation]: installation.md
[ref-doc-logger]: logger.md
[ref-doc-message]: message.md
[ref-doc-pagination]: pagination.md
[ref-doc-project-structure]: project-structure.md
[ref-doc-queue]: queue.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-response]: response.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-doc]: doc.md
[ref-doc-third-party-integration]: third-party-integration.md
[ref-doc-presign]: presign.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-two-factor]: two-factor.md

<!-- CONTRIBUTOR -->

[ref-contributor-gzerox]: https://github.com/Gzerox
[ref-contributor-ak2g]: https://github.com/ak2g
