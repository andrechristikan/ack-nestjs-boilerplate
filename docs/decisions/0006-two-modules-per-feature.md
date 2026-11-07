# 0006. Two modules per feature

- Status: accepted
- Date: 2026-11-07

## Context

Sign-up creates a workspace, so user flows need workspace services. An invite looks a user up by email, so workspace services need the user service. The module graph stays acyclic.

## Decision

`<Module>Module` provides the services, repositories, utils, caches, and queue classes. `<Module>UseCaseModule` provides the use cases and processors and is a leaf only `src/router/` imports.

## Considered options

- `<Module>Module` and `<Module>UseCaseModule` (chosen)
- one module per feature: rejected, `UserModule` and `WorkspaceModule` would import each other, a cycle only `forwardRef` resolves.
- four modules per feature: rejected, two suffice once the use-case module is the leaf, because the repository and processor modules add files without adding a boundary.

## Consequences

- `<Module>Module` never imports a use-case module.
- `forwardRef` stays forbidden.
