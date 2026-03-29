# ACK NestJS Boilerplate — Claude Code Instructions

## Project Overview

ACK NestJS Boilerplate (v8.2.0+) is an enterprise-grade authentication and authorization service built with:
- **NestJS v11** + **TypeScript** (strict)
- **Prisma ORM** → MongoDB (replica set required for transactions)
- **Redis** → cache + session store (`db:0`) and BullMQ queues (`db:1`)
- **PNPM** as the only allowed package manager
- **ES256** (access token) / **ES512** (refresh token) JWT algorithms

## Architecture

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
}

// ✅ Service — always has interface, injects repo as class
export class UserService implements IUserService {
    constructor(private readonly userRepository: UserRepository) {}
}
```

### Module Structure

Every feature module follows:
```
module/
├── controllers/    dtos/        entities/     enums/
├── exceptions/     guards/      interfaces/   repositories/
├── services/       utils/       decorators/   docs/
└── processors/     templates/   validations/
```

### Path Aliases (always use, never relative paths)
```
@app/*      → src/app/*
@common/*   → src/common/*
@config     → src/configs/index.ts
@configs/*  → src/configs/*
@modules/*  → src/modules/*
@routes/*   → src/router/routes/*
@generated/* → generated/*
@prisma/client → generated/prisma-client
```

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Class | PascalCase | `UserService` |
| Interface | `I` + PascalCase | `IUserService` |
| Enum | `Enum` + PascalCase | `EnumUserStatus` |
| Enum keys/values | camelCase | `active`, `inactive` |
| Files | kebab-case | `user.service.ts` |
| Methods/Variables | camelCase | `findById`, `userId` |
| DTO suffix | `RequestDto` / `ResponseDto` | `CreateUserRequestDto` |

## Decorator Order (EXACT — never change)

```typescript
@ExampleDoc()                          // 1. Swagger doc
@TermPolicyAcceptanceProtected(...)    // 2. Term policy
@PolicyAbilityProtected({...})         // 3. CASL policy
@RoleProtected(...)                    // 4. Role check
@UserProtected()                       // 5. User status check
@AuthJwtAccessProtected()              // 6. JWT validation
@FeatureFlagProtected(...)             // 7. Feature flag
@ApiKeyProtected()                     // 8. API key
@ActivityLog(...)                      // 9. Activity log
@Response('key')                       // 10. Response / @ResponsePaging
@HttpCode(HttpStatus.OK)               // 11. HTTP status (only when needed)
@Get('/endpoint')                      // 12. HTTP method (always last)
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

## Cache (Redis)

- `CacheMainProvider` → general app cache (`db:0`)
- `SessionCacheProvider` → session management only (`db:0`)
- BullMQ → `db:1` (never mix with cache)
- Default TTL: 5 minutes; feature flags: 1 hour
- Single Redis connection shared via `RedisCacheModule` (DRY pattern)

## Response Pattern

```typescript
// Standard
@Response('user.get')
async get(): Promise<IResponseReturn<UserDto>> {
    return { data: await this.userService.findById(id) };
}

// Paginated
@ResponsePaging('user.list')
async list(): Promise<IResponsePagingReturn<UserDto[]>> {
    return { type: 'offset', data, totalPage, page, perPage, count, ... };
}

// With activity log metadata
return {
    data: updated,
    metadataActivityLog: { userId, oldStatus, newStatus }
};
```

## Error Handling

```typescript
throw new NotFoundException({
    statusCode: EnumUserStatusCodeError.notFound,
    message: 'user.error.notFound',          // i18n key
    messageProperties: { id: userId },       // optional interpolation
    data: { userId },                        // optional debug context
});
```

## i18n Messages

- Files in `src/languages/en/` — **nested JSON**, filename = prefix
- `user.error.notFound` → `src/languages/en/user.json` → `error.notFound`
- Never assume flat structure

```json
// user.json
{
  "error": {
    "notFound": "User not found",
    "statusInvalid": "User status {status} is invalid"
  }
}
```

## Queue (BullMQ)

- Extend `QueueProcessorBase`, implement `process(job)` with switch
- Use `QueueException(msg, isFatal)` — `isFatal: true` reports to Sentry
- Default: 3 attempts, exponential backoff (5s)
- Available queues: `notification`, `notificationEmail`, `notificationPush`

## Logging

```typescript
private readonly logger = new Logger(UserService.name);

// ✅ object first, message second
this.logger.error(error, 'Failed to create user');
this.logger.log('User created');
```

Sensitive data (password, token, apiKey, etc.) auto-redacted by Pino.

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

## Key Scripts

```bash
pnpm start:dev         # Dev server with hot reload
pnpm build             # Production build
pnpm lint              # ESLint
pnpm lint:fix          # Auto-fix lint
pnpm format            # Prettier
pnpm test              # Run tests
pnpm generate:keys     # Generate ES256/ES512 JWT key pairs
pnpm clean             # Clean node_modules + dist
docker-compose up -d   # Start MongoDB + Redis + JWKS server
```

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

## Docs Reference

Full documentation in `/docs`:
`authentication.md` · `authorization.md` · `database.md` · `device.md`
`two-factor.md` · `activity-log.md` · `cache.md` · `queue.md`
`notification.md` · `response.md` · `request-validation.md` · `handling-error.md`
`message.md` · `pagination.md` · `file-upload.md` · `feature-flag.md`
`term-policy.md` · `security-and-middleware.md` · `third-party-integration.md`
`analytics.md` (planned) · `configuration.md` · `environment.md`