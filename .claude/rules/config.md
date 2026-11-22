---
paths:
    - 'src/configs/**'
    - '.env.example'
    - 'src/app/dtos/app.env.dto.ts'
    - 'src/main.ts'
    - 'src/migration.ts'
    - 'src/bootstrap.ts'
    - 'src/configure.ts'
    - 'src/swagger.ts'
    - 'src/instrument.ts'
    - 'src/common/common.module.ts'
    - 'src/common/logger/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
    - 'src/common/aws/**'
    - 'src/common/firebase/**'
    - 'src/modules/health/indicators/**'
    - 'src/modules/health/use-cases/**'
    - 'src/modules/*/caches/**'
---

# Config

## Layers

A value has one layer:

- Environment: a secret, or a value that differs between deployments of the same code (a URL, a credential, a log level, a Sentry sample rate).
- Config: a value the code decides, the same in every deployment, that an adopter tunes: a TTL, limit, size, cron, pattern, timeout, a token lifetime, the default language, the timezone, URL versioning.
- Constant: a value whose change breaks a contract (a header name, a metadata or store key, a select, a format regex, a value a library or a specification fixes), and any value read at decoration time, at schema-definition time, or before Nest exists (`PaginationDefaultMaxPerPage`, `FileSizeInBytes`, `AwsSESRateLimitPerDuration`, `AppBootstrapSentryFlushTimeoutInMs`). A bound a schema or a decorator reads stays a constant there: it does not move to config with a runtime check, and neither a schema nor a decorator imports a config function. A length an adopter tunes is a config key the service checks, under a looser schema literal (`dto.md`, Shape).
- Feature flag: a product feature an operator switches at runtime, its boolean sub-switches, its rollout, and that feature's numeric policy (`feature-flag.md`, Metadata).

## Names

- An environment key is its config path in `UPPER_SNAKE_CASE`, segments and camelCase words joined by `_`: `mfa.totp.encryptionSecret` is `MFA_TOTP_ENCRYPTION_SECRET`, and Sentry has its own `sentry` namespace for `SENTRY_DSN`. A key has one owning path; another config may derive from it (`doc.name` from `APP_NAME`). The config factory spec asserts it for every `AppEnvSchema` key (`testing.md`).
- One vocabulary in both layers: a boolean ends in `enabled`; a list is plural, one key for every accepted value (`AUTH_SOCIAL_APPLE_CLIENT_IDS`); a lifetime is `expiresIn<Unit>`; a count of tries is `maxAttempts`; a placeholder string ends in `Pattern`; an e-mail address ends in `Address`; a root secret is `Secret`; AWS credentials are `accessKeyId` and `secretAccessKey`; a `Url` key holds a full URL, read as given, never a bare host (`AWS_S3_PUBLIC_CDN_URL`).

## Files

- `src/configs/<kebab>.config.ts` exports `IConfig<Namespace>` and default-exports `registerAs('<camelNamespace>', ...)`, barrelled by `src/configs/index.ts` as `<Namespace>Config` for `ConfigModule.forRoot` (`common.module.ts`, `envFilePath: ['.env']`).
- `AppEnvSchema` (`dto.md`) declares every key a config reads. A new env var is the config file and interface, that key, and `.env.example`, which holds `KEY=value` lines and blank lines only: no comment.
- The factory, not module scope, reads `process.env` and parses no schema: required `process.env.X!`, boolean `process.env.X === 'true'`, number `Number(process.env.X!)`, enum narrowed by `as`, optional `process.env.X === '' ? null : (process.env.X ?? null)` at each read, no helper.
- A lint-clean `process.env` read outside `src/configs/`, `src/bootstrap.ts`, and `src/instrument.ts` (`Reflect.get(process, 'env')`) is a defect.
- `src/main.ts` and `src/migration.ts` hold two statements: the static `import '@instrument'`, then a dynamic `import('@bootstrap')`. No command carries `--import`, and neither entry imports anything else statically.
- `src/instrument.ts` loads `dotenv/config` and calls the `app`, `logger`, and `sentry` config functions on unvalidated env before Nest; everything else reads `ConfigService` (`injectable.md`, Config).
- A duration key is named for its consumer's unit (`InMs`, `InSeconds`, `InDays`) and built from `ms('<string>')`, divided inside the config file (`ms('7d') / 1000`); no raw number, no call-site arithmetic. A duration computed at request time has no key. A size key is `InBytes` from `bytes('<string>')`.
- A URL built in config with `{placeholder}` segments is a `*Pattern` key: an emitted URL is full with its own host key, a path a fragment.
- `request.throttle.default.limit` stays above `request.throttle.user.limit`, or the per-IP default fires first.
- A header name, CLS store key, metadata key, or wire label is a constant or enum, never config; so is a value a library fixes, in the kit that wraps the library (`FileSniffSizeInBytes`); a header is `<Module>[<Concern>]HeaderName`, in `src/common/` when the kit reads it. `request.config.ts` builds the CORS header lists from those constants, the one config importing from `@modules`. `REQUEST_CORS_ALLOWED_ORIGINS` lists origins in production: `AppEnvSchema` refuses a `*` entry there and keeps it elsewhere. It refuses `DATABASE_DEBUG_ENABLED=true` in production the same way, requires `APP_HTTP_TRUSTED_PROXIES` there, and refuses no `LOGGER_LEVEL` or `LOGGER_PRETTY_ENABLED` value.
- A credential comes from the environment (deployed: `pnpm vault:pull`) with no literal default. In `.env.example` a required secret and an optional integration key carry a `<camelCaseShape>` placeholder (`<base64url64Characters>`, `<keyId>`, `<awsAccessKeyId>`), and a non-secret key carries a real value (`APP_NAME`, `APP_HTTP_PORT`, `MFA_TOTP_ISSUER`); `generate-secret`, creating the app env file from it, writes a `<...>` value empty, so an optional integration stays off until it is filled; a `DOCKER_` key is Compose's, not application config (`docker.md`). A config interface holds no `Buffer`.
- An optional adapter (`AwsS3Service`, `AwsSESService`, `FirebaseService`) with unset credentials logs one `warn` in `onModuleInit` and stays uninitialised (`isInitialized()`): each method warns and returns an empty result. Firebase set but broken fails boot. A third-party health indicator reports `down` with `'<Name> is not configured'` when unset; `/aws`, `/third-party`, and `/instance` answer 200.
- `/system/health/database` answers 503 while PostgreSQL, the cache Redis, or the queue is down, with the body its 200 carries. `HealthRedisIndicator` reports `down` while Redis is unreachable.
