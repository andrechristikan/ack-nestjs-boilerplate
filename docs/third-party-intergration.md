
# Overview

The ACK NestJS Boilerplate uses the following third-party services:

| Category | Service | Purpose |
|----------|---------|---------|
| Cloud Services | AWS S3, SES, Pinpoint | File storage, Email, Notifications |
| Database | MongoDB | Primary data storage |
| Caching | Redis | Caching, Session storage |
| Queue | BullMQ + Redis | Background processing |
| Authentication | JWT, Google OAuth, Apple OAuth | User authentication |
| Monitoring | Sentry | Error tracking |
| Logging | Pino | Structured logging |
| Security | Helmet, CORS | API protection |


## Table of Contents
- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Cloud Services](#cloud-services)
    - [AWS](#aws)
  - [Database \& Caching](#database--caching)
    - [MongoDB](#mongodb)
    - [Redis](#redis)
  - [Authentication](#authentication)
    - [Social Authentication](#social-authentication)
  - [Monitoring \& Logging](#monitoring--logging)
    - [Sentry](#sentry)

## Cloud Services

### AWS

- **S3 (Simple Storage Service)**
  - Purpose: File storage (public & private buckets)
  - Env vars: `AWS_S3_PUBLIC_*`, `AWS_S3_PRIVATE_*`

- **SES (Simple Email Service)**
  - Purpose: Transactional emails
  - Env vars: `AWS_SES_*`

- **Pinpoint**
  - Purpose: SMS and push notifications
  - Env vars: Various Pinpoint configuration

## Database & Caching

### MongoDB
- Purpose: Primary database
- Env vars: `DATABASE_*`
- Implementation: Uses Mongoose ODM

### Redis
- Purpose: Caching and queue backend
- Env vars: `REDIS_*` and `REDIS_QUEUE_*`
- Used by: Cache Manager, BullMQ

## Authentication

### Social Authentication
- **Google OAuth**
  - Env vars: `AUTH_SOCIAL_GOOGLE_*`
  
- **Apple OAuth**
  - Env vars: `AUTH_SOCIAL_APPLE_*`

## Monitoring & Logging

### Sentry
- Purpose: Error tracking and monitoring
- Env vars: `SENTRY_DSN`
