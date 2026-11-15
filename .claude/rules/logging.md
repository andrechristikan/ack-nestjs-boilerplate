---
paths:
    - 'src/main.ts'
    - 'src/migration.ts'
    - 'src/configure.ts'
    - 'src/instrument.ts'
    - 'src/common/common.module.ts'
    - 'src/common/logger/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
    - 'src/common/request/services/request.throttle-storage.service.ts'
    - 'src/common/sentry/**'
---

# Logging

- Pino behind `Logger` via `LoggerModule.forRoot()`.
- The pino `mixin` logs `RequestIdStoreKey`, `RequestCorrelationIdStoreKey`, and `RequestActorStoreKey` (as `userId`) top-level from `RequestStoreService` (`null` outside a request or before the JWT guard), never a header, `req.id`, or `request.user`; the request serializer logs no identity. `RequestModule.forRoot()` precedes `LoggerModule.forRoot()` in `src/common/common.module.ts`, so the CLS store wraps pino-http's completion line. Each id is its inbound header (`x-request-id`, `x-correlation-id`) when it matches `RequestIdRegex`, else a new UUID v7.
- One `private readonly logger = new Logger(ClassName.name)` per class, never module-level; `error`, and a `warn` that carries a caught error, are object-first (`this.logger.error(error, 'context')`, `this.logger.warn({ key, err: error }, 'context')`; the reverse drops the stack and the object), the rest message-first.
- `EnumLoggerLevel` is the Pino level (`logger.level`), `EnumLoggerSeverity` the `severity` field (`LoggerUtil.mapLevelToSeverity`, `src/common/logger/utils/logger.util.ts`). By who must act: `fatal` process cannot continue, `error` someone must look, `warn` degraded but handled, `info` a lifecycle fact, `debug`/`trace` detail.
- `LoggerSensitiveFields` (`src/common/logger/constants/logger.constant.ts`) is the one list of sensitive keys, new credential keys included; `LoggerUtil.redactValue` (`src/common/logger/utils/logger.util.ts`) masks them at any depth, a request log carries a masked `route` and never a body, and the `src/instrument.ts` hooks from `beforeSend` (`:81`) on scrub Sentry from the same constants.
- `SentryService` is the one way to report outside `bootstrap().catch`. Callers: the `APP_FILTER` chain at 5xx, `QueueProcessorBase.onFailed` once when fatal, and a service reporting an operator fault the client receives as a non-5xx (the TOTP secret read in `MfaTotpService`). Only `QueueProcessorBase.process` logs-and-rethrows: BullMQ needs the throw, no filter sees a job.
- `bootstrap().catch` (`src/main.ts:81`, `src/migration.ts:36`) logs one `fatal` line, calls `Sentry.captureException` and `Sentry.flush` directly, and exits 1. `src/migration.ts:15` sets nest-commander's `serviceErrorHandler`, whose default exits 0 on a seed failure.
- `ConfigureOptions` (`src/configure.ts:8`) and `src/migration.ts:11` set `abortOnError: false`, `bufferLogs: true`, `logger: ['fatal']`, until Pino takes over at `LOGGER_LEVEL`.
