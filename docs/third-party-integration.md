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
[yarn-shield]: https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white
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
[ref-prisma]: https://www.prisma.io
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

<!-- DOCUMENTS -->

[ref-doc-root]: readme.md
[ref-doc-audit-activity-log]: docs/audit-activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-message]: docs/message.md
[ref-doc-logger]: docs/logger.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-service-side-pagination]: docs/service-side-pagination.md
[ref-doc-third-party-integration]: docs/third-party-integration.md

<!-- # Overview

The ACK NestJS Boilerplate integrates with various third-party services to provide a complete application framework. This document outlines these integrations and how they're configured in the application.

| Category | Service | Purpose |
|----------|---------|---------|
| Amazon Web Service | S3, SES, Pinpoint | File storage, Email, SMS |
| Database | MongoDB | Primary data storage |
| Caching | Redis | Caching, Session storage |
| Queue | BullMQ + Redis | Background processing |
| Authentication | JWT, Google OAuth, Apple OAuth | User authentication |
| Monitoring | Sentry | Error tracking and performance monitoring |
| Logging | Pino | Structured logging |


# Table of Contents
- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Amazon Web Service](#amazon-web-service)
    - [S3 (Simple Storage Service)](#s3-simple-storage-service)
    - [SES (Simple Email Service)](#ses-simple-email-service)
    - [Pinpoint](#pinpoint)
  - [Database \& Caching](#database--caching)
    - [MongoDB](#mongodb)
    - [Redis](#redis)
  - [Background Processing](#background-processing)
    - [BullMQ](#bullmq)
  - [Authentication](#authentication)
    - [JWT Authentication](#jwt-authentication)
    - [Social Authentication](#social-authentication)
  - [Monitoring \& Logging](#monitoring--logging)
    - [Sentry](#sentry)
    - [Pino Logger](#pino-logger)


## Amazon Web Service

### S3 (Simple Storage Service)
- **Purpose**: File storage with separate public and private buckets
- **Environment Variables**:
  - Public bucket: `AWS_S3_PUBLIC_CREDENTIAL_KEY`, `AWS_S3_PUBLIC_CREDENTIAL_SECRET`, `AWS_S3_PUBLIC_REGION`, `AWS_S3_PUBLIC_BUCKET`, `AWS_S3_PUBLIC_CDN`
  - Private bucket: `AWS_S3_PRIVATE_CREDENTIAL_KEY`, `AWS_S3_PRIVATE_CREDENTIAL_SECRET`, `AWS_S3_PRIVATE_REGION`, `AWS_S3_PRIVATE_BUCKET`, `AWS_S3_PRIVATE_CDN`
- **Features**:
  - Configurable CDN for each bucket
  - Pre-signed URL generation
  - Secure file uploads

### SES (Simple Email Service)
- **Purpose**: Transactional emails
- **Environment Variables**: `AWS_SES_CREDENTIAL_KEY`, `AWS_SES_CREDENTIAL_SECRET`, `AWS_SES_REGION`
- **Implementation**: Used by the `EmailModule` for sending emails

### Pinpoint
- **Purpose**: SMS and push notifications
- **Environment Variables**: `AWS_PINPOINT_CREDENTIAL_KEY`, `AWS_PINPOINT_CREDENTIAL_SECRET`, `AWS_PINPOINT_REGION`, `AWS_PINPOINT_APPLICATION_ID`
- **Implementation**: Used by the `SmsModule` for sending SMS messages

## Database & Caching

### MongoDB
- **Purpose**: Primary database for persistent storage
- **Environment Variables**: `DATABASE_URL`, `DATABASE_DEBUG`
- **Implementation**: Uses Mongoose ODM with schema validation
- **Configuration**: Managed through `DatabaseOptionModule` and `DatabaseOptionService`

### Redis
- **Purpose**: Caching and queue backend
- **Environment Variables**: 
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_TLS_ENABLE`
- **Implementation**:
  - Caching: Uses `CacheModule` with `KeyvRedis` store
  - Queue: Used by BullMQ for background processing
- **Features**:
  - Configurable TTL (Time-To-Live)
  - TLS support for secure connections
  - Separate configuration for cache and queue instances

## Background Processing

### BullMQ
- **Purpose**: Reliable background job processing
- **Implementation**: Uses Redis as the queue backend
- **Configuration**: 
  - Default job options with exponential backoff
  - Retry mechanism (3 attempts)
- **Use Cases**: Email sending, SMS delivery, and other resource-intensive tasks

## Authentication

### JWT Authentication
- **Purpose**: Secure token-based authentication
- **Environment Variables**: 
  - Access Token: `AUTH_JWT_ACCESS_TOKEN_*`
  - Refresh Token: `AUTH_JWT_REFRESH_TOKEN_*`
  - General: `AUTH_JWT_AUDIENCE`, `AUTH_JWT_ISSUER`, `AUTH_JWT_JWKS_URI`
- **Implementation**: Uses ES512 algorithm with separate key pairs for access and refresh tokens

### Social Authentication
- **Google OAuth**
  - **Environment Variables**: `AUTH_SOCIAL_GOOGLE_CLIENT_ID`, `AUTH_SOCIAL_GOOGLE_CLIENT_SECRET`

- **Apple OAuth**
  - **Environment Variables**: `AUTH_SOCIAL_APPLE_CLIENT_ID`, `AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID`

## Monitoring & Logging

### Sentry
- **Purpose**: Error tracking and performance monitoring
- **Environment Variables**: `SENTRY_DSN`
- **Features**:
  - Automatic error capture
  - Performance monitoring
  - Node.js profiling
  - Intelligent event sampling based on environment
  - Filtering out non-error responses and excluded routes

### Pino Logger
- **Purpose**: Fast, structured logging
- **Environment Variables**: `DEBUG_ENABLE`, `DEBUG_LEVEL`, `DEBUG_INTO_FILE`, `DEBUG_PRETTIER`
- **Features**:
  - JSON-formatted logs
  - Multiple log levels
  - Optional file logging
  - Performance-optimized logging -->
