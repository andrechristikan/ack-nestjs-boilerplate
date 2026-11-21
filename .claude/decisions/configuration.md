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

### An optional integration left unset boots as a no-op

Rule: `config.md`, Files.

- Failing the boot when S3, SES, or Firebase is unset: a project built from the boilerplate could not start without accounts it may never use.

### A request whose purpose is an email answers 501 while SES is unset

Rule: `notify.md`; `exceptions.md`, The hierarchy.

- Refusing every request that may send an email in any branch: about thirty use cases, the logins among them, would need SES, because any re-authenticated action can add the `loginLocked` email.
- One check in `NotificationQueue.notify`: it runs inside the caller's transaction, so it breaks fail-fast validation and rolls back a failed-attempt count.
- A route decorator with a guard: the service assert per use case matches how S3 is refused, so every optional integration is refused the same way.
- Answering success and skipping the send: the caller is told an email went out that never will, and an admin-created account's temporary password reaches nobody.

### An unset optional integration answers 501, reported once per window

Rule: `exceptions.md`, The hierarchy.

- 404: the route exists, and a client cannot tell the answer from a wrong address when the deployment lacks the capability.
- 503: it reads as a temporary outage, so clients and load balancers retry a request that fails until the configuration changes.
- 409 or 422: the request is valid, and the server is the side not ready.
- Keeping 501 out of Sentry: an email-purpose route called with SES unset in production is an operator fault worth one report.
- A report per request: it floods Sentry.

### Feature flags are seeded, with keys the code names

Rule: `feature-flag.md`, Restrictions.

- Admin create and delete of flags: every key is an enum member the code reads, so a flag created at runtime gates nothing and a deleted one leaves its guard with no row to read.

### `DATABASE_DEBUG_ENABLED` is refused in production

Rule: `config.md`.

- Refusing `LOGGER_LEVEL=debug` and `LOGGER_PRETTY_ENABLED` as well: the level and the format are operating choices, and neither writes query content.
