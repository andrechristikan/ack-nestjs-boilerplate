# Overview

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
  - Performance-optimized logging
