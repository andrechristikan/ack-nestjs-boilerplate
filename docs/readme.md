# Documentation

## Accuracy

Each document matches the current implementation. If something is wrong, open an issue or a pull request.

## Standards & References

Specs, RFCs, and practices this codebase is built against:

### Twelve-Factor App

This project aligns with the [Twelve-Factor App][ref-12factor] methodology.

| Factor | How it applies |
|---|---|
| Codebase | Single repo, one codebase tracked in Git, multiple deploys via env |
| Dependencies | All dependencies declared in `package.json`, enforced with PNPM lockfile |
| Config | All configuration via environment variables, validated at startup via `AppEnvSchema` |
| Backing Services | MongoDB, Redis, AWS S3/SES, Firebase; treated as attached resources via env config |
| Build, Release, Run | Build (`pnpm build`) is strictly separated from runtime |
| Processes | Stateless app processes; session and cache state stored in Redis, not in-memory |
| Port Binding | App self-contained via NestJS HTTP server, port exposed via `HTTP_PORT` env |
| Concurrency | Horizontal scaling supported; stateless processes, shared Redis for sessions |
| Disposability | Fast startup, graceful shutdown; no sticky sessions or local state |
| Dev/Prod Parity | Same stack (Docker Compose) for local dev and production |
| Logs | Logs as event streams via Pino to stdout, and optionally to files under `/logs` when `LOGGER_INTO_FILE=true` |
| Admin Processes | One-off tasks via dedicated migration and seed scripts (`pnpm migration:seed`) |

### Security Standards

| Concern | Standard |
|---|---|
| JWT Access Token | ES256; ECDSA + SHA-256 ([RFC 7518][ref-rfc-7518], [RFC 7519][ref-rfc-7519]) |
| JWT Refresh Token | ES512; ECDSA + SHA-512 ([RFC 7518][ref-rfc-7518], [RFC 7519][ref-rfc-7519]) |
| Two-Factor Auth | TOTP; SHA-1, 6 digits, 30s period ([RFC 6238][ref-rfc-6238]) |
| Password Hashing | bcrypt; 12 salt rounds |
| Encryption | AES-256-GCM through `node:crypto`; per-payload key derived with HKDF-SHA-256 from a 48-byte root secret, a random 16-byte salt, and a purpose string; 12-byte IV, 16-byte tag, caller context bound as authenticated data. Stored 2FA secrets use `AUTH_TWO_FACTOR_ENCRYPTION_KEY`; notification job payloads use `APP_ENCRYPTION_SECRET_KEY` |
| Token Hashing | SHA-256 through `node:crypto` for stored tokens, backup codes, and API key hashes; compared with `timingSafeEqual` |
| Randomness | `node:crypto` (`randomInt`, `randomBytes`) for every generated code, token, and secret |
| HTTP Security Headers | [Helmet][ref-helmet] v8, non-documents profile; Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Cross-Origin-Resource-Policy, X-Download-Options, X-Permitted-Cross-Domain-Policies |
| CORS | Configurable allowlist with wildcard subdomain support, preflight max-age 24h |
| Rate Limiting | Redis-backed sliding window via [@nestjs/throttler][ref-throttler]; global 300 req / 60s per IP, plus opt-in 100 req / 60s per user and per-route tiers (5 / 20 / 60 req per 60s) |
| Authorization | [CASL][ref-casl]; fine-grained ability-based access control (subject + action) |
| API Key Auth | Machine-to-machine via `x-api-key` header |
| Sensitive Data | Redacted from logs and Sentry payloads by key (`LoggerSensitiveFields`: passwords, tokens, API keys, 2FA material, sealed notification fields, cookies) through the Pino `redact` option, `LoggerUtil`, and the `instrument.ts` scrubbers; URL paths masked |
| Threat Coverage | [OWASP Top 10][ref-owasp]; input validation, injection prevention, auth hardening |


## Table of Contents

### Getting Started
Install and configure the project.

1. [Installation][ref-doc-installation]; Set up the development environment step by step
2. [Environment][ref-doc-environment]; Configure all environment variables via `.env`
3. [Configuration][ref-doc-configuration]; Understand the Config Module and per-concern config files
4. [Project Structure][ref-doc-project-structure]; Modular layout and the repository design pattern

### Core

5. [Database][ref-doc-database]; Prisma + MongoDB replica set, transactions, and the Database Module
6. [Authentication][ref-doc-authentication]; JWT (ES256/ES512), session lifecycle, API key auth
7. [Authorization][ref-doc-authorization]; `UserProtected`, `RoleProtected`, `PolicyProtected`, `TermPolicyAcceptanceProtected`, `WorkspaceProtected`, `ProjectProtected`
8. [Device][ref-doc-device]; Device fingerprinting, `DeviceOwnership`, max 1 session per device
9. [Response][ref-doc-response]; Standardized response decorators, pagination response, file download
10. [Request Validation][ref-doc-request-validation]; `RequestSchemaValidationPipe`, zod request schemas, body and path validation
11. [Handling Error][ref-doc-handling-error]; Exception filters, standardized HTTP error responses, i18n errors
12. [Status Codes][ref-doc-status-codes]; Full catalog of application statusCode values by module
13. [Language Message][ref-doc-message]; i18n with `nestjs-i18n`, nested JSON message files in `src/languages/`
14. [Cache][ref-doc-cache]; Redis caching with shared `RedisCacheModule`, TTL strategy
15. [Queue][ref-doc-queue]; BullMQ background jobs, `QueueProcessorBase`, retry/backoff
16. [Logger][ref-doc-logger]; Pino logging, file rotation, sensitive data redaction, Sentry integration
17. [Security and Middleware][ref-doc-security-and-middleware]; HTTP middleware layer, headers, rate limiting

### Advanced

18. [Workspace][ref-doc-workspace]; Multi-workspace tenancy via `x-workspace-id`, membership roles, invites, join requests
19. [Project][ref-doc-project]; Workspace-scoped projects with `:projectId` in the path and their own member roles
20. [Pagination][ref-doc-pagination]; Offset-based, cursor-based pagination, advanced filtering
21. [Notification][ref-doc-notification]; Multi-channel notifications (email, push, inApp, silent) via BullMQ
22. [Email][ref-doc-email]; SES Handlebars templates, sync command, and send mapping
23. [Two Factor][ref-doc-two-factor]; TOTP 2FA with authenticator apps and backup codes
24. [Feature Flag][ref-doc-feature-flag]; Dynamic feature management and percentage rollouts
25. [Activity Log][ref-doc-activity-log]; Recording user activities staged by domains and flushed by `ActivityLogInterceptor`
26. [Analytic][ref-doc-analytic]; Live admin dashboard metrics, anomaly and fraud reports, current-workspace user metrics
27. [Term Policy][ref-doc-term-policy]; Legal agreements, versioning, and user consent enforcement
28. [File Upload][ref-doc-file-upload]; Multipart uploads, CSV processing, and S3 presign (GET, upload, part)
29. [Third Party Integration][ref-doc-third-party-integration]; AWS S3/SES, Firebase, Sentry, no-op mode, S3 bucket setup
30. [Doc][ref-doc-doc]; Swagger/OpenAPI co-located on `@Doc`, `@Response*` / `FileUpload*`, and `*Protected` kits
31. [Vault][ref-doc-vault]; Optional secret management via HashiCorp Vault



[ref-doc-installation]: installation.md
[ref-doc-environment]: environment.md
[ref-doc-configuration]: configuration.md
[ref-doc-project-structure]: project-structure.md
[ref-doc-database]: database.md
[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-device]: device.md
[ref-doc-response]: response.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-status-codes]: status-codes.md
[ref-doc-message]: language-message.md
[ref-doc-cache]: cache.md
[ref-doc-queue]: queue.md
[ref-doc-logger]: logger.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-workspace]: workspace.md
[ref-doc-project]: project.md
[ref-doc-pagination]: pagination.md
[ref-doc-notification]: notification.md
[ref-doc-email]: email.md
[ref-doc-two-factor]: two-factor.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-analytic]: analytic.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-third-party-integration]: third-party-integration.md
[ref-doc-doc]: doc.md
[ref-doc-vault]: vault.md

[ref-12factor]: https://12factor.net
[ref-rfc-7518]: https://datatracker.ietf.org/doc/html/rfc7518
[ref-rfc-7519]: https://datatracker.ietf.org/doc/html/rfc7519
[ref-rfc-6238]: https://datatracker.ietf.org/doc/html/rfc6238
[ref-helmet]: https://helmetjs.github.io
[ref-throttler]: https://github.com/nestjs/throttler
[ref-casl]: https://casl.js.org
[ref-owasp]: https://owasp.org/www-project-top-ten
