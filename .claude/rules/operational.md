# Code style & operational rules

## NestJS idiomatic — no hand-rolled substitutes

Use the framework the Nest way: modules, DI, providers, guards, pipes, interceptors, decorators, lifecycle hooks. If Nest already provides it, a hand-rolled version is a defect regardless of how well it works. No service locator, no manual instantiation of an injectable, no bare `@UseGuards` where a `@<Feature>Protected()` decorator is the convention.

## Service interface required; repository interface forbidden (HARD)

**Every feature / kit business service MUST have a header interface** at `interfaces/<feature>[.<name>].service.interface.ts`, named `I<Feature>[<Name>]Service`, and the class `implements` it. Primary services use the short form (`user.service.interface.ts` / `IUserService`); a second service in the same module adds the concern (`notification.push.processor.service.interface.ts` / `INotificationPushProcessorService`). Injection stays by **class** (`UserService`) unless a real DI token seam exists — the interface is still required.

**A repository MUST NOT get a header interface.** Inject the repository class. One implementor, one Prisma surface — an `I<Feature>Repository` beside it is ceremony. Do not confuse that ban with data-shape ports such as `IPaginationRepository` in `pagination.interface.ts` — those describe a duck type, not a feature repository.

An interface still earns a place for **data shapes** (`IUser`, payloads, option bags) and for a **real multi-implementor seam** (rare). Framework lifecycle contracts (`OnModuleInit`, `CanActivate`, …) stay required. Pure Nest plumbing that is not a business service (`DatabaseService`, `LoggerOptionService`, framework storage adapters) does not need an `I*Service`.

**The test for repositories and data shapes:** if deleting the interface leaves every call site compiling unchanged **and** it is not a required `I*Service`, delete it.

> **Live state:** every feature service already `implements I*Service`. Keep that. Do not add `I*Repository`. Do not remove a service interface as a “cleanup” side effect of an unrelated change.

## Comments — `rules/authoring.md` owns this

Do not invent a second comment policy here. **No JSDoc on internal services / repositories / controllers** (types, names, and tests are the contract). Line notes are `// @note: <reason>` only, VERY RARE, consequence-shaped — see `rules/authoring.md` → "Comments". Preserve an existing rule-compliant comment during a refactor; delete it only when its subject is gone.

## Logging

- `private readonly logger = new Logger(ClassName.name);`
- **Errors are object-first:** `logger.error(error, 'Failed to connect')`. `debug` / `log` / `warn` are message-first.
- Pino redacts known secret keys automatically. Never rely on it — do not log a secret in the first place.

## Config

- Every `src/configs/*.config.ts` exports a TypeScript interface alongside its `registerAs`. Read `docs/configuration.md` and `docs/environment.md` before adding a key.
- Read config through `ConfigService.get('namespace.key')`. **Never `process.env` directly** in feature code. The one sanctioned exception is a decorator factory, where DI is not available at decoration time (`@QueueProcessor`'s worker name) — and that exception is already taken; do not extend it.
- A new env var needs the config file, the interface, `.env.example`, and `docs/environment.md`.
- **A config-worthy value lives in a config file, not inline.** A TTL, a retry/backoff count, a memory or size threshold, a rollout percent, a CORS max-age, or a cron pattern hardcoded in a service, util, controller, guard, or module wiring is config in the wrong place. A bare `const` is not an escape hatch — promote it unless it is a genuinely fixed, single-source-of-truth invariant with no env knob today (YAGNI).
- **Every time value in config is milliseconds — no exceptions.** Field suffix is `InMs`, value is `ms('<string>')` with a string literal (`ms('182d')`, `ms('30s')`) — never a raw number (`30`), never inline arithmetic (`5 * 60 * 1000`, `30 * 60`), never a unit in a trailing comment, and never an `InSeconds` / `InMinutes` / `InDay` field. Config has exactly one time unit. **The conversion lives in the CONSUMER, not the config.** Where a third-party package wants another unit, convert at the call site: `Math.floor(x / 1000)` for seconds (jsonwebtoken `expiresIn`, AWS presign, otplib TOTP period), `x / ms('1d')` for a days count. Where the package already takes ms (cache-manager / Keyv TTL, BullMQ `backoff.delay`), pass the value straight through. A `/1000` inside a config file is the defect — move it out.
- **Size in config uses the smallest unit and `bytes()`.** Field suffix is `InBytes`, value is `bytes('500kb')` — never a raw byte count and never `n * 1024 * 1024`.

## Cache

Redis `db:0` is the cache, `db:1` is BullMQ. Both go through the modules that already own the connection — **never open a second Redis connection**. Cache a response with `@Response('key', { cache: … })`; see `docs/cache.md`.

## Documentation prose (`docs/*.md`)

- **No em-dash (`—`) in documentation prose.** Use a period, comma, semicolon, colon, or parentheses. Plain hyphens in compound words (`dev-mode`, `in-memory`) are fine; do not overuse them. The one exception is an existing structured list whose every entry already uses `—` as a separator: match it rather than breaking the pattern on one line.
- Simple, firm, and pointed. Bullets first, prose where prose is needed. Keep the existing section structure intact rather than reorganizing around a small correction.
