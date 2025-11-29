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
[ref-doc-internationalization]: docs/internationalization.md
[ref-doc-logger]: docs/logger.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response-structure]: docs/response-structure.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-service-side-pagination]: docs/service-side-pagination.md
[ref-doc-third-party-integration]: docs/third-party-integration.md


<!-- # Overview

The Setting Feature module in ACK NestJS Boilerplate provides a comprehensive system for managing dynamic configuration settings that can be stored in the database and cached for optimal performance. Unlike the config module that reads from application configuration, the Setting Feature module allows for runtime modification of feature flags and configuration values.

This documentation explains the features and usage of:
- **Setting Feature Module**: Located at `src/modules/setting`

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Module](#module)
    - [Services](#services)
    - [Entities](#entities)
    - [DTOs](#dtos)
    - [Decorators](#decorators)
    - [Guards](#guards)
  - [Using Setting Feature](#using-setting-feature)
    - [Decorator Usage](#decorator-usage)
      - [Error Handling](#error-handling)
    - [Direct Access](#direct-access)
  - [Cache Management](#cache-management)

## Module

The Setting Feature module provides dynamic configuration management with built-in caching and administrative interfaces. It consists of services for business logic, controllers for HTTP endpoints, entities for data modeling, and DTOs for data transfer.

### Services

- **SettingFeatureService**: Main service that handles feature configuration management with integrated caching.
  - `getAndCache(key)`: Retrieves feature value with automatic Redis caching
  - `update(repository, dto, options?)`: Updates feature settings and manages cache invalidation
  - `findOneByKey(key, options?)`: Finds a specific feature by its unique key
  - `findAll(find?, options?)`: Lists all features with optional filtering and pagination
  - `createMany(entries)`: Bulk creates multiple feature configurations
  - `delete(key)`: Removes a feature configuration by key
  - `deleteMany(find?, options?)`: Bulk deletes features based on criteria
  - `getTotal(find?, options?)`: Gets total count of features for pagination
  - `flush()`: Clears all cached feature values from Redis
  - `deleteCache(key)`: Removes specific feature from cache
  - `mapList(entities)`: Transforms entities to list response DTOs
  - `mapGet(entity)`: Transforms entity to detailed response DTO

### Entities

- **SettingFeatureEntity**: Database entity representing feature configurations
  - `key`: Unique string identifier for the feature (indexed)
  - `description`: Human-readable description of the feature
  - `value`: JSON configuration value with flexible structure

**SettingJson Interface Structure:**
```typescript
export interface SettingJson {
    enabled: boolean;                    // Feature enable/disable flag
    [key: string]: SettingValue;        // Additional configuration properties
}

export type SettingValue =
    | boolean
    | string  
    | number
    | SettingValue[]
    | { [key: string]: SettingValue };
```

### DTOs

- **SettingFeatureUpdateRequestDto**: Request DTO for updating feature configurations
  - `description`: Updated description text
  - `value`: New configuration value (SettingJson format)

- **SettingFeatureGetResponseDto**: Detailed response DTO for single feature retrieval
  - Extends `DatabaseUUIDDto` for UUID and timestamp fields
  - `key`: Feature identifier
  - `description`: Feature description  
  - `value`: Feature configuration value

- **SettingFeatureListResponseDto**: List response DTO for feature listings
  - Same structure as `SettingFeatureGetResponseDto`
  - Used in paginated list responses

### Decorators

- **@SettingFeatureFlag(key: string)**: 
  - Protects endpoints based on feature flag status
  - Automatically checks if the specified feature key is enabled
  - Combines `@UseGuards(SettingFeatureGuard)` and metadata setting

### Guards

- **SettingFeatureGuard**: 
  - Implements the logic for `@SettingFeatureFlag` decorator
  - Uses `SettingFeatureService.getAndCache()` for feature status checking
  - Leverages caching for optimal performance
  - Throws `ForbiddenException` when feature is disabled
  - Uses Reflector to get feature key from metadata

## Using Setting Feature

### Decorator Usage

The Setting Feature module provides decorators for endpoint feature control:

Apply feature flags to specific endpoints using the `@SettingFeatureFlag` decorator:

```typescript
import { SettingFeatureFlag } from '@modules/setting/decorators/setting.decorator';

// Method-level protection (specific endpoints)
@Controller('auth')
export class AuthController {
  @SettingFeatureFlag('auth.social.google')
  @Post('google/login')
  async googleLogin(@Body() body: GoogleLoginDto) {
    // This endpoint is only accessible when auth.social.google is enabled
    return this.socialAuthService.initiateGoogleLogin(body);
  }

  @SettingFeatureFlag('auth.social.apple')
  @Post('apple/callback')
  async appleCallback(@Body() body: AppleCallbackDto) {
    // This endpoint requires auth.social.apple to be enabled
    return this.authService.handleAppleCallback(body);
  }

  @Post('login')
  async regularLogin(@Body() body: LoginDto) {
    // This endpoint is not protected by any feature flag
    return this.authService.login(body);
  }
}
```

#### Error Handling

When a feature is disabled, the guard throws a `ForbiddenException` with specific error details:

```json
// If feature is disabled, returns:
{
  "statusCode": "ENUM_SETTING_FEATURE_STATUS_CODE_ERROR.INACTIVE",
  "message": "settingFeature.error.inactive"
}
```

### Direct Access

For direct access to setting features in your services:

1. Import the required service and interfaces:
```typescript
import { SettingFeatureService } from '@modules/setting/services/setting-feature.service';
import { SettingJson } from '@modules/setting/interfaces/setting.interface';
```

2. Inject the SettingFeatureService in your service or controller:
```typescript
constructor(
  private readonly settingFeatureService: SettingFeatureService
) {}
```

3. Retrieve feature configurations with caching:
```typescript
async checkFeatureEnabled(featureKey: string): Promise<boolean> {
  const feature = await this.settingFeatureService.getAndCache(featureKey);
  return feature.enabled;
}

async getFeatureConfig(featureKey: string): Promise<SettingJson> {
  return this.settingFeatureService.getAndCache(featureKey);
}
```

## Cache Management

The setting feature module uses Redis for caching with automatic cache management:

**Cache Key Format**: `{keyPrefix}:{feature.key}`
- Example: `"setting:auth.social.google"`

**Automatic Caching**: Features are automatically cached on first access through `getAndCache()` method.

**Manual Cache Operations**:
```typescript
// Clear specific feature cache
await this.settingFeatureService.deleteCache('auth.social.google');

// Clear all feature cache (useful during maintenance)
await this.settingFeatureService.flush();

// Cache is automatically updated when features are modified
const updated = await this.settingFeatureService.update(feature, updateDto);
// Cache for this feature is automatically invalidated
```

**Cache Configuration**: The cache uses a configurable key prefix from application configuration (`setting.keyPrefix`). -->
