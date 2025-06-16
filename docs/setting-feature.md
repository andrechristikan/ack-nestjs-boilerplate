# Overview

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

**Cache Configuration**: The cache uses a configurable key prefix from application configuration (`setting.keyPrefix`).
