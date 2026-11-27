---
title: Documentation
description: The index of every page under docs, by folder and at the root.
---

# Documentation

This page indexes every documentation page, for a reader who looks for the page that covers a topic. Four folders group the pages by type, and the feature pages, the production page, and the contributors page sit at the root of `docs/`.

## Table of Contents

- [Related Documents](#related-documents)
- [Getting started](#getting-started)
- [Concepts](#concepts)
- [Guides](#guides)
- [Reference](#reference)
- [Feature pages](#feature-pages)
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
- [Status Code][ref-doc-guide-status-code]: allocate a code, write the exception, and add its message
- [I18n][ref-doc-guide-i18n]: add a message or a language
- [AI Harness][ref-doc-guide-ai-harness]: adapt the harness after a fork and check it after a change

## Reference

- [Configuration][ref-doc-reference-configuration]: every config key, its environment variable, and the Compose variables
- [Commands][ref-doc-reference-commands]: every `pnpm` script, seed command, and Compose command
- [Database][ref-doc-reference-database]: the models, composite types, and seeded rows
- [Queue][ref-doc-reference-queue]: every queue with its jobs, job ids, and options
- [File Upload][ref-doc-reference-file-upload]: the upload decorators, pipes, extensions, limits, and presign options
- [Logging][ref-doc-reference-logging]: the levels, record fields, and redacted keys
- [Helper][ref-doc-reference-helper]: every public method of the helper services
- [HTTP Contract][ref-doc-reference-http-contract]: the success and error envelopes, the metadata fields, and the headers
- [Middleware][ref-doc-reference-middleware]: each middleware and interceptor with its order, config keys, and behavior
- [Pagination][ref-doc-reference-pagination]: the query parameters, limits, metadata fields, and service methods
- [Status Codes][ref-doc-reference-status-codes]: the status code, HTTP status, and message of every exception, by module
- [AI Harness][ref-doc-reference-ai-harness]: the commands, agents, hooks, and copied skills

## Feature pages

- [Activity Log][ref-doc-activity-log]: staged, flushed, and queued audit entries
- [Analytic][ref-doc-analytic]: admin and workspace metrics, anomaly summaries, and fraud reports
- [Authentication][ref-doc-authentication]: password login, JWT, sessions, social sign-in, and API keys
- [Authorization][ref-doc-authorization]: guards, roles, policies, and term-policy acceptance
- [Device][ref-doc-device]: device ownership and one signed-in user per device
- [Email][ref-doc-email]: SES templates and the sync command
- [Feature Flag][ref-doc-feature-flag]: targeting, rollout, and caching
- [Notification][ref-doc-notification]: channels, queues, and delivery
- [Project][ref-doc-project]: workspace-scoped projects and their members
- [Term Policy][ref-doc-term-policy]: versioned legal documents and acceptance
- [Two-Factor Authentication][ref-doc-two-factor]: TOTP and backup codes
- [Workspace][ref-doc-workspace]: tenancy, membership, invites, and join requests

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
[ref-doc-guide-hosted-dependencies]: guides/hosted-dependencies.md
[ref-doc-guide-vault]: guides/vault.md
[ref-doc-guide-module]: guides/module.md
[ref-doc-guide-seed]: guides/seed.md
[ref-doc-guide-queue]: guides/queue.md
[ref-doc-guide-file-upload]: guides/file-upload.md
[ref-doc-guide-ai-harness]: guides/ai-harness.md
[ref-doc-reference-configuration]: reference/configuration.md
[ref-doc-reference-commands]: reference/commands.md
[ref-doc-reference-database]: reference/database.md
[ref-doc-reference-queue]: reference/queue.md
[ref-doc-reference-file-upload]: reference/file-upload.md
[ref-doc-reference-logging]: reference/logging.md
[ref-doc-reference-helper]: reference/helper.md
[ref-doc-reference-ai-harness]: reference/ai-harness.md
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
[ref-doc-reference-http-contract]: reference/http-contract.md
[ref-doc-reference-middleware]: reference/middleware.md
[ref-doc-reference-pagination]: reference/pagination.md
[ref-doc-reference-status-codes]: reference/status-codes.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-analytic]: analytic.md
[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-device]: device.md
[ref-doc-email]: email.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-notification]: notification.md
[ref-doc-project]: project.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-two-factor]: two-factor.md
[ref-doc-workspace]: workspace.md
[ref-doc-production]: production.md
[ref-doc-contributors]: contributors.md
