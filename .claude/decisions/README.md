# Decisions

Each entry names a choice a rule in `.claude/rules/`, or a harness file, carries and gives the reason each plausible alternative was rejected. The rule states what the code does; an entry states only why the alternatives lost.

- [Layering][ref-decisions-layering]: layers and modules, naming, lint and tests, the logging line shape
- [Database and cache][ref-decisions-database-and-cache]: database, cache and Redis, outage logging
- [Outbox and queues][ref-decisions-outbox-and-queues]: outbox, queues, notification jobs
- [HTTP][ref-decisions-http]: routes and responses, response headers, files and import
- [Configuration][ref-decisions-configuration]: environment keys, constants, feature flags, optional integrations, Sentry
- [Deployment][ref-decisions-deployment]: release, compose and production
- [Auth][ref-decisions-auth]: the ASVS reference, passwords, sign-up, social sign-in, re-authentication, verification, account deletion, MFA, attempts and locks, sessions, retention
- [Authorization][ref-decisions-authorization]: roles and workspace ownership
- [Harness][ref-decisions-harness]: decision records, review and agents, hooks and checks

[ref-decisions-layering]: layering.md
[ref-decisions-database-and-cache]: database-and-cache.md
[ref-decisions-outbox-and-queues]: outbox-and-queues.md
[ref-decisions-http]: http.md
[ref-decisions-configuration]: configuration.md
[ref-decisions-deployment]: deployment.md
[ref-decisions-auth]: auth.md
[ref-decisions-authorization]: authorization.md
[ref-decisions-harness]: harness.md
