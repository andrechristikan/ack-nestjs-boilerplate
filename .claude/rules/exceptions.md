---
paths:
    - '**/exceptions/**'
    - '**/guards/**'
    - '**/*.status-code.enum.ts'
    - 'src/app/**'
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/services/**'
    - 'test/unit/modules/*/use-cases/**'
    - 'src/common/firebase/**'
    - 'src/common/database/utils/**'
    - 'src/common/redis/**'
---

# Exceptions and status codes

## The hierarchy

Every typed error extends `AppBaseException` (`src/app/exceptions/app.base.exception.ts`) except `QueueException` and its subclasses (job failures, below), one class per file under the `exceptions/` folder of the module owning its status-code enum:

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
- `AppUnknownException` (`src/app/exceptions/app.unknown.exception.ts`) takes `(rawError: unknown, description: string | null = null)`, passes `rawError` to the base, and keeps HTTP 500 and `EnumAppStatusCodeError.unknown`. Every runtime failure that answers no HTTP request and is no job failure (boot, config parse, decoration time, a seed, a logged best-effort failure) is an `AppUnknownException` subclass that names the failure through `description` and allocates no status code: `FirebaseInitializationFailedException`, `AuthJwtConfigInvalidException`, the `*Protected` decorator exceptions (`guards.md`). A failure that answers an HTTP request extends `AppBaseException` with its own member.
- A job failure no subject's exception names, wherever the processor side throws it (processor, use case, service), is a `QueueException` (`src/common/queue/exceptions/queue.exception.ts`), which extends `Error` and carries `message`, `isFatal`, and `rawError` (Messages), or a subclass in the failing module's `exceptions/` (`NotificationEmailDeliveryUnknownException`).
- A caught error is wrapped, never swallowed: `throw new AppUnknownException(err)`, a util's `toException(err) ?? new AppUnknownException(err)`, in a processor `this.throwUnknownException(err);` (protected on `QueueProcessorBase`, `queue.md`, Processors), or in a use case or service `throw new QueueException(<its own setMessage>, true, err)` or its module subclass. A bare `throw err` sits only inside an `instanceof` guard of our own `*Exception`, or of BullMQ's `UnrecoverableError` in a processor (`eslint.md`, Config blocks). The cause rides in `rawError`; `AppBaseException` and `QueueException`, subclasses included, set the standard `cause` from a non-null `rawError`. The pino error serializer (`LoggerUtil.serializeError`) writes the `cause` chain up to `LoggerRedactMaxDepth` levels, a non-`Error` cause through redaction; the cause never reaches the response body. A best-effort side effect a rule names (an outbox dispatch, `outbox.md`; a job-log line) logs the failure and continues. A Redis connection error answers 503, from the cache (`CacheService`, the throttle storage); any other error behind `CacheService` or the throttle storage logs one `warn` per window and continues (`cache.md`).
- `httpStatus` is the wire status and the Sentry switch: only 5xx is logged and reported. `RedisUnavailableException` and `DatabaseUnavailableException` are logged and reported once per window (`cache.md`, `database.md`). 500 is an unknown error or a bug we detect (`RequestContextMissingException`, `FeatureFlagNotConfiguredException`); 503 an unreachable database, Redis, or auth provider (`AuthProviderUnavailableException` for JWKS, Google, and Apple, `AuthService.toProviderUnavailableException` in `src/modules/auth/services/auth.service.ts`); 409 a write conflict; 404 a request needing an optional integration whose credentials are unset (`config.md`): `AwsS3NotConfiguredException`, `AuthSocialGoogleNotConfiguredException`, `AuthSocialAppleNotConfiguredException`.

## Who throws

- A service throws the typed exception of the subject that failed, never a Nest `BadRequestException` / `NotFoundException`; another module's exception is correct when that module owns the entity (`cross-module.md`).
- A guard, a `*Protected` decorator, and a param decorator throw what `guards.md` states.
- A controller catches no `AppBaseException` (the filter chain maps it); an HTTP use case originates only a mapped write conflict, a mapped unique collision, and the slug retry exhaustion `DatabaseUniqueValueGenerationFailedException` (`use-case.md`).
- A use case a processor calls originates only `QueueException`, a mapped write conflict, a mapped unique collision, and the slug retry exhaustion (`use-case.md`, Shape); a service throws a `QueueException` or its module's subclass for a job failure no subject's exception names (`NotificationEmailTermPolicyService.processPublishTermPolicy`). `isFatal` (default `false`) decides only the Sentry report; when it reports and how retries run: `queue.md`, Processors.
- A util maps an error and returns it (`layering.md`, `AuthTwoFactorUtil.toDecryptException` in `src/modules/auth/utils/auth.two-factor.util.ts`); `DatabaseUtil.toException` returns `null` for an error it does not know. `PaginationQueryUtil` and `PaginationFilterUtil` are the utils that throw, and only their own `pagination` exceptions.
- The retry's owner throws `DatabaseUniqueValueGenerationFailedException` (`database.md`, Generated unique values): a repository (its one typed exception), a service, a use case, or a seed.
- Framework `HttpException`s (route 404, throttler 429) are the framework's to throw and `AppHttpFilter`'s to handle; multipart limits are the one surface the kit maps onto typed `file` exceptions first (`file.md`).

## The filter chain

`AGENTS.md` states the `APP_FILTER` order in `src/app/app.module.ts`; do not reorder the array. Most specific first:

- `AppValidationImportFilter`: `FileImportException`, no Sentry.
- `AppValidationFilter`: `RequestValidationException`, no Sentry.
- `AppHttpFilter`: `HttpException`, the error log and Sentry at 5xx.
- `AppGeneralFilter` (`@Catch()`), the single translator for everything else: an `AppBaseException` renders as itself; an `AppUnknownException` whose `rawError` maps through `DatabaseUtil.toException` or `CacheService.isConnectionError` renders as the mapped exception; any other error is mapped the same way or answers 500 as `AppUnknownException`.

The mappings: the Prisma ones in `database.md`, Access; a Redis connection error (`cache.md`) to `RedisUnavailableException` (503). The body is `ResponseErrorSchema` (`src/common/response/dtos/response.error.dto.ts`).

## Side effects

A request's side effect (notification, activity entry, session cache purge, cache invalidation, S3 object delete) is an outbox row in its write's transaction (`outbox.md`); a failed dispatch never changes the response.

- An exception the request throws stays its answer; an entry recorded for that failure is added before the throw (`activity-log.md`).
- A route whose only work is a side effect (the term-policy resend) adds it through `OutboxService.add`: a failed insert answers as `database.md` maps it, and a failed dispatch leaves the row `pending` and the route answers 200.

## Status codes

`statusCode` is a 5-digit integer in `Enum<Module>StatusCodeError` at `<module>/enums/<module>.status-code.enum.ts`, camelCase keys, referenced by member name only. Each owner (a feature module, or a `src/common/` sub-tree such as `file`, `pagination`, `request`, `database`, `redis`) holds one contiguous hundred (`51000`–`51099`), members sequential from the block base. The integer is client-visible; prefer keying a client on `module` + `statusCodeKey`. Procedure: `.claude/skills/ack-build/references/add-status-code.md`.

## Messages

`messagePath` is `<module>.error.<descriptor>`, its first segment the language file name, the key in every language directory (`i18n.md`). A generic transport failure reuses `http.<class>.<descriptor>` (`http.clientError.forbidden`).

A `QueueException` message is `setMessage('<module>.queue.[<channel>.]error.<descriptor>', { properties })` (channel segment: `i18n.md`), built by its thrower (a use case or service injecting `MessageService`; a processor's `default`: `queue.md`, Processors), never a literal or a template literal. The unknown-error wrap's message is `queue.error.unknown` (`src/languages/<lang>/queue.json`), built by `throwUnknownException`. Its three positional parameters are `(message, isFatal = false, rawError = null)`; a subclass passes them to `super`: `NotificationEmailDeliveryUnknownException` `(message, true, rawError)`.
