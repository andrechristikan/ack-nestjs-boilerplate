# Logging

Detail in `docs/logger.md`. Pino sits behind Nest's `Logger` via `LoggerModule.forRoot()` and
`LoggerOptionService`; Sentry is wired in `src/instrument.ts` and reported from the filter
chain.

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
active level is `logger.level` config, from `LOGGER_LEVEL`. `EnumLoggerSeverity` is the
separate Sentry-facing scale (`critical` · `error` · `warning` · `info` · `debug` · `trace`) —
do not mix the two enums.

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
activity-log metadata. Pino redacts known secret keys through `createRedactionConfig()`, but
**redaction is a safety net, not a licence**: log retention becomes credential retention the
moment a field is named something the redactor does not know (`rules/security.md`).

## Where errors are reported

The `APP_FILTER` chain owns Sentry reporting, and `httpStatus` is the switch: `AppHttpFilter`
and `AppBaseExceptionFilter` report at 500+, `AppGeneralFilter` always reports,
`AppValidationFilter` and `AppValidationImportFilter` never do (`rules/exceptions.md`). **A
service does not report to Sentry itself** and does not log-and-rethrow — that produces two
records of one failure with different context.

A BullMQ processor is the one place with its own reporting: `QueueProcessorBase` reports to
Sentry once, on the last attempt only, and only when the error is fatal. A processor extending
`WorkerHost` directly loses that and double-reports across retries (`rules/queue.md`).

## Never assert on a logger in a spec

The jest setup file voids the logger and `console` globally. A spec asserting on a log call is
asserting on the void (`rules/testing.md`).
