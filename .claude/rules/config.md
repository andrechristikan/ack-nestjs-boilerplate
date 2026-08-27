# Config

Detail in `docs/configuration.md`, `docs/environment.md`, and `docs/vault.md`. This file is the
rule set.

## Shape

Every `src/configs/*.config.ts` exports a TypeScript interface alongside its `registerAs`, and
`src/configs/index.ts` is the barrel `CommonModule` loads. `ConfigModule.forRoot` runs with
`isGlobal: true`, `cache: true`, and `envFilePath: ['.env', '.env.<NODE_ENV>']`.

## Reading config

- Read through `ConfigService.get('namespace.key')`. **Never `process.env` directly** in
  feature code. The one sanctioned exception is a decorator factory, where DI is not available
  at decoration time (`@QueueProcessor`'s worker name) — and that exception is already taken;
  do not extend it.
- A new env var needs FOUR edits: the config file, its interface, `.env.example`, and
  `docs/environment.md`.

## A config-worthy value lives in a config file, not inline

A TTL, a retry or backoff count, a memory or size threshold, a rollout percent, a CORS max-age,
a cron pattern, a rate limit, or a max-attempts budget hardcoded in a service, util,
controller, guard, or module wiring is config in the wrong place.

**A bare `const` is not an escape hatch** — promote it unless it is a genuinely fixed,
single-source-of-truth invariant with no env knob today.

## Time is milliseconds — no exceptions (HARD)

Config has exactly one time unit.

- Field suffix is `InMs`.
- Value is `ms('<string>')` with a string literal — `ms('182d')`, `ms('30s')`.
- **Never** a raw number (`30`), never inline arithmetic (`5 * 60 * 1000`, `30 * 60`), never a
  unit in a trailing comment, and never an `InSeconds` / `InMinutes` / `InDay` field.

**The conversion lives in the CONSUMER, not the config.** Where a third-party package wants
another unit, convert at the call site: `Math.floor(x / 1000)` for seconds (jsonwebtoken
`expiresIn`, AWS presign, otplib TOTP period), `x / ms('1d')` for a days count. Where the
package already takes ms (cache-manager / Keyv TTL, BullMQ `backoff.delay`), pass the value
straight through. **A `/1000` inside a config file is the defect** — move it out.

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
