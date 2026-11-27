---
title: Documentation
description: The index of every page under docs, by folder and at the root.
---

# Documentation

This page indexes every documentation page, for a reader who looks for the page that covers a topic. Four folders group the pages by type, and the features page, the production page, and the contributors page sit at the root of `docs/`.

## Table of Contents

- [Related Documents](#related-documents)
- [Getting started](#getting-started)
- [Concepts](#concepts)
- [Guides](#guides)
- [Reference](#reference)
- [Production](#production)
- [Contributors](#contributors)

## Related Documents

- [Contributing][ref-doc-contributing]: the workflow, coding standards, and commit rules
- [README][ref-doc-root-readme]: the project landing page

## Getting started

- [Installation][ref-doc-installation]: clone, start the Docker dependencies, seed, and run the API
- [Features][ref-doc-features]: every feature in a few sentences, grouped by domain, with when you need it and its pages

## Concepts

- [Architecture][ref-doc-architecture]: folder layout, layers, import levels, modules, router scopes, entry points, and Twelve-Factor
- [Configuration][ref-doc-concept-configuration]: how `.env` becomes validated, typed config
- [Dependencies][ref-doc-dependencies]: MongoDB, Redis, and the optional adapters, and how each answers when down or unset
- [Database][ref-doc-concept-database]: the Prisma client, transactions, audit stamping, soft delete, and unique-value retries
- [Cache][ref-doc-concept-cache]: the cache Redis, read-through entries, invalidation through the outbox, and the session login entry
- [Queue][ref-doc-concept-queue]: the outbox, enqueue after commit, queue classes, processors, job ids, and retries
- [Logging][ref-doc-concept-logging]: the Pino logger, request logs, redaction, and boot failures
- [Sentry][ref-doc-concept-sentry]: what reaches Sentry and how events are scrubbed
- [File Upload][ref-doc-concept-file-upload]: multipart upload, the CSV pipe chain, presigned upload, and replaced object cleanup
- [Vault][ref-doc-concept-vault]: the bundled Vault containers, key-value layout, and helpers
- [Request Pipeline][ref-doc-concept-request-pipeline]: the path of a request through middleware, guards, the pipe, interceptors, and filters
- [Security][ref-doc-concept-security]: security headers, rate limiting, CORS, environment protection, the request timeout, and the cryptography used
- [Request Validation][ref-doc-concept-request-validation]: the global pipe, strict schemas, and the issue-to-message mapping
- [Response][ref-doc-concept-response]: response schemas, the interceptors, and pagination and file responses
- [Error Handling][ref-doc-concept-error-handling]: the filter chain, typed exceptions, and failures outside a request
- [I18n][ref-doc-concept-i18n]: language resolution and message paths
- [API Documentation][ref-doc-concept-api-documentation]: how the OpenAPI document is built from the route decorators and schemas
- [Pagination][ref-doc-concept-pagination]: offset and cursor lists, cursor sealing, and ordering presets
- [Authentication][ref-doc-concept-authentication]: login methods, password checks, tokens and JWKS, refresh rotation, logout, and the social nonce
- [Session][ref-doc-concept-session]: the session row, the login entry, revocation, and the per-request check
- [API Key][ref-doc-concept-api-key]: default and system keys and the cached lookup
- [MFA][ref-doc-concept-mfa]: TOTP, passkeys, backup codes, the login challenge, re-authentication, and the attempt lock
- [User][ref-doc-concept-user]: sign-up, verification, profile, password flows, status and lockout, deletion, and import and export
- [Authorization][ref-doc-concept-authorization]: the guard pipeline, roles, and policy abilities
- [Device][ref-doc-concept-device]: device ownership, one signed-in user per device, and the push token
- [Term Policy][ref-doc-concept-term-policy]: versioned legal documents, publication, and the acceptance gate
- [Feature Flag][ref-doc-concept-feature-flag]: the enable switch, the allow-list, the rollout bucket, sub-keys, and the cache
- [Workspace][ref-doc-concept-workspace]: the active workspace, roles and ownership, invites, join requests, slugs, and soft delete
- [Project][ref-doc-concept-project]: the project guard, the workspace bypass, membership, slugs, and soft delete
- [Notification][ref-doc-concept-notification]: the recipient, orchestration and steps, the email and push channels, and payload encryption
- [Activity Log][ref-doc-concept-activity-log]: entries recorded in the action's transaction, actor and target rows, and masking
- [Analytic][ref-doc-concept-analytic]: live metrics and snapshots, caching and thresholds, and the activity-log metrics
- [AI Harness][ref-doc-concept-ai-harness]: how the Claude Code and Copilot configuration takes a feature from design to pull request

## Guides

- [Hosted Dependencies][ref-doc-guide-hosted-dependencies]: run the application against hosted MongoDB and Redis
- [Vault][ref-doc-guide-vault]: start Vault, push, pull, and reset
- [Module][ref-doc-guide-module]: add a feature module
- [Seed][ref-doc-guide-seed]: push the schema, run, add, and remove seeds
- [Queue][ref-doc-guide-queue]: add a queue, a processor, and an outbox effect
- [File Upload][ref-doc-guide-file-upload]: add a multipart upload, a CSV import, or a presigned upload
- [Schema][ref-doc-guide-schema]: write the request and response schemas of a route and bind them
- [API Documentation][ref-doc-guide-api-documentation]: add `@Doc` and the error kits, and get `swagger.json`
- [Pagination][ref-doc-guide-pagination]: build an offset or cursor list route
- [Route Protection][ref-doc-guide-route-protection]: stack the key, JWT, role, policy, term-policy, workspace, and flag decorators
- [Role][ref-doc-guide-role]: create a role and its policies and assign it
- [Social Sign-In][ref-doc-guide-social-sign-in]: configure Google and Apple and call the login routes
- [Passkeys][ref-doc-guide-passkeys]: register a passkey and sign in with it
- [Status Code][ref-doc-guide-status-code]: allocate a code, write the exception, and add its message
- [I18n][ref-doc-guide-i18n]: add a message or a language
- [Notification][ref-doc-guide-notification]: add a notification kind with its template
- [Email Template][ref-doc-guide-email-template]: edit a Handlebars template and sync it to SES
- [Activity Log][ref-doc-guide-activity-log]: record a new action with its actor and target rows
- [Feature Flag][ref-doc-guide-feature-flag]: gate a route, read a sub-key, and add a flag
- [AI Harness][ref-doc-guide-ai-harness]: adapt the harness after a fork and check it after a change

## Reference

- [Configuration][ref-doc-reference-configuration]: every config key, its environment variable, and the Compose variables
- [Commands][ref-doc-reference-commands]: every `pnpm` script, seed command, and Compose command
- [Database][ref-doc-reference-database]: the models, composite types, and seeded rows
- [Queue][ref-doc-reference-queue]: every queue with its jobs, job ids, and options
- [File Upload][ref-doc-reference-file-upload]: the upload decorators, pipes, extensions, limits, and presign options
- [Logging][ref-doc-reference-logging]: the levels, record fields, and redacted keys
- [Helper][ref-doc-reference-helper]: every public method of the helper services
- [Notification][ref-doc-reference-notification]: the kinds, types, channels, email templates, and settings
- [Activity Log][ref-doc-reference-activity-log]: every action with its rows and metadata, and the actor and target pairs
- [Feature Flag][ref-doc-reference-feature-flag]: every seeded flag with its sub-keys, bounds, and gates
- [HTTP Contract][ref-doc-reference-http-contract]: the success and error envelopes, the metadata fields, and the headers
- [Middleware][ref-doc-reference-middleware]: each middleware and interceptor with its order, config keys, and behavior
- [Pagination][ref-doc-reference-pagination]: the query parameters, limits, metadata fields, and service methods
- [Status Codes][ref-doc-reference-status-codes]: the status code, HTTP status, and message of every exception, by module
- [Decorators and Guards][ref-doc-reference-decorators-and-guards]: the decorator order, each guard with its store key and missing-entry exception, and the request store keys
- [AI Harness][ref-doc-reference-ai-harness]: the commands, agents, hooks, and copied skills

## Production

- [Production][ref-doc-production]: topology, keys, the image, release paths, TLS, Vault as a network service, cloud setup, and checks

## Contributors

- [Contributors][ref-doc-contributors]: each contributor with a link and the feature contributed

<!-- REFERENCES -->

[ref-doc-root-readme]: ../README.md
[ref-doc-contributing]: ../CONTRIBUTING.md
[ref-doc-features]: features.md
[ref-doc-installation]: getting-started/installation.md
[ref-doc-architecture]: concepts/architecture.md
[ref-doc-concept-configuration]: concepts/configuration.md
[ref-doc-dependencies]: concepts/dependencies.md
[ref-doc-concept-vault]: concepts/vault.md
[ref-doc-concept-database]: concepts/database.md
[ref-doc-concept-cache]: concepts/cache.md
[ref-doc-concept-queue]: concepts/queue.md
[ref-doc-concept-logging]: concepts/logging.md
[ref-doc-concept-sentry]: concepts/sentry.md
[ref-doc-concept-file-upload]: concepts/file-upload.md
[ref-doc-concept-ai-harness]: concepts/ai-harness.md
[ref-doc-concept-authentication]: concepts/authentication.md
[ref-doc-concept-session]: concepts/session.md
[ref-doc-concept-api-key]: concepts/api-key.md
[ref-doc-concept-mfa]: concepts/mfa.md
[ref-doc-concept-user]: concepts/user.md
[ref-doc-concept-authorization]: concepts/authorization.md
[ref-doc-concept-device]: concepts/device.md
[ref-doc-concept-term-policy]: concepts/term-policy.md
[ref-doc-concept-feature-flag]: concepts/feature-flag.md
[ref-doc-concept-workspace]: concepts/workspace.md
[ref-doc-concept-project]: concepts/project.md
[ref-doc-concept-notification]: concepts/notification.md
[ref-doc-concept-activity-log]: concepts/activity-log.md
[ref-doc-concept-analytic]: concepts/analytic.md
[ref-doc-guide-hosted-dependencies]: guides/hosted-dependencies.md
[ref-doc-guide-vault]: guides/vault.md
[ref-doc-guide-module]: guides/module.md
[ref-doc-guide-seed]: guides/seed.md
[ref-doc-guide-queue]: guides/queue.md
[ref-doc-guide-file-upload]: guides/file-upload.md
[ref-doc-guide-ai-harness]: guides/ai-harness.md
[ref-doc-guide-route-protection]: guides/route-protection.md
[ref-doc-guide-role]: guides/role.md
[ref-doc-guide-social-sign-in]: guides/social-sign-in.md
[ref-doc-guide-passkeys]: guides/passkeys.md
[ref-doc-reference-configuration]: reference/configuration.md
[ref-doc-reference-commands]: reference/commands.md
[ref-doc-reference-database]: reference/database.md
[ref-doc-reference-queue]: reference/queue.md
[ref-doc-reference-file-upload]: reference/file-upload.md
[ref-doc-reference-logging]: reference/logging.md
[ref-doc-reference-helper]: reference/helper.md
[ref-doc-reference-ai-harness]: reference/ai-harness.md
[ref-doc-reference-notification]: reference/notification.md
[ref-doc-reference-activity-log]: reference/activity-log.md
[ref-doc-reference-feature-flag]: reference/feature-flag.md
[ref-doc-reference-decorators-and-guards]: reference/decorators-and-guards.md
[ref-doc-concept-request-pipeline]: concepts/request-pipeline.md
[ref-doc-concept-security]: concepts/security.md
[ref-doc-concept-request-validation]: concepts/request-validation.md
[ref-doc-concept-response]: concepts/response.md
[ref-doc-concept-error-handling]: concepts/error-handling.md
[ref-doc-concept-i18n]: concepts/i18n.md
[ref-doc-concept-api-documentation]: concepts/api-documentation.md
[ref-doc-concept-pagination]: concepts/pagination.md
[ref-doc-guide-schema]: guides/schema.md
[ref-doc-guide-api-documentation]: guides/api-documentation.md
[ref-doc-guide-pagination]: guides/pagination.md
[ref-doc-guide-status-code]: guides/status-code.md
[ref-doc-guide-i18n]: guides/i18n.md
[ref-doc-guide-notification]: guides/notification.md
[ref-doc-guide-email-template]: guides/email-template.md
[ref-doc-guide-activity-log]: guides/activity-log.md
[ref-doc-guide-feature-flag]: guides/feature-flag.md
[ref-doc-reference-http-contract]: reference/http-contract.md
[ref-doc-reference-middleware]: reference/middleware.md
[ref-doc-reference-pagination]: reference/pagination.md
[ref-doc-reference-status-codes]: reference/status-codes.md
[ref-doc-production]: production.md
[ref-doc-contributors]: contributors.md
