# Cache Documentation

## Overview

This application uses **Redis** as the cache storage backend to improve performance and reduce database load. The cache is implemented using a global module pattern, making it accessible throughout the application without repeated imports.


## Table of Contents

- [Overview](#overview)
- [Stack](#stack)
- [Why Keyv?](#why-keyv)
- [Principles & Patterns](#principles--patterns)
- [Architecture](#architecture)
    - [Module Dependency Flow](#module-dependency-flow)
    - [RedisCacheModule](#rediscachemodule)
    - [CacheMainModule](#cachemainmodule)
    - [SessionModule](#sessionmodule)
- [Configuration](#configuration)
    - [Redis Configuration](#redis-configuration)
    - [Module Import Order](#module-import-order)
- [Usage](#usage)
    - [Injecting Cache Providers](#injecting-cache-providers)
    - [Cache Operations](#cache-operations)
- [Use Cases](#use-cases)

## Stack

- **Redis**: In-memory data store for cache storage
- **@nestjs/cache-manager**: NestJS cache management library
- **cache-manager**: Core caching library
- **@keyv/redis**: Redis adapter for Keyv
- **Keyv**: Universal key-value storage interface

## Why Keyv?

This application uses **cache-manager v6** which migrated to **Keyv** as the unified storage interface. We use `@keyv/redis` as the Redis adapter.

## Principles & Patterns

### DRY & Singleton Pattern

- **Single Redis Connection**: Only ONE Redis connection created and shared across all services
- **Single Configuration**: Defined once in `redis.config.ts`
- **Reusable Providers**: `CacheMainProvider` and `SessionCacheProvider` share the same Redis client

**Example:**

```
❌ Without DRY:
UserService → Creates Redis connection 1
ProductService → Creates Redis connection 2
OrderService → Creates Redis connection 3

✅ With DRY:
RedisCacheModule → Creates ONE Redis connection
All services → Inject and reuse the same connection
```

### Global Module Pattern

`RedisCacheModule` and `CacheMainModule` are marked as `@Global()`:
- Providers automatically available everywhere
- No need to import in feature modules

## Architecture

### Module Dependency Flow

```
CommonModule
    ├── RedisCacheModule (Global)
    │   └── Creates: RedisClientCachedProvider
    │
    ├── CacheMainModule (Global)
    │   └── Uses: RedisClientCachedProvider
    │   └── Provides: CacheMainProvider
    │
    └── SessionModule
        └── Uses: RedisClientCachedProvider
        └── Provides: SessionCacheProvider (Scoped)
```

### RedisCacheModule

**Purpose:** Provides Redis client instance

**Provider:** `RedisClientCachedProvider`

**Scope:** Global (available everywhere)

**Configuration:**
```typescript
createKeyv(
    { url: 'redis://localhost:6379' },
    {
        connectionTimeout: 30000,
        namespace: 'cache',
        useUnlink: true,
        keyPrefixSeparator: ':'
    }
)
```

### CacheMainModule

**Purpose:** Provides cache manager for application-wide caching

**Provider:** `CacheMainProvider`

**Scope:** Global (available everywhere)

**Depends on:** `RedisClientCachedProvider`

**Usage:**
```typescript
export class UserService {
    constructor(
        @Inject(CacheMainProvider) readonly cache: Cache,
    ) {}
}
```

### SessionModule

**Purpose:** Provides cache for session management only

**Provider:** `SessionCacheProvider`

**Scope:** Module-scoped (only within SessionModule)

**Depends on:** `RedisClientCachedProvider` (shares same Redis connection)

**Usage:**
```typescript
export class SessionService {
    constructor(
        @Inject(SessionCacheProvider) private cache: Cache,
    ) {}
}
```

**Why Scoped?**
- Sessions are domain-specific
- Prevents accidental usage outside session context
- Still uses shared Redis connection (resource efficient)

## Configuration

### Redis Configuration

**File:** `src/configs/redis.config.ts`

```typescript
{
    cache: {
        url: process.env.CACHE_REDIS_URL ?? 'redis://localhost:6379',
        namespace: 'cache',
        ttlInMs: 5 * 60 * 1000  // Default TTL: 5 minutes
    }
}
```

**Default TTL:** Cache entries expire after **5 minutes** (300,000 milliseconds) by default. This can be overridden per cache operation.

### Module Import Order

**File:** `src/common/common.module.ts`

```typescript
@Module({
    imports: [
        ConfigModule.forRoot(),
        RedisCacheModule.forRoot(),    // 1. First
        CacheMainModule.forRoot(),      // 2. Second
        SessionModule,                  // 3. Then feature modules
    ]
})
export class CommonModule {}
```

**Why this order?** `CacheMainModule` depends on `RedisClientCachedProvider` from `RedisCacheModule`.

## Usage

### Injecting Cache Providers

**Global cache:**
```typescript
import { Inject } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';

@Injectable()
export class UserService {
    constructor(
        @Inject(CacheMainProvider) readonly cache: Cache,
    ) {}
}
```

**Session cache:**
```typescript
import { Inject } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';
import { SessionCacheProvider } from '@modules/session/constants/session.constant';

@Injectable()
export class SessionService {
    constructor(
        @Inject(SessionCacheProvider) private cache: Cache,
    ) {}
}
```

### Cache Operations

For cache operations (set, get, delete, etc.), see:
- [NestJS Caching][ref-nestjs-caching]
- [cache-manager][ref-cache-manager]

## Use Cases

- **Response Cache:** See [Response Documentation][ref-doc-response]
- **API Key Authentication:** See [Authentication Documentation][ref-doc-authentication] (section: `API Key Authentication`)
- **Feature Flag:** See [Feature Flag Documentation][ref-doc-feature-flag]
- **Session Management:** See [Authentication Documentation][ref-doc-authentication] (section: `Session Management`)

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
[ref-nestjs-caching]: https://docs.nestjs.com/techniques/caching
[ref-cache-manager]: https://www.npmjs.com/package/cache-manager
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
