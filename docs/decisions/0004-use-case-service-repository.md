# 0004. Use case, service, repository

- Status: accepted
- Date: 2026-11-07

## Context

Cross-module flows live in feature HTTP services, and nothing may share them. The largest HTTP service is 980 lines, and the sign-up transaction body exists three times. The mainstream NestJS position is that a service may inject another module's exported service, with an acyclic module graph as the one hard rule.

## Decision

Each user- or job-facing action is one class in `use-cases/` with one public method `execute`. A module's rules live in `services/`, and a service injects services only of lower-ranked modules on a declared order the lint enforces.

## Considered options

- one use case per action, rules in services shared downward on a lint-enforced order (chosen)
- domains as orchestrators: rejected, a rules class that orchestrates other modules is a use case in disguise.
- domain events for orchestration: rejected, in-memory events add a second, non-durable mechanism whose `suppressErrors` default swallows listener failures.
- grouped multi-method use cases: rejected, a use case is one action called by one entry point.
- a separate `src/application/` tier: rejected, it gives the same cycle guarantee as use cases kept in their feature at a larger blast, moving the test hook's module mapping, the `AGENTS.md` layout, the router, knip, and every spec mirror.

## Consequences

- A use case never calls another use case or a repository.
- Logic two use cases share moves down into a service.
