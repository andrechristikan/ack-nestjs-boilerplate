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
- `AppEnvSchema` (`dto.md`) declares every key a config reads. A new env var is the config file and interface, that key, and `.env.example`, which holds `KEY=value` lines and blank lines only: no comment.
- The factory, not module scope, reads `process.env` and parses no schema: required `process.env.X!`, boolean `process.env.X === 'true'`, number `Number(process.env.X!)`, enum or `ms.StringValue` narrowed by `as`, optional `process.env.X === '' ? null : (process.env.X ?? null)` at each read, no helper: the one `code-style.md` copy-paste exception.
- A lint-clean `process.env` read outside `src/configs/`, `src/main.ts`, and `src/instrument.ts` (`Reflect.get(process, 'env')`) is a defect.
- `src/instrument.ts`, imported first by `main.ts`, loads `dotenv/config` and calls `appConfigFunction()` and `loggerConfigFunction()` on unvalidated env before Nest; everything else reads `ConfigService` (`injectable.md`, Config).
- A duration key is named for its consumer's unit (`InMs`, `InSeconds`, `InDays`) and built from `ms('<string>')`, divided inside the config file (`ms('7d') / 1000`); no raw number, no call-site arithmetic. A duration computed at request time has no key. A size key is `InBytes` from `bytes('<string>')`.
- A URL is a `*Pattern` key with `{placeholder}` segments: an emitted URL is full with its own host key, a path a fragment.
- `request.throttle.default.limit` stays above `request.throttle.user.limit`, or the per-IP default fires first.
- A header name, CLS store key, metadata key, or wire label is a constant or enum, never config; a header is `<Module>[<Concern>]HeaderName`, in `src/common/` when the kit reads it. `request.config.ts` builds the CORS header lists from those constants, the one config importing from `@modules`. `CORS_ALLOWED_ORIGIN` lists origins in production: `AppEnvSchema` refuses a `*` entry there and keeps it elsewhere.
- A credential comes from the environment (deployed: `pnpm vault:pull`) with no literal default: empty in `.env.example`, where a non-secret key may carry one (`APP_NAME`, `HTTP_PORT`); a `DOCKER_` key is Compose's, not application config (`docker.md`). A config interface holds no `Buffer`.
- An optional adapter (`AwsS3Service`, `AwsSESService`, `FirebaseService`) with unset credentials logs one `warn` in `onModuleInit` and stays uninitialised (`isInitialized()`): each method warns and returns an empty result. Firebase set but broken fails boot. A third-party health indicator reports `down` with `'<Name> is not configured'` when unset; health routes answer 200. `HealthRedisIndicator` reports `down` while Redis is unreachable.
