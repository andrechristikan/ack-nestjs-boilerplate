---
paths:
  - "src/configs/**"
  - ".env.example"
  - "src/app/dtos/app.env.dto.ts"
  - "src/instrument.ts"
  - "src/common/logger/**"
  - "src/common/sentry/**"
  - "src/common/cache/**"
  - "src/common/redis/**"
  - "src/common/aws/**"
  - "src/common/firebase/**"
  - "src/modules/health/indicators/**"
  - "src/modules/*/caches/**"
---

# Config, logging, cache

## Config

- `src/configs/<kebab>.config.ts` exports `IConfig<Namespace>` and default-exports
  `registerAs('<camelNamespace>', ...)`; `src/configs/index.ts` imports it as `<Namespace>Config` into the barrel
  `common.module.ts` loads into `ConfigModule.forRoot` with `validationSchema: AppEnvSchema` (`dto.md`). A new env
  var is the config file, its interface, `AppEnvSchema`, and `.env.example`. A required var reads as `process.env.X!`,
  an optional one as `readOptionalEnv(process.env.X)` (blank is `null`), a boolean as `process.env.X === 'true'`.
- `src/instrument.ts` runs before Nest and calls the config factories directly; everything else reads
  `ConfigService.get<T>('namespace.key')`, `T` named, into a `private readonly` field once, in the class constructor;
  a module `useFactory`, a queue options factory, `main.ts`, and `swagger.ts` read where they build.
- A TTL, retry or backoff count, size threshold, chunk size, rollout percent, sample rate, cron pattern, rate limit, or
  max-attempts budget is a camelCase config key, never a literal or a bare `const` in a service, util, guard, or module wiring.
- A duration key is named for its consumer's unit (`InMs`, `InSeconds`, `InDays`) and built from `ms('<string>')`,
  divided inside the config file (`ms('7d') / 1000`); no raw number, no call-site arithmetic. A duration computed at
  request time has no key. A size key is `InBytes` from `bytes('<string>')`.
- A URL is a `*Pattern` key with `{placeholder}` segments: an emitted URL is full with its own host key, a path a fragment.
- `request.throttle.default.limit` stays above `request.throttle.user.limit`, or the per-IP default fires first.
- A header name, CLS store key, metadata key, or wire label is a constant or enum, never config; a header is
  `<Module>[<Concern>]HeaderName`, in `src/common/` when the kit reads it. `request.config.ts` builds the CORS header
  lists from those constants, the one config importing from `@modules`.
- A credential comes from the environment (deployed: `pnpm vault:pull`). An application credential has no literal
  default and is empty in `.env.example`; a `DOCKER_` key is the one exception, empty in `.env.example` with its
  fallback in the compose file (`docker.md`). A non-`DOCKER_` key with no secret may carry a default in `.env.example`
  (`APP_NAME`, `HTTP_PORT`). A config interface holds no `Buffer`; an encryption root (`dto.md`) is exposed validated.
- An optional adapter (`AwsS3Service`, `AwsSESService`, `FirebaseService`) with unset credentials logs one `warn` in
  `onModuleInit` and stays uninitialised (`isInitialized()`): each method warns and returns an empty result, so a send
  is a no-op. Firebase set but broken (the key fails to normalise, `initializeApp` throws) fails boot. A third-party
  health indicator reports `down` with `'<Name> is not configured'` when unset; health routes answer 200.

## Logging

- Pino behind `Logger` via `LoggerModule.forRoot()`; `LoggerOptionService` builds options, `LoggerUtil` shapes and redacts.
- One `private readonly logger = new Logger(ClassName.name)` per class, never module-level, no `console.*` in `src/`;
  `error` is object-first (`this.logger.error(error, 'context')`, the reverse drops the stack), the rest message-first.
- `EnumLoggerLevel` is the Pino level (`logger.level` config); `EnumLoggerSeverity` is the `severity` field
  `LoggerUtil.mapLevelToSeverity` (`:254`) writes. Pick by who must act: `fatal` process cannot continue, `error`
  someone must look, `warn` degraded but handled, `info` a lifecycle fact, `debug` / `trace` detail.
- `LoggerSensitiveFields` (`logger.constant.ts:44`) is the one list of sensitive keys, and a new credential key goes on
  it; `LoggerUtil.redactValue` (`logger.util.ts:172`) masks them at any depth, a request log carries a masked `route`
  and never a body, and the `src/instrument.ts` hooks from `beforeSend` (`:315`) on scrub Sentry from the same constants.
- `SentryService` (`src/common/sentry/services/sentry.service.ts`: `captureException`, `captureMessage`, `log`,
  `withScope`) is the one way to report. Callers: the `APP_FILTER` chain by `httpStatus`, `QueueProcessorBase.onFailed`
  once when fatal, and a domain reporting an operator fault the client receives as a non-5xx (`AuthTwoFactorDomain`).
  No other service reports, and nothing logs-and-rethrows: filters and the queue base own the single failure log.

## Cache

- `RedisCacheModule.forRoot()` provides the shared Keyv client on Redis `db:0` (`throwOnErrors: true`,
  `src/common/redis/redis.module.ts:28`); `CacheMainModule.forRoot()` wires `@nestjs/cache-manager` on it.
- A module's cache reads and writes live in `caches/<module>[.<concern>].cache.ts`, provided by the domain module,
  holding the cache manager and its config `keyPattern`. A util never touches the cache.
- A cache uses the cache manager; a command it lacks (conditional `SET ... XX`, key-pattern `SCAN`) runs on the
  `RedisClientCachedProvider` store client, as `SessionCache.updateLogin` and `deleteLoginsByUser` do (`security.md`).
- A cached route is `@Response(path, { cache: true | { key, ttl } })`, which mounts `ResponseCacheInterceptor`
  inside `ResponseInterceptor`; the raw return is stored, so the schema declares only JSON-safe shapes (no
  `z.date()`, `Map`, `Set`). The default TTL is `redis.cache.ttlInMs`; a per-route `ttl` is its own `InMs` key.
  Never cache a response that varies by caller without the caller in the key, or one carrying a credential.
- A read that fails falls through to the database; a cache entry is never a lock or an invariant. A write fails the
  request when the entry is the authority (session write on login and refresh rotation, the two-factor challenge) or
  when a stale entry keeps a revoked credential working (API key delete after the database write); it is caught and
  logged where the entry expires on its own (session purges, challenge and lock clears, read-through writes). A
  write that makes a cached read stale invalidates it in the same operation.
