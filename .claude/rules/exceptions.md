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

# Exceptions

The class shape, status codes, and `messagePath`: `exception-class.md`. The filter chain: `filter.md`. Side effects: `effects.md`.

## The hierarchy

- `AppUnknownException` (`src/app/exceptions/app.unknown.exception.ts`) keeps HTTP 500 and `EnumAppStatusCodeError.unknown`. Every runtime failure that answers no HTTP request and is no job failure (boot, config parse, decoration time, a logged best-effort failure) is an `AppUnknownException` subclass that names the failure through `description` and allocates no status code: `FirebaseInitializationFailedException`, `AuthJwtConfigInvalidException`, the `*Protected` decorator exceptions (`guards.md`). A failure that answers an HTTP request extends `AppBaseException` with its own member.
- A job failure no subject's exception names, wherever the processor side throws it (processor, use case, service), is a `QueueException` (`src/common/queue/exceptions/queue.exception.ts`), which extends `Error` and carries `message`, `isFatal`, and `rawError` (Messages), or a subclass in the failing module's `exceptions/`. A failure no retry heals is a `QueueUnrecoverableException` or its module subclass (`NotificationEmailDeliveryUnknownException`), which the processor base stops retrying (`queue.md`, Processors).
- A caught error is wrapped, never swallowed: `throw new AppUnknownException(err)`, `this.throwUnknownException(err);` in `QueueProcessorBase` (`queue.md`, Processors), or in a use case or service `throw new QueueException(<its own setMessage>, true, err)` or its module subclass. The `instanceof` guard around a bare `throw err` names our own `*Exception`, or BullMQ's `UnrecoverableError` in `QueueProcessorBase`. The cause rides in `rawError` and never reaches the response body. A probe or a parse whose answer is the failure (a connection check, a signature or token verification, a URL or JSON parse) returns `false` or `null` from a binding-less `catch`, and its caller throws the typed exception. A best-effort side effect a rule names (an outbox dispatch, `outbox.md`; a job-log line) logs the failure and continues. Redis errors: `cache.md`.
- `httpStatus` is the wire status and the filter chain's Sentry switch: it logs at `error` and reports every 5xx on every request, and no other status (a service reporting an operator fault: `logging.md`); a refusal leaves one `warn` (`filter.md`). 500 is an unknown error or a bug we detect (`RequestContextMissingException`, `FeatureFlagNotConfiguredException`); 503 an unreachable auth provider (`AuthProviderUnavailableException` for JWKS, Google, and Apple, `AuthService.toProviderUnavailableException` in `src/modules/auth/services/auth.service.ts`); 501 a request needing an optional integration whose credentials are unset (`config.md`): `AwsS3NotConfiguredException`, `AwsSesNotConfiguredException`, `AuthSocialGoogleNotConfiguredException`, `AuthSocialAppleNotConfiguredException`.

## Who throws

- A service throws the typed exception of the subject that failed, never a Nest `BadRequestException` / `NotFoundException`.
- A repository's catch throws a database error through its contract: `AppUnknownException` unless the contract names it (`repository.md`, Writes). No use-case, service, or processor catch maps a database error, and a processor maps no exception (`queue.md`, Processors). A catch stays where it does more: a retry loop, a job wrapping into `QueueException`, the import job answering a collision (`use-case.md`, Jobs).
- A guard, a `*Protected` decorator, and a param decorator throw what `guards.md` states.
- A controller catches no `AppBaseException` (the filter chain maps it). What a use case originates: `use-case.md`, Shape.
- `isFatal` (default `false`) decides only the Sentry report; when it reports and how retries run: `queue.md`, Processors.
- A util: `layering.md`, Roles; the two pagination utils throw only their own `pagination` exceptions.
- Framework `HttpException`s (route 404, throttler 429) are the framework's to throw and `AppHttpFilter`'s to handle; multipart limits are the one surface the kit maps onto typed `file` exceptions first.

## Messages

A `QueueException` message is `setMessage('<module>.queue.[<channel>.]error.<descriptor>', { properties })` (channel segment: `i18n.md`), built by its thrower (a use case or service injecting `MessageService`; a processor's `default` through the base's `throwUnknownProcess`: `queue.md`, Processors), never a literal or a template literal.
