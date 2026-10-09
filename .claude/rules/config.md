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
    - 'src/common/cache/**'
    - 'src/common/redis/**'
    - 'src/common/aws/**'
    - 'src/common/firebase/**'
    - 'src/modules/health/indicators/**'
    - 'src/modules/*/caches/**'
---

# Config

- `src/configs/<kebab>.config.ts` exports `IConfig<Namespace>` and default-exports `registerAs('<camelNamespace>', ...)`, barrelled by `src/configs/index.ts` as `<Namespace>Config` for `ConfigModule.forRoot` (`common.module.ts`, `envFilePath: ['.env']`).
- `AppEnvSchema` (`dto.md`) declares every key a config reads. A new env var is the config file and interface, that key, and `.env.example`.
- The factory, not module scope, reads `process.env` and parses no schema: required `process.env.X!`, boolean `process.env.X === 'true'`, number `Number(process.env.X!)`, enum or `ms.StringValue` narrowed by `as`, optional `process.env.X === '' ? null : (process.env.X ?? null)` at each read, no helper: the one `code-style.md` copy-paste exception.
- Only the `code-style.md` environment boundary reads `process.env`.
- `src/instrument.ts`, imported first by `main.ts`, loads `dotenv/config` and calls `appConfigFunction()` and `loggerConfigFunction()` on unvalidated env before Nest; everything else reads `ConfigService.get<T>('namespace.key')`, `T` named, once into a `private readonly` constructor field; a module `useFactory`, a queue options factory, `main.ts`, `configure.ts`, and `swagger.ts` read where they build.
- A TTL, retry or backoff count, size threshold, chunk size, rollout percent, sample rate, cron pattern, rate limit, or max-attempts budget is a camelCase config key, never a literal or bare `const` outside `src/configs/`.
- A duration key is named for its consumer's unit (`InMs`, `InSeconds`, `InDays`) and built from `ms('<string>')`, divided inside the config file (`ms('7d') / 1000`); no raw number, no call-site arithmetic. A duration computed at request time has no key. A size key is `InBytes` from `bytes('<string>')`.
- A URL is a `*Pattern` key with `{placeholder}` segments: an emitted URL is full with its own host key, a path a fragment.
- `request.throttle.default.limit` stays above `request.throttle.user.limit`, or the per-IP default fires first.
- A header name, CLS store key, metadata key, or wire label is a constant or enum, never config; a header is `<Module>[<Concern>]HeaderName`, in `src/common/` when the kit reads it. `request.config.ts` builds the CORS header lists from those constants, the one config importing from `@modules`.
- A credential comes from the environment (deployed: `pnpm vault:pull`) with no literal default: empty in `.env.example`, where a non-secret, non-`DOCKER_` key may carry one (`APP_NAME`, `HTTP_PORT`); only a `DOCKER_` key has a compose fallback (`docker.md`). A config interface holds no `Buffer`.
- An optional adapter (`AwsS3Service`, `AwsSESService`, `FirebaseService`) with unset credentials logs one `warn` in `onModuleInit` and stays uninitialised (`isInitialized()`): each method warns and returns an empty result. Firebase set but broken fails boot. A third-party health indicator reports `down` with `'<Name> is not configured'` when unset; health routes answer 200.
