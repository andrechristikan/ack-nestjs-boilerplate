# Logging

Pino sits behind Nest's `Logger` via `LoggerModule.forRoot()`: `LoggerOptionService` assembles
the pino options, and `LoggerUtil` (`src/common/logger/utils/logger.util.ts`) holds every
transformation a record goes through. Sentry is initialised and scrubbed in
`src/instrument.ts`, and every report goes through `SentryService`
(`src/common/sentry/`). Flow narrative: `docs/logger.md` — explorer or planner.

## The logger instance

```ts
private readonly logger = new Logger(ClassName.name);
```

One per class, `private readonly`, named after the class. Never a module-level logger, never a
`console.*` call anywhere in `src/`.

## Errors are object-first, everything else is message-first (HARD)

```ts
this.logger.error(error, 'Failed to connect');     // error first, context second
this.logger.warn('Cache miss on user profile');    // message first
this.logger.debug('Resolved workspace', { … });
this.logger.log('Bootstrap complete');
```

Getting the order backwards on `error` loses the stack: Pino serializes the first argument as
the error object, so `logger.error('Failed', error)` logs the string and drops the trace. It
compiles, it runs, and the trace is simply not there.

## Levels

`EnumLoggerLevel` mirrors Pino: `fatal` · `error` · `warn` · `info` · `debug` · `trace`. The
active level is `logger.level` config, from `LOGGER_LEVEL`. `EnumLoggerSeverity`
(`critical` · `error` · `warning` · `info` · `debug` · `trace`) is the `severity` field
`LoggerUtil.mapLevelToSeverity` writes on every record — do not mix the two enums.
`SentryService.captureMessage` takes Sentry's own `SeverityLevel`.

Pick the level by who must act:

| Level | Means |
|---|---|
| `fatal` | the process cannot continue |
| `error` | a request or job failed and someone must look |
| `warn` | degraded but handled — a fallback fired, a retry is pending |
| `info` | a lifecycle fact worth keeping in production |
| `debug` / `trace` | developer detail, off in production |

## A credential never reaches a log line (HARD)

Not in `logger.debug`, not inside an error message, not inside a `JSON.stringify`, not in
activity-log metadata, not in a Sentry attribute. **Redaction is a safety net, not a licence**:
log retention becomes credential retention the moment a field is named something the
redactor does not know (`rules/security.md`).

What the net does:

- **Keys.** `LoggerSensitiveFields` (`src/common/logger/constants/logger.constant.ts`) is the
  one list of sensitive keys, matched case-insensitively. `LoggerUtil.redactValue` replaces
  them with `[REDACTED]` at any depth, and a value nested past `LoggerRedactMaxDepth` is
  replaced whole. A new credential-carrying key is added to that list, not redacted ad hoc.
- **Request records.** A request log carries a `route` — the masked path, with every segment
  that is not a static word replaced — and never the raw URL. `params` carries names only;
  query and headers go through `redactValue`; a request body is never serialized. A secret in
  a path parameter is therefore never written, and a new route needs no logging change.
- **Sentry.** `src/instrument.ts` runs before Nest boots, so its scrubbing is plain functions
  reading the same constants, not `LoggerUtil`. `beforeSend`, `beforeSendTransaction`,
  `beforeBreadcrumb` and `beforeSendLog` mask URLs, drop query strings, redact request bodies
  (object, JSON and urlencoded; any other string whole), headers, cookies, span data and log
  attributes. A new sensitive key reaches both paths through `LoggerSensitiveFields`.

## Where errors are reported

`SentryService` is the one way code reports to Sentry: `captureException`, `captureMessage`,
and `log` (Sentry Logs, scrubbed by `beforeSendLog`). Its callers are fixed:

- **The `APP_FILTER` chain**, with `httpStatus` as the switch: `AppHttpFilter` and
  `AppBaseExceptionFilter` report at 500+ (the base filter reports `rawError` when set),
  `AppGeneralFilter` always reports, `AppValidationFilter` and `AppValidationImportFilter`
  never do (`rules/exceptions.md`). Each filter logs the failure itself, then reports.
- **`QueueProcessorBase`** reports once: on the final attempt (`job.attemptsMade` already
  counts the failed attempt when `failed` fires), or immediately for an `UnrecoverableError`,
  and only when the error is fatal (`rules/queue.md`).
- **A domain reports an operator fault that no filter reports**, and only that: a failure
  the caller receives as a non-5xx answer while the cause is a broken deployment.
  `AuthTwoFactorDomain` reporting an undecryptable two-factor secret, while the client gets
  a 409, is the case.

Any other service does not report to Sentry itself and does not log-and-rethrow — that
produces two records of one failure with different context.

## Never assert on a logger in a spec

A spec asserting on a log call or a `console` call is asserting on the one thing that is
allowed to change freely. Never mock the logger to spy it; never assert `toHaveBeenCalled`
on it (`rules/testing-spec-style.md`). The suite mutes Nest `Logger` in `test/setup.ts` by
assigning no-ops onto the class (instance and static) and onto `ConsoleLogger.prototype`.
