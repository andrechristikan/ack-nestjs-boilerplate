# Config

Detail in `docs/configuration.md`, `docs/environment.md`, and `docs/vault.md`. This file is the
rule set.

## Shape

Every `src/configs/*.config.ts` exports a TypeScript interface alongside its `registerAs`, and
`src/configs/index.ts` is the barrel `CommonModule` loads. `ConfigModule.forRoot` runs with
`isGlobal: true`, `cache: true`, `envFilePath: ['.env', '.env.<NODE_ENV>']`, and
`validationSchema: AppEnvSchema` — the zod schema in `src/app/dtos/app.env.dto.ts` that every
env var is validated against at boot (`rules/validation.md`).

## Reading config

- Read through `ConfigService.get('namespace.key')`. **Never `process.env` directly** in
  feature code. The one sanctioned exception is a decorator factory, where DI is not available
  at decoration time (`@QueueProcessor`'s worker name) — and that exception is already taken;
  do not extend it.
- A new env var needs FIVE edits: the config file, its interface, `AppEnvSchema`,
  `.env.example`, and `docs/environment.md`.

## A config-worthy value lives in a config file, not inline

A TTL, a retry or backoff count, a memory or size threshold, a rollout percent, a CORS max-age,
a cron pattern, a rate limit, or a max-attempts budget hardcoded in a service, util,
controller, guard, or module wiring is config in the wrong place.

**A bare `const` is not an escape hatch** — promote it unless it is a genuinely fixed,
single-source-of-truth invariant with no env knob today.

## Time is the consumer's unit — no exceptions (HARD)

A duration config key is named for the unit its CONSUMER takes, and holds the value already in
that unit.

- Field suffix names that unit — `InMs`, `InSeconds`, `InDays`.
- Value is built from `ms('<string>')` with a string literal, divided to the target unit inside
  the config file: `ms('30s')` where the consumer takes milliseconds, `ms('7d') / 1000` where it
  takes seconds, `ms('90d') / ms('1d')` where it takes days. The `ms()` literal is what keeps
  `604800` readable as seven days.
- **Never** a raw number (`30`), never bare inline arithmetic (`5 * 60 * 1000`, `30 * 60`), and
  never a unit stated only in a trailing comment.

**The conversion lives in the CONFIG, not the consumer.** cache-manager / Keyv TTL and BullMQ
`backoff.delay` take milliseconds; jsonwebtoken `expiresIn`, BullMQ `KeepJobs.age` and the otplib
TOTP period take seconds; an S3 lifecycle `DaysAfterInitiation` takes days. Each key names what
its own consumer takes, and the call site passes the value straight through. **A
`Math.floor(x / 1000)` or an `x / ms('1d')` in a service, util, guard, interceptor or module
wiring is the defect** — move the division into the config file and name the key for the unit it
holds, because a division living in a service hides the unit from the one file that declares it.

**This governs a CONFIG value only.** A duration computed at request time — a
`HelperDateService.diff` result, a remainder a Redis script returned — has no config key to
name, so converting it where it is consumed is correct and stays
(`auth.jwt.service.ts` refresh-token remainder, `request.throttler.service.ts` retry-after).

## Size is bytes

Field suffix is `InBytes`, value is `bytes('500kb')`. Never a raw byte count and never
`n * 1024 * 1024`.

## Values that must move together

- **`request.throttle.default.limit` must stay ABOVE `request.throttle.user.limit`.** The
  `default` limiter is per-IP and always on, so if it is the lower of the two it rejects first
  on every single-client request and the per-user limiter never fires at all. Nothing detects
  the inversion — no test, no type, no boot error — the per-user limiter just stops existing.
  Retune both together and keep the gap.
- **A custom `x-*` request header name lives in config, and its CORS registration is a second
  edit.** The name goes in its owning config (`workspace.headerName`,
  `featureFlag.anonymous.headerName`); the raw string is repeated exactly once more, in
  `request.config.ts` → `cors.allowedHeader`, because that list is a flat transport allow-list.
  Miss it and the browser preflight rejects the header while curl still works
  (`rules/http.md`).

## Secrets

A credential never has a literal default in a config file. It comes from the environment, and
in a deployed environment from Vault via `pnpm vault:pull` (`docs/vault.md`). A config default
that happens to be a working secret is a leaked secret (`rules/security.md`).
