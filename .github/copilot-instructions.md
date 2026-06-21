# GitHub Copilot Instructions for ACK NestJS Boilerplate

This document provides instructions for GitHub Copilot to generate code that follows the patterns, conventions, and architecture of this project.

> **Copilot Behavior Note**
> - Always read relevant source files before suggesting changes — never assume code structure.
> - Every suggestion or implementation **must consider best practices** (security, maintainability, scalability, readability).
> - If an approach is chosen for **performance** reasons or to **match an existing implementation**, **it must be explicitly noted** — mark it with `// @note <text>` (e.g. `// @note chosen for performance`, `// @note aligned with existing pattern`). If the symbol already has a JSDoc block, put the note inside that block instead of a separate `// @note`.
> - **Minimal comments.** Code self-documents — comment only the non-obvious (tricky invariant, security reason, deliberate deviation). Do not narrate obvious code.
> - **Do not write or scaffold tests** unless the user explicitly asks for them.
> - **Never edit the Prisma schema** or run schema/DB-mutating commands (`db:migrate`, `db:push`, `migration:*`, `db:generate`). If a schema change is needed, stop and tell the user.
> - **Never commit, stage, or unstage** on your own — leave the git tree exactly as the user arranged it.
> - If an example is needed to clarify a suggestion, **provide the code example immediately** — do not defer or ask for confirmation first.

## Project Overview

ACK NestJS Boilerplate is an enterprise-grade authentication and authorization service built with:
- **NestJS v11** + **TypeScript** with strict mode (`strictNullChecks: true`, `noImplicitAny: true`) and path aliases
- **Prisma ORM** → MongoDB (replica set required for transactions). Never edit the schema or run `db:generate`/`db:migrate`/`db:push` yourself; if a schema change is needed, stop and tell the user
- **Redis** → cache + session store (`db:0`) and BullMQ queues (`db:1`)
- **PNPM** as the only allowed package manager (npm/yarn blocked; enforced by preinstall script)
- **Node.js** >= 24.11.0
- **ES256** (access token) / **ES512** (refresh token) JWT algorithms
- **Repository Design Pattern** for data access layer
- **Modular Architecture** with clear separation of concerns
- **SOLID Principles** throughout the codebase
- **class-validator** and **class-transformer** for DTO validation and transformation
- **Swagger** for API documentation (disabled when `APP_ENV=production`)
- **i18n** for internationalization with nested JSON structure
- Sessions use dual storage (Redis + Database) for performance and management

## Architecture

### Module Structure

No module contains every folder. Each module includes only the folders its feature needs, drawn from these tiers:
```
module/
# Core (present in almost every module)
├── constants/          # Static values and configuration
├── controllers/        # API endpoint handlers
├── dtos/               # Data Transfer Objects with validation
├── enums/              # Type-safe enumerations
├── interfaces/         # TypeScript contracts
├── repositories/       # Data access layer (Prisma)
├── services/           # Business logic
├── utils/              # Helper utilities
# Common (present when the feature needs them)
├── decorators/         # Custom metadata decorators
├── docs/               # Swagger/OpenAPI documentation decorators
├── guards/             # Authorization and access control
# Specialized (a few modules only)
├── factories/          # Object creation patterns (policy)
├── indicators/         # Health-check indicators (health)
├── interceptors/       # Request/response transformation (activity-log)
├── processors/         # Background job handlers / BullMQ (notification)
├── templates/          # Email/document templates (notification, term-policy)
└── validations/        # Custom validators (auth, feature-flag)
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
- `@queues/*` → `src/queues/*`
- `@test/*` → `test/*`
- `@generated/*` → `generated/*`
- `@package` → `package.json`
- `@prisma/client` → `generated/prisma-client`

```typescript
import { DatabaseModule } from '@common/database/database.module';
import { IConfigAuth } from '@configs/auth.config';
import { UserModule } from '@modules/user/user.module';
```

## Naming Conventions

### Files

Pattern: `<module>.<noun-or-action>[.<sub>].<role>.ts`

- Every file starts with the `<module>.` prefix. No exception.
- Dot `.` separates segments; dash `-` ONLY inside a compound-noun segment (`user.mobile-number.dto.ts`, `notification.email.processor.ts`).
- Folders: lowercase kebab-case.
- Role suffix matches the artifact: `.service` `.repository` `.controller` `.guard` `.decorator` `.interceptor` `.dto` `.enum` `.constant` `.interface` `.doc` `.util` `.module` `.processor` `.filter`.
- DTO files always end `.dto.ts` (request/response under `dtos/request/` and `dtos/response/`): `user.create.request.dto.ts`, `user.profile.response.dto.ts`.

### Identifiers

| Type | Convention | Example (this project) |
|---|---|---|
| Class | PascalCase, module-prefixed | `UserService` |
| Interface | `I` + PascalCase | `IUser`, `IUserService` |
| Enum | `Enum` + PascalCase | `EnumQueue`, `EnumRoleStatusCodeError` |
| Enum keys/values | camelCase | `notFound`, `notificationEmail` |
| Constants | PascalCase (objects AND primitives) | `AuthJwtAccessGuardKey` |
| Methods/Variables/Fields | camelCase | `findById`, `userId` |
| Payload interface | `I` + `<Module>` + `<Action>` + `Payload` | `INotificationSendPushPayload` |
| Request DTO | `<Module>...RequestDto` suffix | `UserCreateRequestDto` |
| Response DTO | `<Module>...ResponseDto` suffix | `UserProfileResponseDto` |

### Rules

- **All types start with `I`.** Interfaces, payload shapes, service contracts: `IUser`, `IUserService`, `INotificationVerificationEmailPayload`. No bare type name.
- **Enums** — `Enum` prefix + PascalCase name; keys AND values camelCase (NOT UPPER_CASE). One enum concern per file. Error-code enums use numeric values.
- **Constants** — PascalCase for everything: typed objects/arrays and single primitives alike. No UPPER_SNAKE_CASE.
- **DI tokens** — rare; prefer direct class injection (repository as class). When a token IS needed, name it PascalCase and wrap the value in `Symbol()`.
- **DTOs** — every DTO carries the `Dto` suffix on BOTH class name and file name. There is no usecase layer.

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

### Import Order

Import order is enforced using ESLint's `sort-imports` rule:

```
const importOrderRules = {
    'sort-imports': [
        'error',
        {
            ignoreCase: false,
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
            memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
            allowSeparatedGroups: true,
        },
    ],
};
```

This rule sorts import members within each import statement, but does **not** enforce the order of entire import blocks. You are still required to use **absolute path aliases** for all project imports (never use relative paths like `./` or `../`).

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
DELETE /user/device/remove/:deviceOwnershipId
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
- Request DTOs **must** use the `RequestDto` suffix, module-prefixed (e.g., `UserCreateRequestDto`, `UserLoginRequestDto`).
- Response DTOs **must** use the `ResponseDto` suffix, module-prefixed (e.g., `UserProfileResponseDto`, `AuthTokenResponseDto`).

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

Use standardized response decorators. The return object supports one optional field:

- **`metadata?: IResponseMetadata`** — override response behavior: `statusCode`, `httpStatus`, `messagePath`, `messageProperties`

Activity-log metadata is NOT returned in the response shape. Set it in the service via `RequestStoreService.merge(ActivityLogMetadataStoreKey, ...)` (see Activity Log + Request Store below).

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

### Request Store (CLS)

Ambient per-request state lives in a single global `RequestStoreService` (`@common/request`, backed by `nestjs-cls`), NOT on `request.__*` properties.

- Generic API: `set<T>(key, value)`, `get<T>(key): T | null`, `merge<T>(key, value)`
- Identity is written by guards and read by param decorators / downstream guards:
    - `UserStoreKey` — set by `@UserProtected` guard, read via `@UserCurrent()`
    - `RoleAbilityStoreKey` — set by `@RoleProtected` guard, read by the policy guard
    - `ApiKeyStoreKey` — set by the api-key guard, read via `@ApiKeyPayload()`
- Activity-log metadata: `RequestStoreService.merge(ActivityLogMetadataStoreKey, { ... })` from the service layer
- Do NOT add `__user`/`__apiKey`/`__abilities` to `IRequestApp` — that per-request transport was removed in favor of the store

```typescript
async create(dto: UserCreateRequestDto): Promise<IUser> {
    const user = await this.userRepository.create(dto);
    this.requestStoreService.merge(ActivityLogMetadataStoreKey, { userId: user.id });
    return user;
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

## Queue System (BullMQ)

- Extend `QueueProcessorBase`, implement `process(job)` with switch
- Use `QueueException(msg, isFatal)` — `isFatal: true` reports to Sentry
- Defaults: 3 attempts, exponential backoff (per-queue: 10s/5s/3s), `removeOnComplete: 50`, `removeOnFail: 100`
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

- `@ActivityLog(EnumActivityLogAction.xxx)` on authenticated endpoints
- Requires `@AuthJwtAccessProtected()` to be present
- Logs both successful and failed requests; on failure the error is serialized into metadata and appended to the description
- The decorator takes ONLY the action (`@ActivityLog(action)`); metadata is dynamic, set in the service via `RequestStoreService.merge(ActivityLogMetadataStoreKey, ...)`, never passed at decoration time or returned in the response shape
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

- Bcrypt salt length: **12** (`auth.password.saltLength`)
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

## Testing

**Do not write or scaffold tests unless the user explicitly asks.** When tests are explicitly requested, follow these file naming conventions:
- Unit tests: `*.spec.ts`
- Integration tests: `*.integration-spec.ts`
- E2E tests: `*.e2e-spec.ts`

## TypeScript Strict Null Convention

`undefined` is only allowed at the **input boundary** — where data enters the system from outside. Every other layer must use `null` for absent values — never `undefined`.

| Layer | Convention | Reason |
|---|---|---|
| Request DTO (body / form) | `field?: Type` | User/client may omit the field |
| Query DTO (`@Query()`) | `field?: Type` | URL param may not be present |
| Response DTO — wrapper/structure fields | `field?: Type` | Structural fields that may not exist in every response variant (e.g. `data?`, `errors?` on `ResponseDto<T>`) |
| Response DTO — domain data fields | `field: Type \| null` | Fields representing data from database/domain — absence must be explicit to consumer |
| Domain Interface — data | `field: Type \| null` | Processed data, absence must be explicit |
| Domain Interface — request lifecycle | `field?: Type` | Set progressively by middleware/guard |
| Domain Interface — external spec | `field?: Type` | Follow spec we don't control (JWT claims, Prisma types) |
| Exception / Options Interface | `field?: Type` | Fields are genuinely optional; callers must not be forced to pass `null` (e.g. `IAppException`, service options bags) |
| Config Interface (`src/configs/`) | `field: Type \| null` | Caller must be explicit, not skip |
| Service / Util — method param (data) | `param: Type \| null` | No `undefined` enters this layer |
| Service / Util — method param (filter) | `param?: Type` | Additive filter, absent = not applied |
| Repository — method param (data) | `param: Type \| null` | No `undefined` enters this layer |
| Repository — method param (filter) | `param: Type \| null` | Normalize `null → {}` inside repository before Prisma |
| Database (Prisma return) | `Type \| null` | Follow Prisma convention |
| `field?: Type \| null` | **Never** — ambiguous, pick one |

```typescript
// ✅ Request DTO — undefined allowed at input boundary
class UpdateUserRequestDto {
    @IsOptional()
    @IsString()
    bio?: string
}

// ✅ Query DTO — undefined allowed at input boundary
class UserListRequestDto {
    @IsOptional()
    @IsString()
    status?: string
}

// ✅ Response DTO — wrapper/structural fields use ?:
class ResponseDto<T> {
    statusCode: number
    message: string
    metadata: ResponseMetadataDto
    data?: T           // ?: correct — not all responses return data
}

// ✅ Response DTO — domain data fields use | null
class UserProfileResponseDto {
    photo: AwsS3ResponseDto | null // from database, absence must be explicit
    lastLoginAt: Date | null      // from database
    bio: string | null            // from database
}

// ✅ Domain Interface — data
interface IUser {
    twoFactor: TwoFactor | null
}

// ✅ Domain Interface — request lifecycle (progressive, set by middleware/guard)
interface IRequestApp<T = IAuthJwtAccessTokenPayload> {
    user?: T                              // set after the JWT guard runs
    pagination?: Partial<IPaginationQuery> // set by pagination pipes
}

// ✅ Exception / Options Interface — optional fields, no forced null
interface IAppException<T> {
    statusCode: number
    message: string
    messageProperties?: IMessageProperties   // ?: correct — caller may omit
    data?: T                                 // ?: correct
    errors?: IMessageValidationError[]       // ?: correct
    _error?: unknown                         // ?: correct
}

// ✅ Config Interface (src/configs/ only) — explicit null
interface IConfigAuth {
    accessToken: {
        secretKey: string
        expirationTime: string | null
    }
}

// ✅ Service — data param uses null, filter param uses ?
interface IUserService {
    findById(id: string): Promise<IUser | null>
    update(id: string, bio: string | null): Promise<void>
    getList(
        pagination: IPaginationQueryOffsetParams,
        status?: Record<string, IPaginationIn>   // additive filter
    ): Promise<IResponsePagingReturn<UserListResponseDto>>
}

// ✅ Repository — filter param uses null, normalization happens inside
class UserRepository {
    async findExport(
        status: Record<string, IPaginationIn> | null,
        role: Record<string, IPaginationEqual> | null
    ): Promise<IUser[]> {
        return this.databaseService.user.findMany({
            where: {
                ...(status ?? {}),   // normalize null → {} here, not at caller
                ...(role ?? {}),
                deletedAt: null,
            },
        })
    }
}

// ✅ Controller — normalize undefined → null before passing to service
async updateProfile(userId: string, dto: UpdateUserRequestDto) {
    await this.userService.update(userId, dto.bio ?? null)
}
```

**Rule:** `undefined` stops at the input boundary (Request DTO, Query DTO). Once data enters service or deeper, all optional values must be `T | null`. The only exceptions are: request lifecycle fields, external spec fields (JWT claims, Prisma generated types), exception/options interfaces, response DTO structural/wrapper fields, and service/util additive filter params.

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
- Use `undefined` in domain data interface, response DTO domain data fields, `src/configs/` config interface, or service/repository data params → use `null` instead
- Use `variable?: string | null` anywhere → ambiguous, use `?: string` for input boundary or `string | null` for internal layers
- Normalize filter params in caller instead of repository → repository owns the `null → {}` normalization before Prisma
- Edit the Prisma schema or run schema/DB commands (`db:migrate`, `db:push`, `migration:*`, `db:generate`) → stop and tell the user
- Commit, stage, or unstage without an explicit user request → leave the git tree alone
- Write or scaffold unit tests unprompted → only when the user explicitly asks
- Over-comment / narrate obvious code → minimal comments, mark deliberate notes with `// @note`

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
9. **Request Store Pattern** — ambient per-request state (identity, activity-log metadata) in a single CLS-backed `RequestStoreService`, not on `request.__*`
10. **Feature Flag Pattern** — Dynamic control, deterministic rollout, metadata for granular control

### Global Modules Reference
- **Common**: `DatabaseModule`, `PaginationModule`, `CacheMainModule`, `RedisCacheModule`, `MessageModule`, `HelperModule`, `FileModule`, `FirebaseModule`
- **Feature**: `AuthModule`, `SessionModule`, `RoleModule`, `ApiKeyModule`, `PolicyModule`, `ActivityLogModule`, `NotificationModule`, `FeatureFlagModule`, `TermPolicyModule`
- **Queue**: `QueueRegisterModule`

---

**Remember**: This project emphasizes clean code, separation of concerns, and enterprise-grade patterns. Always follow the established architecture and conventions when generating new code.
