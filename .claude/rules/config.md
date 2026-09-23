---
paths:
  - "src/configs/**"
  - ".env.example"
  - "src/common/logger/**"
  - "src/common/sentry/**"
  - "src/common/cache/**"
  - "src/common/redis/**"
---

# Config, logging, cache

## Config

- Every `src/configs/*.config.ts` exports an interface beside its `registerAs`; `src/configs/index.ts` is the
  barrel `common.module.ts` loads into `ConfigModule.forRoot` with `validationSchema: AppEnvSchema`
  (`dto.md`). A new env var is the config file, its interface, `AppEnvSchema`, and `.env.example`.
- Read through `ConfigService.get('namespace.key')`. `process.env` is read only in `src/configs/`,
  `common.module.ts`, `main.ts`, and `queue.decorator.ts` (a decorator has no injection context).
- A TTL, retry or backoff count, size threshold, rollout percent, cron pattern, rate limit, or max-attempts
  budget is a config key, not a literal or a bare `const` in a service, util, guard, or module wiring.
  Nested keys are readable camelCase for the thing they configure.
- A duration key is named for the unit its consumer takes (`InMs`, `InSeconds`, `InDays`) and holds the value
  in that unit, built from `ms('<string>')` and divided inside the config file (`ms('7d') / 1000` for
  seconds). No raw number, no inline arithmetic, no division at the call site. A duration computed at request
  time has no key and is converted where used. A size key is `InBytes` from `bytes('<string>')`.
- A URL is a `*Pattern` key with `{placeholder}` segments filled by the reader (`code-style.md`); a URL the
  application emits holds the full host, a path the framework mounts is a fragment; the host keeps its own
  key and is substituted in. No string concatenation of a URL anywhere.
- `request.throttle.default.limit` stays above `request.throttle.user.limit` (`src/configs/request.config.ts:108`);
  otherwise the per-IP default fires first and the per-user limiter never runs. A custom `x-*` header name
  lives in its owning config and is repeated once in `request.config.ts` `cors.allowedHeader` (`:65`).
- A credential has no literal default; it comes from the environment (Vault through `pnpm vault:pull` when
  deployed) and `.env.example` carries every key with an empty value. An encryption root is validated by
  `RequestEncryptionSecretSchema` and exposed unchanged; a config interface holds no `Buffer`.

## Logging

- Pino behind Nest's `Logger` through `LoggerModule.forRoot()`; `LoggerOptionService` builds the options,
  `LoggerUtil` (`src/common/logger/utils/logger.util.ts`) shapes and redacts.
- One `private readonly logger = new Logger(ClassName.name)` per class; no module-level logger, no
  `console.*` in `src/`. `error` is object-first, `this.logger.error(error, 'context')`; everything else is
  message-first. The reversed order drops the stack.
- `EnumLoggerLevel` is the Pino level (`logger.level` config); `EnumLoggerSeverity` is the `severity` field
  `LoggerUtil.mapLevelToSeverity` (`:256`) writes. Pick by who must act: `fatal` process cannot continue,
  `error` someone must look, `warn` degraded but handled, `info` a lifecycle fact, `debug` / `trace` detail.
- `LoggerSensitiveFields` (`src/common/logger/constants/logger.constant.ts:56`) is the one list of sensitive
  keys; `LoggerUtil.redactValue` (`:172`) masks them at any depth, a request log carries a masked `route` and
  never a body, and `src/instrument.ts` `beforeSend`, `beforeSendTransaction`, `beforeBreadcrumb`,
  `beforeSendLog` (`:306` on) scrub Sentry from the same constants. A new credential key goes on that list.
- `SentryService` (`src/common/sentry/services/sentry.service.ts`: `captureException`, `captureMessage`,
  `log`) is the one way to report. Callers: the `APP_FILTER` chain by `httpStatus`,
  `QueueProcessorBase.onFailed` once when fatal, and a domain reporting an operator fault the client receives
  as a non-5xx (`AuthTwoFactorDomain`). No other service reports, and nothing logs-and-rethrows: filters and
  the queue base own the single failure log. A spec never asserts on a logger (`testing.md`).

## Cache

- `RedisCacheModule.forRoot()` provides the shared Keyv client (`throwOnErrors: true`,
  `src/common/redis/redis.module.ts:28`); `CacheMainModule.forRoot()` wires `@nestjs/cache-manager` on it.
  Redis `db:0`.
- A module's cache reads and writes live in `caches/<module>[.<concern>].cache.ts` (`SessionCache`,
  `ApiKeyCache`, `FeatureFlagCache`, `AuthCache`, `AnalyticCache`), provided by the domain module, holding
  the cache manager and its config `keyPattern`. A util never touches the cache.
- A cached route is `@Response(path, { cache: true | { key, ttl } })`, which mounts `ResponseCacheInterceptor`
  inside `ResponseInterceptor`; the raw return is stored, so the schema declares only JSON-safe shapes (no
  `z.date()`, `Map`, `Set`). The default TTL is `redis.cache.ttlInMs`; a per-route `ttl` is its own `InMs`
  key. Never cache a response that varies by caller without the caller in the key, or one carrying a credential.
- A read that fails falls through to the database; a cache entry is never a lock or an invariant. A write
  fails the request when the entry is the authority (session write on login and refresh rotation, the
  two-factor challenge) or when a stale entry keeps a revoked credential working (API key delete after the
  database write); it is caught and logged where the entry expires on its own (session purges, challenge and
  lock clears, read-through writes). A write that makes a cached read stale invalidates it in the same operation.
