# Documentation

## Disclaimer

The documentation in this directory was written with the assistance of **GitHub Copilot** (powered by **Claude Sonnet 4.6**).

Every document has been **manually reviewed and verified** against the actual implementation to ensure accuracy and correctness.
If you find any discrepancies, please open an issue or submit a pull request.


## Standards & References

This project follows established industry standards and methodologies. The sections below document the specific specs, RFCs, and practices this codebase is built against.

### Twelve-Factor App

This project aligns with the [Twelve-Factor App][ref-12factor] methodology — a set of best practices for building modern, scalable, maintainable server-side applications.

| Factor | How it applies |
|---|---|
| Codebase | Single repo, one codebase tracked in Git, multiple deploys via env |
| Dependencies | All dependencies declared in `package.json`, enforced with PNPM lockfile |
| Config | All configuration via environment variables, validated at startup via `AppEnvDto` |
| Backing Services | MongoDB, Redis, AWS S3/SES, Firebase — treated as attached resources via env config |
| Build, Release, Run | Build (`pnpm build`) is strictly separated from runtime |
| Processes | Stateless app processes — session and cache state stored in Redis, not in-memory |
| Port Binding | App self-contained via NestJS HTTP server, port exposed via `APP_PORT` env |
| Concurrency | Horizontal scaling supported — stateless processes, shared Redis for sessions |
| Disposability | Fast startup, graceful shutdown — no sticky sessions or local state |
| Dev/Prod Parity | Same stack (Docker Compose) for local dev and production |
| Logs | Logs as event streams via Pino to stdout — no log file management in app |
| Admin Processes | One-off tasks via dedicated migration and seed scripts (`pnpm migration:seed`) |

### Security Standards

| Concern | Standard |
|---|---|
| JWT Access Token | ES256 — ECDSA + SHA-256 ([RFC 7518][ref-rfc-7518], [RFC 7519][ref-rfc-7519]) |
| JWT Refresh Token | ES512 — ECDSA + SHA-512 ([RFC 7518][ref-rfc-7518], [RFC 7519][ref-rfc-7519]) |
| Two-Factor Auth | TOTP — SHA-1, 6 digits, 30s period ([RFC 6238][ref-rfc-6238]) |
| Password Hashing | bcrypt — 8 salt rounds |
| Encryption at Rest | AES-256-CBC (2FA secrets), AES-CBC + PKCS7 (general data) |
| HTTP Security Headers | [Helmet][ref-helmet] v8 — CSP, Strict-Transport-Security, X-Frame-Options, etc. |
| CORS | Configurable allowlist with wildcard subdomain support, preflight max-age 24h |
| Rate Limiting | 10 requests / 500ms window — global guard via [@nestjs/throttler][ref-throttler] |
| Authorization | [CASL][ref-casl] — fine-grained ability-based access control (subject + action) |
| API Key Auth | Machine-to-machine via `x-api-key` header |
| Sensitive Data | Auto-redacted in logs (password, token, apiKey) via Pino serializers |
| Threat Coverage | [OWASP Top 10][ref-owasp] — input validation, injection prevention, auth hardening |


## Table of Contents

### Getting Started
Start here to get the project running and understand its foundations.

1. [Installation][ref-doc-installation] — Set up the development environment step by step
2. [Environment][ref-doc-environment] — Configure all environment variables via `.env`
3. [Configuration][ref-doc-configuration] — Understand the Config Module and per-concern config files
4. [Project Structure][ref-doc-project-structure] — Learn the modular architecture and repository design pattern

### Core
Essential systems that power every feature in the project.

5. [Database][ref-doc-database] — Prisma + MongoDB replica set, transactions, and the Database Module
6. [Authentication][ref-doc-authentication] — JWT (ES256/ES512), session lifecycle, API key auth
7. [Authorization][ref-doc-authorization] — `UserProtected`, `RoleProtected`, `PolicyAbilityProtected`, `TermPolicyAcceptanceProtected`
8. [Device][ref-doc-device] — Device fingerprinting, `DeviceOwnership`, max 1 session per device
9. [Response][ref-doc-response] — Standardized response decorators, pagination response, file download
10. [Request Validation][ref-doc-request-validation] — `ValidationPipe`, `class-validator`, body/query/path validation
11. [Handling Error][ref-doc-handling-error] — Exception filters, standardized HTTP error responses, i18n errors
12. [Message][ref-doc-message] — i18n with `nestjs-i18n`, nested JSON message files in `src/languages/`
13. [Cache][ref-doc-cache] — Redis caching with shared `RedisCacheModule`, TTL strategy
14. [Queue][ref-doc-queue] — BullMQ background jobs, `QueueProcessorBase`, retry/backoff
15. [Logger][ref-doc-logger] — Pino logging, file rotation, sensitive data redaction, Sentry integration
16. [Security and Middleware][ref-doc-security-and-middleware] — HTTP middleware layer, headers, rate limiting

### Advanced
Additional features and integrations for production-grade deployments.

17. [Pagination][ref-doc-pagination] — Offset-based, cursor-based pagination, advanced filtering
18. [Notification][ref-doc-notification] — Multi-channel notifications (email, push, inApp, silent) via BullMQ
19. [Two Factor][ref-doc-two-factor] — TOTP 2FA with authenticator apps and backup codes
20. [Feature Flag][ref-doc-feature-flag] — Dynamic feature management, gradual rollouts, A/B testing
21. [Activity Log][ref-doc-activity-log] — Recording successful user activities with `@ActivityLog`
22. [Term Policy][ref-doc-term-policy] — Legal agreements, versioning, and user consent enforcement
23. [File Upload][ref-doc-file-upload] — Single/multiple file uploads, CSV processing, upload decorators
24. [Presign][ref-doc-presign] — AWS S3 presigned URLs for secure time-limited object access
25. [Third Party Integration][ref-doc-third-party-integration] — AWS S3/SES, Firebase, Sentry, no-op mode
26. [Doc][ref-doc-doc] — Swagger/OpenAPI decorators via the Doc Module
27. [Analytics][ref-doc-analytics] — Planned analytics design using MongoDB aggregation pipelines



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
[ref-doc-message]: message.md
[ref-doc-cache]: cache.md
[ref-doc-queue]: queue.md
[ref-doc-logger]: logger.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-pagination]: pagination.md
[ref-doc-notification]: notification.md
[ref-doc-two-factor]: two-factor.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-presign]: presign.md
[ref-doc-third-party-integration]: third-party-integration.md
[ref-doc-doc]: doc.md
[ref-doc-analytics]: analytics.md

[ref-12factor]: https://12factor.net
[ref-rfc-7518]: https://datatracker.ietf.org/doc/html/rfc7518
[ref-rfc-7519]: https://datatracker.ietf.org/doc/html/rfc7519
[ref-rfc-6238]: https://datatracker.ietf.org/doc/html/rfc6238
[ref-helmet]: https://helmetjs.github.io
[ref-throttler]: https://github.com/nestjs/throttler
[ref-casl]: https://casl.js.org
[ref-owasp]: https://owasp.org/www-project-top-ten
