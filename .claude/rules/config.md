---
paths:
    - 'src/configs/**'
    - '.env.example'
    - 'src/app/dtos/app.env.dto.ts'
    - 'src/main.ts'
    - 'src/configure.ts'
    - 'src/swagger.ts'
    - 'src/instrument.ts'
    - 'src/common/common.module.ts'
    - 'src/queues/decorators/queue.decorator.ts'
    - 'src/common/logger/**'
    - 'src/common/sentry/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
    - 'src/common/aws/**'
    - 'src/common/firebase/**'
    - 'src/modules/health/indicators/**'
    - 'src/modules/*/caches/**'
---

# Config, logging, cache

- `src/configs/<kebab>.config.ts` exports `IConfig<Namespace>` and default-exports `registerAs('<camelNamespace>', ...)`, barrelled by `src/configs/index.ts` as `<Namespace>Config` for `ConfigModule.forRoot` (`common.module.ts`: `envFilePath: ['.env']`, `validationSchema: AppEnvSchema`).
- `AppEnvSchema` (`dto.md`), the one validation source, declares every key a config reads. A new env var is the config file and interface, that key, and `.env.example`.
- The factory, not module scope, reads `process.env` and parses no schema: required `process.env.X!`, boolean `process.env.X === 'true'`, number `Number(process.env.X!)`, enum or `ms.StringValue` narrowed by `as`, optional `process.env.X === '' ? null : (process.env.X ?? null)` at each read, no helper: the one `code-style.md` copy-paste exception.
- Only the `code-style.md` environment boundary reads `process.env`. `main.ts` sets `TZ` (`app.timezone`) and overwrites the run surface's `NODE_ENV` with `app.env`.
- `src/instrument.ts`, imported first by `main.ts`, loads `dotenv/config` and calls `appConfigFunction()` and `loggerConfigFunction()` on unvalidated env before Nest; everything else reads `ConfigService.get<T>('namespace.key')`, `T` named, once into a `private readonly` field in the constructor; a module `useFactory`, a queue options factory, `main.ts`, `configure.ts`, and `swagger.ts` read where they build.
- A TTL, retry or backoff count, size threshold, chunk size, rollout percent, sample rate, cron pattern, rate limit, or max-attempts budget is a camelCase config key, never a literal or bare `const` outside `src/configs/`.
- A duration key is named for its consumer's unit (`InMs`, `InSeconds`, `InDays`) and built from `ms('<string>')`, divided inside the config file (`ms('7d') / 1000`); no raw number, no call-site arithmetic. A duration computed at request time has no key. A size key is `InBytes` from `bytes('<string>')`.
- A URL is a `*Pattern` key with `{placeholder}` segments: an emitted URL is full with its own host key, a path a fragment.
- `request.throttle.default.limit` stays above `request.throttle.user.limit`, or the per-IP default fires first.
- A header name, CLS store key, metadata key, or wire label is a constant or enum, never config; a header is `<Module>[<Concern>]HeaderName`, in `src/common/` when the kit reads it. `request.config.ts` builds the CORS header lists from those constants, the one config importing from `@modules`.
- A credential comes from the environment (deployed: `pnpm vault:pull`) with no literal default: empty in `.env.example`, where a non-secret, non-`DOCKER_` key may carry one (`APP_NAME`, `HTTP_PORT`); only a `DOCKER_` key has a compose fallback (`docker.md`). A config interface holds no `Buffer`.
- An optional adapter (`AwsS3Service`, `AwsSESService`, `FirebaseService`) with unset credentials logs one `warn` in `onModuleInit` and stays uninitialised (`isInitialized()`): each method warns and returns an empty result (a send is a no-op). Firebase set but broken fails boot. A third-party health indicator reports `down` with `'<Name> is not configured'` when unset; health routes answer 200.

## Logging

- Pino behind `Logger` via `LoggerModule.forRoot()`; `LoggerOptionService` builds options, `LoggerUtil` shapes and redacts.
- The pino `mixin` reads `RequestIdStoreKey` and `RequestCorrelationIdStoreKey` through `RequestStoreService` and logs both ids top-level, `null` outside a request; it never reads a header or `req.id`. Each id is its inbound header (`x-request-id`, `x-correlation-id`) when it matches `RequestIdRegex`, otherwise a new UUID v7.
- One `private readonly logger = new Logger(ClassName.name)` per class, never module-level; `error` is object-first (`this.logger.error(error, 'context')`, the reverse drops the stack), the rest message-first.
- `EnumLoggerLevel` is the Pino level (`logger.level` config); `EnumLoggerSeverity` is the `severity` field `LoggerUtil.mapLevelToSeverity` (`logger.util.ts:237`) writes. Pick by who must act: `fatal` process cannot continue, `error` someone must look, `warn` degraded but handled, `info` a lifecycle fact, `debug`/`trace` detail.
- `LoggerSensitiveFields` (`logger.constant.ts:30`) is the one list of sensitive keys, new credential keys included; `LoggerUtil.redactValue` (`logger.util.ts:155`) masks them at any depth, a request log carries a masked `route` and never a body, and the `src/instrument.ts` hooks from `beforeSend` (`:315`) on scrub Sentry from the same constants.
- `SentryService` is the one way to report. Callers: the `APP_FILTER` chain by `httpStatus`, `QueueProcessorBase.onFailed` once when fatal, and a domain reporting an operator fault the client receives as a non-5xx (`AuthTwoFactorDomain`). Nothing logs-and-rethrows: filters and the queue base own the single failure log.

## Cache

- `RedisCacheModule.forRoot()` provides the shared Keyv client on Redis `db:0` (`throwOnErrors: true`, `src/common/redis/redis.module.ts:28`), `CacheMainModule.forRoot()` wires `@nestjs/cache-manager` on it, and a module's `caches/` class holds the cache manager and its config `keyPattern` for every read and write.
- A cache uses the cache manager; a command it lacks (conditional `SET ... XX`, key-pattern `SCAN`) runs on the `RedisClientCachedProvider` store client, as `SessionCache.updateLogin` and `deleteLoginsByUser` do.
- A cached route is `@Response(path, { cache: true | { key, ttl } })`, which mounts `ResponseCacheInterceptor` inside `ResponseInterceptor`; the raw return is stored, so the schema declares only JSON-safe shapes (no `z.date()`, `Map`, `Set`). The default TTL is `redis.cache.ttlInMs`; a per-route `ttl` is its own `InMs` key. Never cache a caller-varying response without the caller in the key, or one carrying a credential.
- A failed read falls through to the database; a cache entry is never an invariant, and the two-factor lock is the one lock. A write fails the request when the entry is the authority (session write on login and refresh rotation, two-factor challenge and lock) or a stale entry keeps a revoked credential working (API key delete after the database write); it is caught and logged where the entry expires on its own (session purges, challenge and lock clears, read-through writes). A write that makes a cached read stale invalidates it in the same operation.
