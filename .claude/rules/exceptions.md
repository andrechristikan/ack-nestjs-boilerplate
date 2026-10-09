---
paths:
    - '**/exceptions/**'
    - '**/*.status-code.enum.ts'
    - '**/decorators/**'
    - '**/guards/**'
    - 'src/app/**'
    - 'src/modules/*/domains/**'
    - 'src/common/firebase/**'
    - 'src/common/database/utils/**'
    - 'src/common/redis/**'
---

# Exceptions and status codes

## The hierarchy

Every typed error but `QueueException` extends `AppBaseException` (`src/app/exceptions/app.base.exception.ts`), one class per file under the `exceptions/` folder of the module owning its status-code enum:

```ts
export class UserNotFoundException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.notFound;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('user.error.notFound');
    }
}
```

- `statusCodeKey` is the reverse lookup on the same member, never a hardcoded string.
- Interpolated messages take named constructor params mapped into `messageProperties`.
- `AppUnknownException` (`src/app/exceptions/app.unknown.exception.ts`) takes `(rawError: unknown, description: string | null = null)` and keeps HTTP 500 and `EnumAppStatusCodeError.unknown`. A runtime failure that answers no HTTP request (boot, config parse, decoration time, a job, a seed, a logged best-effort failure) is an `AppUnknownException` subclass that names the failure through `description` and allocates no status code: `FirebasePrivateKeyInvalidException`, `FirebaseInitializationFailedException`, `AuthJwtConfigMissingException`, `AuthJwtConfigInvalidException`, `RequestThrottleResponseInvalidException`, and the decorator exceptions below. A failure that answers an HTTP request extends `AppBaseException` with its own member.
- A caught error is wrapped, never swallowed: `throw new AppUnknownException(err)`, or a util's `toException(err) ?? new AppUnknownException(err)`. A bare `throw err` sits only inside an `instanceof` guard of our own exception (`AppBaseException`, `QueueException`); a processor also passes BullMQ's `UnrecoverableError`, and `ActivityLogInterceptor` passes `HttpException`. `throw new Error(...)` and an unguarded rethrow fail `pnpm lint` (`code-style.md`, ESLint). The cause rides in `rawError`, reaches Sentry for 5xx, and never reaches the response body. A best-effort side effect a rule names (a cache read or write, the post-commit session purge, throttle storage, a job-log line) logs the failure and continues.
- `httpStatus` is the wire status and the Sentry switch: only 5xx is logged and reported. 500 means an unknown error or a bug we detect ourselves (`RequestContextMissingException`); an unreachable database or Redis answers 503 and a write conflict 409. A request that needs an unset optional integration (`config.md`) throws its not-configured exception, 404: `AwsS3NotConfiguredException`, `AuthSocialGoogleNotConfiguredException`, `AuthSocialAppleNotConfiguredException`.

## Who throws

- The domain throws the typed exception of the subject that failed, never a Nest `BadRequestException` / `NotFoundException`; another module's exception is correct when that module owns the entity (`cross-module.md`).
- A `*Protected` decorator checks its arguments when the route is decorated, so a bad route fails the boot: `RoleProtectedEmptyException`, `PolicyProtectedEmptyException`, `PolicyProtectedActionEmptyException`, `FeatureFlagKeyEmptyException`, `FeatureFlagKeyNestedException`, `RequestEnvProtectedEmptyException`. A guard that still reads empty metadata fails closed: `PolicyGuard` denies an empty policy list (`src/modules/policy/factories/policy.factory.ts:32`).
- One guard condition answers one exception and HTTP status in every guard: a missing authenticated user is `UserNotAuthenticatedException` (401) from the user, role, policy, workspace-member, project-member, and term-policy checks alike.
- A param decorator reading a guard's store key throws that guard's exception when the key is missing (`@UserCurrent()` and `@RoleCurrent()` throw `UserNotAuthenticatedException`, `@PolicyCurrent()` `PolicyForbiddenException`, `@WorkspaceCurrent()` `WorkspaceNotFoundException`, `@ProjectMemberCurrent()` `ProjectMemberForbiddenException`) and `RequestContextMissingException` (500) when a field of the stored value is missing; a handler never receives `null`.
- A controller catches no `AppBaseException` (the filter chain maps it); an HTTP service throws nothing of its own.
- `QueueException` (`src/queues/exceptions/queue.exception.ts`) is a processor service's one exception, and a domain's for a job failure no subject's exception names (`notification.email.term-policy.domain.ts:93`). `isFatal` (default `false`) decides only the Sentry report: `onFailed` (`src/queues/bases/queue.processor.base.ts:72`) reports after the last attempt, a `QueueException` only when fatal, any other error always. BullMQ retries either way, up to `queue.job.attempts` (`src/configs/queue.config.ts`); `UnrecoverableError` ends them at once (`queue.md`).
- A util maps an error and returns it (`layering.md`, `src/modules/user/utils/user.onboarding.util.ts:12`); `DatabaseUtil.toException` and `RedisUtil.toException` return `null` for an error they do not know. `PaginationQueryUtil` is the one util that throws, and only its own `pagination` exceptions.
- A repository's one typed exception is `DatabaseUniqueValueGenerationFailedException` (`database.md`).
- Framework `HttpException`s (route 404, throttler 429) are the framework's to throw and `AppHttpFilter`'s to handle; multipart limits are the one surface the kit maps onto typed `file` exceptions first (`file.md`).

## The filter chain

`AGENTS.md` states the `APP_FILTER` order in `src/app/app.module.ts`; do not reorder the array. Most specific first:

- `AppValidationImportFilter`: `FileImportException`, no Sentry.
- `AppValidationFilter`: `RequestValidationException`, no Sentry.
- `AppHttpFilter`: `HttpException`, the error log and Sentry at 5xx.
- `AppGeneralFilter` (`@Catch()`), the single translator for everything else: an `AppBaseException` renders as itself; an `AppUnknownException` whose `rawError` maps through `DatabaseUtil.toException` or `RedisUtil.toException` renders as the mapped exception; any other error is mapped the same way or answers 500 as `AppUnknownException`. The error log and Sentry fire only for 5xx, with `rawError` when set.

The mappings: `DatabaseWriteConflictCode` to `DatabaseWriteConflictException` (409); a `DatabaseUnavailableCodes` member or a `PrismaClientInitializationError` to `DatabaseUnavailableException` (503), both code constants in `src/common/database/constants/database.constant.ts`; keyv's `RedisErrorMessages.RedisClientNotConnectedThrown` to `RedisUnavailableException` (503). A BullMQ enqueue failure matches neither and answers 500. The body is `ResponseErrorSchema` (`src/common/response/dtos/response.error.dto.ts`).

## Status codes

`statusCode` is a 5-digit integer in `Enum<Module>StatusCodeError` at `<module>/enums/<module>.status-code.enum.ts`, camelCase keys, referenced by member name only. Each owner (a feature module, or a `src/common/` sub-tree such as `file`, `pagination`, `request`, `database`, `redis`) holds one contiguous hundred (`51000`–`51099`), members sequential from the block base with no gaps. The enum files are the registry: scan them before allocating, never allocate from memory. Reuse a member that already means the thing before adding one. The integer is client-visible; prefer keying a client on `module` + `statusCodeKey`. Procedure: `.claude/skills/ack-build/references/add-status-code.md`.

## Messages

`messagePath` is `<module>.error.<descriptor>`, its first segment the language file name, the key in every language directory (`i18n.md`). A generic transport failure reuses `http.<class>.<descriptor>` (`http.clientError.forbidden`).
