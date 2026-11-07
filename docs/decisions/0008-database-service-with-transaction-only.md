# 0008. `DatabaseService` outside repositories is `withTransaction` only

- Status: accepted
- Date: 2026-11-07

## Context

Services and use cases open cross-module transactions, so the lint matrix lets them inject `DatabaseService`. Model queries on `client` belong to repositories.

## Decision

In a service or a use case, `DatabaseService` is used for `withTransaction` only. Every statement goes through a repository.

## Considered options

- every statement goes through a repository (chosen)
- `databaseService.client` in a service or use case: rejected, outside `withTransaction` every statement belongs to the repository that owns the model.

## Consequences

- `.client` outside `repositories/` is a lint and review finding, seeds and health indicators excepted.
- `.claude/rules/database.md`, Access, carries the repository-only model query today.
