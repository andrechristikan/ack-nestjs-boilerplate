---
paths:
    - '**/exceptions/**'
    - '**/*.status-code.enum.ts'
    - 'src/app/**'
    - 'src/modules/*/domains/**'
    - 'src/common/firebase/**'
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
- A caught error is wrapped, never swallowed: `throw new AppUnknownException(err)`. The cause rides in `rawError`, reaches Sentry for 5xx, and never reaches the response body. A best-effort side effect a rule names (a cache read or write, the post-commit session purge, throttle storage, a job-log line) logs the failure and continues.
- `httpStatus` is the wire status and the Sentry switch: filters report at 500 and above. A request that needs an unset optional integration (`config.md`) throws its not-configured exception, 404 and so outside Sentry: `AwsS3NotConfiguredException`, `AuthSocialGoogleNotConfiguredException`, `AuthSocialAppleNotConfiguredException`.

## Who throws

- The domain throws the typed exception of the subject that failed, never `new Error()` or a Nest `BadRequestException` / `NotFoundException`; another module's exception is correct when that module owns the entity (`cross-module.md`). A plain `Error` is correct only where no request or job reaches and no filter maps it: config parsed at construction or boot (the JWT key parse in `AuthJwtDomain`, `FirebaseService.onModuleInit`) and a seed command under `src/migration/`.
- A controller catches no `AppBaseException` (the filter chain maps it); an HTTP service throws nothing of its own.
- `QueueException` (`src/queues/exceptions/queue.exception.ts`) is a processor service's one exception, and a domain's for a job failure no subject's exception names (`notification.email.term-policy.domain.ts:93`). `isFatal` (default `false`) decides only the Sentry report: `onFailed` (`src/queues/bases/queue.processor.base.ts:62`) reports after the last attempt, a `QueueException` only when fatal, any other error always. BullMQ retries either way, up to `queue.job.attempts` (`src/configs/queue.config.ts`); `UnrecoverableError` ends them at once (`queue.md`).
- A util maps an error and returns it (`layering.md`, `src/modules/user/utils/user.onboarding.util.ts:12`). `PaginationQueryUtil` is the one util that throws, and only its own `pagination` exceptions.
- A repository's one typed exception is `DatabaseUniqueValueGenerationFailedException` (`database.md`).
- A param decorator reading the store throws `RequestContextMissingException` (HTTP 500) when its key or field is missing; a handler never receives `null` from `@UserCurrent()`.
- Framework `HttpException`s (route 404, throttler 429) are the framework's to throw and `AppHttpFilter`'s to handle; multipart limits are the one surface the kit maps onto typed `file` exceptions first (`file.md`).

## The filter chain

`AGENTS.md` states the `APP_FILTER` order in `src/app/app.module.ts`; do not reorder the array. Most specific first: `AppValidationImportFilter` (`FileImportException`, no Sentry), `AppValidationFilter` (`RequestValidationException`, no Sentry), `AppHttpFilter` (`HttpException`, Sentry at 500+), `AppBaseExceptionFilter` (`AppBaseException`, Sentry at 500+ with `rawError` when set), `AppGeneralFilter` (fallback, always 500 and Sentry). The body is `ResponseErrorSchema` (`src/common/response/dtos/response.error.dto.ts`).

## Status codes

`statusCode` is a 5-digit integer in `Enum<Module>StatusCodeError` at `<module>/enums/<module>.status-code.enum.ts`, camelCase keys, referenced by member name only. Each owner (a feature module, or a `src/common/` sub-tree such as `file`, `pagination`, `request`, `database`) holds one contiguous hundred (`51000`–`51099`), members sequential from the block base with no gaps. The enum files are the registry: scan them before allocating, never allocate from memory. Reuse a member that already means the thing before adding one. The integer is client-visible; prefer keying a client on `module` + `statusCodeKey`. Procedure: `.claude/skills/ack-build/references/add-status-code.md`.

## Messages

`messagePath` is `<module>.error.<descriptor>`, its first segment the language file name, the key in every language directory (`i18n.md`). A generic transport failure reuses `http.<class>.<descriptor>` (`http.clientError.forbidden`).
