# Configuration decisions

## Environment and config

### An environment key is its config path

Rule: `config.md`, Names.

- The same words under a free prefix (`CACHE_REDIS_URL` for `redis.cache.url`): no spec can check it, and a reader still searches for the file that reads the key.

### A value read at decoration or schema-definition time is a constant

Rule: `config.md`, Layers.

- Moving a bound the schema reads into config, with the exact check in a service: the schema loses its bound and the OpenAPI document its number.
- A config function imported at module scope: config would be read outside `ConfigService` in every schema and decorator file.

### A feature's numeric policy lives in flag metadata, bounded by zod

Rule: `feature-flag.md`, Metadata.

- Config only: an operator changes a limit, an attempt budget, or a lock duration only through a deploy.
- A config key as the fallback for a missing number: one value would have two sources.
- A bound constant checked in the service: the metadata keys are unique across flags, so the request schema holds every bound.
- A reader that clamps: the stored value and the applied one differ, and the admin is not told.

### Sentry has its own namespace, with sample rates from the environment

Rule: `config.md`, Layers and Names.

- Paired `...SampleRate` and `...SampleRateProduction` config keys: a value that differs per deployment is an environment value written twice.
- Sentry under `logger`: `SENTRY_DSN` would not equal its config path.

### A CDN key holds a full URL

Rule: `config.md`, Names.

- A bare host with the scheme prepended in config: a pasted CloudFront URL becomes `https://https://…`, and the key cannot be validated as a URL.

### JWT lifetimes, the default language, the timezone, and URL versioning are config

Rule: `config.md`, Layers.

- Environment keys: each value is the same in every deployment, and every other duration is a config literal.

### Sentry loads through a deferred entry

Rule: `config.md`, Files.

- `node --import ./dist/instrument.js` on every command: each start script, each seed script, and the image `CMD` repeat the flag.
- A static `import '@instrument'` above the application imports: in ESM the whole static graph loads before the instrument module runs, so the instrumented libraries are loaded unpatched.
- One bootstrap file per entry: two files would repeat the failure handler.

### `DATABASE_DEBUG_ENABLED` is refused in production

Rule: `config.md`.

- Refusing `LOGGER_LEVEL=debug` and `LOGGER_PRETTY_ENABLED` as well: the level and the format are operating choices, and neither writes query content.
