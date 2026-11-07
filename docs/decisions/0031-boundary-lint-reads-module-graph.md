# 0031. Boundary lint reads the module graph

- Status: accepted
- Date: 2026-11-08

## Context

`eslint.config.mjs` names no feature module. This record supersedes 0012, which put the feature order in that config, so the config named every feature and could not be reused. Each feature's module file already declares which lower modules it imports and whether it is `@Global()`.

## Decision

`eslint.config.mjs` derives the module graph from each `src/modules/<feature>/<feature>.module.ts`. "Reaches" means imports and injects, and "a service" is any class under a feature's `services/`. A service reaches another feature's service or util only when its module file imports that feature's module or the feature is `@Global()`. A guard, strategy, interceptor, or decorator reaches only a `@Global()` feature. The `module-graph/no-cycle` rule fails a cycle and names its path. A util reaches no `src/modules/` util at all; that is the layer matrix in `layering.md`, not the graph. The graph rules run inside `pnpm lint`.

## Considered options

- derive the graph from the module files (chosen)
- the feature order hard-coded in `eslint.config.mjs`: rejected, the config names every feature and cannot be reused.
- the order in a separate data file: rejected, the feature names only move to another file.
- the order outside lint: rejected, only rules text and review would hold it, so the boundary is no longer enforced.

## Consequences

- A builder adds the lower module to its module file's `imports:` before a service injects it.
- Lint checks the declared `imports:` and cycles. A module importing a higher-ranked module without a cycle passes lint, and `reviewer` catches it against the order list in `layering.md`. This is the accepted trade-off of naming no feature in the config.
- A cycle between modules fails `pnpm lint`.
