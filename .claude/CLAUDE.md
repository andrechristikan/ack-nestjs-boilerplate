# ACK NestJS Boilerplate — Claude Code Instructions

> **Claude Code Behavior Note**
> - Always read relevant source files before suggesting changes — never assume code structure.
> - Every suggestion or implementation **must consider best practices** (security, maintainability, scalability, readability).
> - If an approach is chosen for **performance** reasons or to **match an existing implementation**, **it must be explicitly noted**.
> - Provide code examples immediately when clarifying a suggestion — do not ask for confirmation first.

## Project Overview

ACK NestJS Boilerplate is an enterprise-grade authentication and authorization service built with:
- **NestJS v11** + **TypeScript** with strict mode (`strictNullChecks: true`, `noImplicitAny: true`) and path aliases
- **Prisma ORM** → MongoDB (replica set required for transactions)
- **Redis** → cache + session store (`db:0`) and BullMQ queues (`db:1`)
- **PNPM** as the only allowed package manager (npm/yarn blocked)
- **Node.js** >= 24.11.0
- **ES256** (access token) / **ES512** (refresh token) JWT algorithms
- **Repository Design Pattern** for data access layer
- **Modular Architecture** with clear separation of concerns
- **SOLID Principles** throughout the codebase
- **class-validator** and **class-transformer** for DTO validation and transformation
- **Swagger** for API documentation
- **i18n** for internationalization with nested JSON structure

## Architecture

### Module Structure

Every feature module follows:
```
module/
├── bases/              # Abstract base classes for shared functionality
├── constants/          # Static values and configuration
├── controllers/        # API endpoint handlers
├── decorators/         # Custom metadata decorators
├── docs/              # Swagger/OpenAPI documentation decorators
├── dtos/              # Data Transfer Objects with validation
├── entities/          # Database entity types
├── enums/             # Type-safe enumerations
├── exceptions/        # Custom error classes
├── factories/         # Object creation patterns
├── filters/           # Exception/validation filters
├── guards/            # Authorization and access control
├── interceptors/      # Request/response transformation
├── interfaces/        # TypeScript contracts
├── middlewares/       # Request preprocessing
├── pipes/             # Data transformation and validation
├── processors/        # Background job handlers (BullMQ)
├── repositories/      # Data access layer (Prisma)
├── services/          # Business logic
├── templates/         # Email/document templates
├── utils/             # Helper utilities
└── validations/       # Custom validators
```

### Repository Design Pattern

- `Repository` → data access only, injects `DatabaseService` directly (no `@Inject`)
- `Service` → business logic only, injects repository as class (no interface for repo)
- `Service` always implements an **interface** (`IUserService`)
- Never inject `DatabaseService` directly into services

```typescript
// ✅ Repository — no interface needed
@Injectable()
export class UserRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findById(id: string): Promise<User | null> {
        return this.databaseService.user.findFirst({
            where: { id }
        });
    }
}

// ✅ Service Interface — services always have an interface
export interface IUserService {
    findById(id: string): Promise<User | null>;
}

// ✅ Service Implementation — injects repo as class
export class UserService implements IUserService {
    constructor(private readonly userRepository: UserRepository) {}
}
```

### Path Aliases (always use, never relative paths)

- `@app/*` → `src/app/*`
- `@common/*` → `src/common/*`
- `@config` → `src/configs/index.ts`
- `@configs/*` → `src/configs/*`
- `@modules/*` → `src/modules/*`
- `@routes/*` → `src/router/routes/*`
- `@router` → `src/router/router.module.ts`
- `@migration/*` → `src/migration/*`
- `@test/*` → `test/*`
- `@generated/*` → `generated/*`
- `@prisma/client` → `generated/prisma-client`

```typescript
import { DatabaseModule } from '@common/database/database.module';
import { IConfigAuth } from '@configs/auth.config';
import { UserModule } from '@modules/user/user.module';
```

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Class | PascalCase | `UserService` |
| Interface | `I` + PascalCase | `IUserService` |
| Enum | `Enum` + PascalCase | `EnumUserStatus` |
| Enum keys/values | camelCase | `active`, `inactive` |
| Constants | PascalCase | `MaxAttempt`, `DefaultPageSize` |
| Files | kebab-case | `user.service.ts` |
| Methods/Variables | camelCase | `findById`, `userId` |
| DTO suffix | `RequestDto` / `ResponseDto` | `CreateUserRequestDto` |

### Enum Usage

```typescript
export enum EnumUserStatus {
    active = 'active',
    inactive = 'inactive',
    deleted = 'deleted'
}

export enum EnumUserStatusCodeError {
    notFound = 5000,
    alreadyExists = 5001,
    inactive = 5002
}
```

## Decorator Order (EXACT — never change)

```typescript
@ExampleDoc()                          // 1. Swagger doc
@TermPolicyAcceptanceProtected(...)    // 2. Term policy
@PolicyAbilityProtected({...})         // 3. CASL policy
@RoleProtected(...)                    // 4. Role check
@ActivityLog(...)                      // 5. Activity log
@UserProtected()                       // 6. User status check
@AuthJwtAccessProtected()              // 7. JWT validation
@FeatureFlagProtected(...)             // 8. Feature flag
@ApiKeyProtected()                     // 9. API key
@HttpCode(HttpStatus.OK)               // 10. HTTP status (only when needed)
@Get('/endpoint')                      // 11. HTTP method (always last)
async method() {}
```

## Authentication & Session

- Dual storage: **Redis** (validation, jti matching) + **Database** (audit, listing)
- `jti` rotated on every token refresh — old tokens immediately invalid
- Redis key: `User:{userId}:Session:{sessionId}`
- TTL: fixed at login (30d default), NOT extended on refresh
- Always invalidate sessions on: password change, password reset, logout, device removal

### Session Lifecycle
1. Login → create session in Redis + DB, linked to `DeviceOwnership`
2. Every request → verify signature → check Redis → match `jti`
3. Refresh → verify → rotate `jti` in Redis + DB → issue new tokens
4. Revoke → delete from Redis → mark DB as revoked

## Device Module

- Device identified by `fingerprint` (use FingerprintJS on frontend)
- `DeviceOwnership` = relationship between `User` and `Device`
- **Max 1 active session per device-user pair** (new login replaces old session)
- Same `fingerprint` + different browsers = different `DeviceOwnership` (by design)
- Platforms: `ios`, `android`, `web`
- Notification: `fcm` (android), `apns` (ios), none (web)

### Remove Device Flow
```
DELETE /user/device/remove/:deviceId
→ DeviceOwnership: isRevoked = true (retained for audit)
→ Device: clear notificationToken + notificationProvider
→ Session: isRevoked = true in DB
→ Redis: DELETE session key → immediate 401
→ ActivityLog: userRemoveDevice
```

### Device List API Behavior
- User endpoint → return `isRevoked = false` only
- Admin endpoint → default `isRevoked = false`, support `?includeRevoked=true` for audit

## Authorization Layers

```
@AuthJwtAccessProtected()       JWT signature + jti + Redis session check
@UserProtected(isVerified?)     User status: active, not deleted, optionally email-verified
@RoleProtected(role)            RBAC role check
@PolicyAbilityProtected({})     CASL fine-grained permissions (subject + action)
@TermPolicyAcceptanceProtected  Require accepted term policies (default: termsOfService + privacy)
@FeatureFlagProtected(key)      Feature flag + rollout percentage
@ApiKeyProtected()              Machine-to-machine API key auth
```

## Request & Response

### DTOs (Data Transfer Objects)

**Naming Convention:**
- Request DTOs **must** use the `RequestDto` suffix (e.g., `CreateUserRequestDto`, `LoginRequestDto`).
- Response DTOs **must** use the `ResponseDto` suffix (e.g., `UserResponseDto`, `LoginResponseDto`).

Use `class-validator` decorators for validation:

```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateUserRequestDto {
    @IsEmail()
    @Expose()
    email: string;

    @IsString()
    @MinLength(8)
    @Expose()
    password: string;
}
```

### Response Decorators

Use standardized response decorators. The return object supports two optional fields:

- **`metadata?: IResponseMetadata`** — override response behavior: `statusCode`, `httpStatus`, `messagePath`, `messageProperties`
- **`metadataActivityLog?: IActivityLogMetadata`** — pass activity log context (captured automatically by `@ActivityLog` decorator)

```typescript
// Standard response
@Response('user.get')
@Get('/:id')
async getUser(@Param('id') id: string): Promise<IResponseReturn<UserDto>> {
    return { data: await this.userService.findById(id) };
}

// Override response message or statusCode via metadata
@Response('user.create')
@Post('/')
async createUser(@Body() body: CreateUserRequestDto): Promise<IResponseReturn<UserDto>> {
    return {
        data: await this.userService.create(body),
        metadata: {
            statusCode: EnumUserStatusCodeError.alreadyExists,
            messageProperties: { name: body.name },
        },
    };
}

// Paginated response
@ResponsePaging('user.list')
@Get('/')
async listUsers(@Query() query: UserListDto): Promise<IResponsePagingReturn<UserDto[]>> {
    return await this.userService.list(query);
}
```

### Request Context Decorators (IP, Geo, User Agent)

Use these parameter decorators from `@common/request/decorators/request.decorator.ts`:

- **`@RequestIPAddress()`** — real client IP via `nestjs-real-ip`
- **`@RequestGeoLocation()`** — `GeoLocation | null` via `geoip-lite`
- **`@RequestUserAgent()`** — parsed `UserAgent` object via `ua-parser-js`

```typescript
@Post('/login')
async login(
    @Body() body: UserLoginRequestDto,
    @RequestIPAddress() ipAddress: string,
    @RequestUserAgent() userAgent: UserAgent,
    @RequestGeoLocation() geoLocation: GeoLocation | null
): Promise<IResponseReturn<AuthTokenResponseDto>> {
    return {
        data: await this.userService.login(body, { ipAddress, userAgent, geoLocation })
    };
}
```

### Error Handling

```typescript
throw new NotFoundException({
    statusCode: EnumUserStatusCodeError.notFound,
    message: 'user.error.notFound',          // i18n key
    messageProperties: { id: userId },       // optional interpolation
    data: { userId },                        // optional debug context
});
```

Optional exception properties (all from `IAppException`):
- **`messageProperties?: IMessageProperties`** — `Record<string, string | number>` for i18n interpolation
- **`errors?: IMessageValidationError[]`** — validation error details
- **`metadata?: Record<string, string | number>`** — extra context for debugging

## Database & Transactions

- MongoDB must run as **replica set** (required for transactions)
- Use callback syntax for complex transactions:

```typescript
// ✅ Complex logic — callback
await this.databaseService.$transaction(async (tx) => {
    const user = await tx.user.create({ data });
    if (condition) await tx.profile.create({ data: profileData });
    return user;
});

// ✅ Simple sequential — array
await this.databaseService.$transaction([
    this.databaseService.user.create({ data }),
    this.databaseService.log.create({ data: logData }),
]);
```

### Scripts
```bash
pnpm db:migrate        # Sync schema to MongoDB
pnpm db:generate       # Regenerate Prisma client (after schema changes)
pnpm db:studio         # Open Prisma Studio
pnpm migration:seed    # Seed all data
pnpm migration {module} --type seed    # Seed specific module
```

## Queue System (BullMQ)

- Extend `QueueProcessorBase`, implement `process(job)` with switch
- Use `QueueException(msg, isFatal)` — `isFatal: true` reports to Sentry
- Default: 3 attempts, exponential backoff (5s)
- Available queues: `notification`, `notificationEmail`, `notificationPush`

```typescript
@QueueProcessor(EnumQueue.notificationPush)
export class NotificationPushProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationPushProcessor.name);

    constructor(
        private readonly notificationPushProcessorService: NotificationPushProcessorService
    ) {
        super();
    }

    async process(
        job: Job<unknown, IQueueResponse, EnumNotificationPushProcess>
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumNotificationPushProcess.newDeviceLogin:
                    return this.notificationPushProcessorService.processNewDeviceLogin(
                        job as Job<INotificationPushWorkerPayload, IQueueResponse>
                    );
                default:
                    return { success: false };
            }
        } catch (error: unknown) {
            this.logger.error(error);
            throw new QueueException('Process failed', error as Error, job.data);
        }
    }
}
```

## Cache (Redis)

- `CacheMainProvider` → general app cache (`db:0`)
- `SessionCacheProvider` → session management only (`db:0`)
- BullMQ → `db:1` (never mix with cache)
- Default TTL: 5 minutes; feature flags: 1 hour
- Single Redis connection shared via `RedisCacheModule` (DRY pattern)

## Logging

```typescript
private readonly logger = new Logger(UserService.name);

// ✅ object first, message second
this.logger.error(error, 'Failed to create user');
this.logger.log('User created');
```

Sensitive data (password, token, apiKey, etc.) auto-redacted by Pino.

## i18n Messages

- Files in `src/languages/en/` — **nested JSON**, filename = prefix
- `user.error.notFound` → `src/languages/en/user.json` → `error.notFound`
- Never assume flat structure

```json
{
  "get": "Get user successfully",
  "error": {
    "notFound": "User not found",
    "statusInvalid": "User status {status} is invalid"
  }
}
```

## Activity Log

- `@ActivityLog(EnumActivityLogAction.xxx)` — admin endpoints only
- Requires `@AuthJwtAccessProtected()` to be present
- Only logs **successful** requests
- Capture metadata via `metadataActivityLog` in service response
- Never log: passwords, tokens, entire objects

## Notification

- 4 channels: `email` (SES), `push` (FCM), `inApp`, `silent`
- 3 BullMQ queues: `notification`, `notificationEmail`, `notificationPush`
- Push tokens managed via Device module
- `inApp` + `silent` → marked delivered immediately at creation
- `email` + `push` → async queue processing

## Third-Party Services (No-Op Mode)

All external services operate in **no-op mode** when credentials are missing:
- AWS S3: check `isInitialized()` before S3 operations
- AWS SES: check `isInitialized()` before sending email
- Firebase: leave env vars empty to disable push
- Sentry: leave `SENTRY_DSN` empty to disable monitoring

## Feature Flags

```typescript
@FeatureFlagProtected('loginWithGoogle')           // simple check
@FeatureFlagProtected('changePassword.forgotAllowed') // metadata check (must be boolean)
```

Rollout uses deterministic MD5 hash of `userId` — same user always gets same result.

## Term Policy

- 4 types: `termsOfService`, `privacy`, `marketing`, `cookies`
- Publishing invalidates ALL user acceptances for that type
- Draft → editable, private S3; Published → immutable, public S3
- `@TermPolicyAcceptanceProtected()` defaults to requiring `termsOfService` + `privacy`

## Rate Limiting

- Global default: **100 requests / 60 seconds** per IP
- Auth endpoints (login, signup, forgot-password): **5 req / 60s**
- OTP/2FA verification: **5 req / 60s**
- Token refresh: **10 req / 60s**
- File upload: **10 req / 60s**
- Admin endpoints: **30 req / 60s**
- Public read (list, get): **60 req / 60s**
- Override per-endpoint with `@Throttle({ default: { ttl: 60000, limit: N } })`
- `ThrottlerGuard` must be registered as global guard via `APP_GUARD`
- Response 429 must follow standard error response format

## Password Security

- Bcrypt salt rounds: **10** minimum, **11** recommended for sensitive apps
- Password expiration: 182 days
- Password rotation period: 90 days
- Max login attempts: 5 (then lockout)
- Temporary password expiration: 3 days
- Password history tracked to prevent reuse
- Always invalidate ALL sessions on password change/reset

## Environment Configuration

Configuration files are in `src/configs/` and use environment variables. **Every config file must export a TypeScript interface** alongside the `registerAs` function:

```typescript
export interface IConfigAuth {
    password: {
        attempt: boolean;
        maxAttempt: number;
    };
    accessToken: {
        secretKey: string;
        expirationTime: string;
    };
}

export default registerAs(
    'auth',
    (): IConfigAuth => ({
        password: {
            attempt: true,
            maxAttempt: 5,
        },
        accessToken: {
            secretKey: process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY,
            expirationTime: '15m',
        }
    })
);
```

## Docker

- `dockerfile` (root) → **development only** (`start:dev`, includes devDependencies)
- CI/CD uses separate production Dockerfile with multi-stage build
- Production image: `node:lts-alpine`, `NODE_ENV=production`, `CMD ["node", "dist/main.js"]`, `USER node`
- Never copy `.env` into Docker image — inject via environment variables at runtime

## Key Scripts

```bash
# Development
pnpm start:dev         # Dev server with hot reload
pnpm build             # Production build
pnpm format            # Format code with Prettier
pnpm lint              # Run ESLint
pnpm lint:fix          # Fix ESLint errors

# Database
pnpm db:migrate        # Sync Prisma schema to DB
pnpm db:generate       # Generate Prisma client
pnpm db:studio         # Open Prisma Studio

# Migration & Seeding
pnpm migration:seed    # Seed all data
pnpm migration:remove  # Remove all seeded data
pnpm migration:fresh   # Reset DB and re-seed
pnpm migration {module} --type seed    # Seed specific module
pnpm migration {module} --type remove  # Remove specific module

# Testing & Quality
pnpm test              # Run tests
pnpm deadcode          # Check for unused code
pnpm spell             # Spell check
pnpm typecheck         # TypeScript type checking

# Docker
docker-compose up -d   # Start MongoDB + Redis + JWKS server
docker-compose down    # Stop containers

# Keys & Utilities
pnpm generate:keys     # Generate JWT keys (ES256/ES512)
pnpm clean             # Clean build and dependencies
pnpm package:upgrade   # Upgrade packages
pnpm package:check     # Check package updates
```

## TypeScript Strict Null Convention

`undefined` is only allowed at the **request boundary** (Request DTOs). Every other layer must use `null` for absent values — never `undefined`.

| Layer | Convention | Reason |
|---|---|---|
| Request DTO (optional field) | `variable?: string` | User may omit the field |
| Entity, Response DTO, Service, Repository | `variable: string \| null` | Explicit absence, aligns with Prisma nullable columns |
| Return type that may not exist | `T \| null` | Signals intentional "not found", not accidental unset |
| `variable?: string \| null` | **Never** — ambiguous, pick one |

```typescript
// ✅ Request DTO — undefined allowed at the boundary
class UpdateUserRequestDto {
    @IsOptional()
    @IsString()
    bio?: string
}

// ✅ Entity / internal — null only, no undefined
class UserEntity {
    bio: string | null
    phoneNumber: string | null
}

// ✅ Service / Repository — null only
interface IUserService {
    findById(id: string): Promise<UserEntity | null>
    update(id: string, bio: string | null): Promise<void>
}

// ✅ Normalize at the boundary before passing into service
async update(id: string, dto: UpdateUserRequestDto) {
    await this.userService.update(id, dto.bio ?? null)
}
```

**Rule:** `undefined` stops at the DTO layer. Once data enters the service or deeper, all optional values must be typed as `T | null`.

## Anti-Patterns (Never Do)

- Inject `DatabaseService` directly into services → use repository
- Use relative imports → use path aliases
- Multiple Redis connections → share via `RedisCacheModule`
- Wrong decorator order → follow exact order above
- Flat i18n keys → use nested JSON structure
- Log sensitive data → auto-redacted, but don't explicitly log it
- Skip session invalidation on password change/reset
- Use `UPPER_SNAKE_CASE` for enums → use `PascalCase` name, `camelCase` keys
- Use array transaction for conditional logic → use callback syntax
- Use `--passWithNoTests` in CI after tests are written → remove flag once first test exists
- Use `any` type → use proper typing (enforced by `noImplicitAny: true`)
- Ignore null checks → handle nulls properly (enforced by `strictNullChecks: true`)
- Use `@Inject` unnecessarily for repositories → direct class injection
- Use `undefined` in entity, service, or repository layer → use `null` instead
- Use `variable?: string | null` anywhere → ambiguous, use `?: string` for input or `string | null` for output

## Design Patterns & Principles

### Patterns to Follow

1. **DRY** — Single Redis connection, single config source, reusable base classes, global modules
2. **Repository Pattern** — Abstract DB ops through repositories, never inject `DatabaseService` in services
3. **Global Module Pattern** — `@Global()` for shared modules, avoid repeated imports
4. **Decorator-Based Protection** — Stack decorators in correct order, declarative cross-cutting concerns
5. **Singleton Pattern** — One Redis connection for cache AND session, centralized config
6. **Dual Storage Strategy** — Redis for performance, Database for persistence (e.g., sessions)
7. **Nested JSON for i18n** — File name as prefix, navigate nested objects
8. **Type-Safe Enums** — `Enum` prefix PascalCase, camelCase keys, dedicated files
9. **Metadata Pattern** — `metadataActivityLog` in service responses, auto-captured by decorators
10. **Feature Flag Pattern** — Dynamic control, deterministic rollout, metadata for granular control

### Global Modules Reference
- **Common**: `DatabaseModule`, `PaginationModule`, `CacheMainModule`, `RedisCacheModule`, `MessageModule`, `HelperModule`, `FileModule`, `FirebaseModule`
- **Feature**: `AuthModule`, `SessionModule`, `RoleModule`, `ApiKeyModule`, `PolicyModule`, `ActivityLogModule`, `NotificationModule`, `FeatureFlagModule`, `TermPolicyModule`
- **Queue**: `QueueRegisterModule`

## Important Notes

- **Production Mode**: Documentation is disabled when `APP_ENV=production`
- **MongoDB**: Must run as replica set for transactions
- **Prisma Client**: Regenerate after schema changes with `pnpm db:generate`
- **Sessions**: Dual storage (Redis + Database) for performance and management
- **JWT Algorithms**: ES256 for access tokens, ES512 for refresh tokens
- **Package Manager**: Use PNPM only (enforced by preinstall script)

## Docs Reference

Full documentation in `/docs`:
`authentication.md` · `authorization.md` · `database.md` · `device.md`
`two-factor.md` · `activity-log.md` · `cache.md` · `queue.md`
`notification.md` · `response.md` · `request-validation.md` · `handling-error.md`
`message.md` · `pagination.md` · `file-upload.md` · `feature-flag.md`
`term-policy.md` · `security-and-middleware.md` · `third-party-integration.md`
`analytics.md` (planned) · `configuration.md` · `environment.md`
