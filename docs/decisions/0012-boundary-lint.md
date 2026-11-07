# 0012. Boundary lint

- Status: accepted
- Date: 2026-11-07

## Context

The layer matrix, the feature order, and the `forwardRef` ban need enforcement. Carve-outs written one by one drift from a declared order.

## Decision

`eslint-plugin-boundaries` in `eslint.config.mjs` enforces the element types, the layer matrix, the feature order, and `forwardRef` as a restricted import. It runs inside `pnpm lint` and the pre-commit `lint-staged`.

## Considered options

- `eslint-plugin-boundaries` inside `pnpm lint` (chosen)
- `dependency-cruiser` as a second runner (fallback only): rejected, it adds a separate script and pre-commit step where the plugin runs inside `pnpm lint`.
- rules text alone: rejected, carve-outs are then written one by one instead of following from a declared order.

## Consequences

- `dependency-cruiser` runs only if the plugin cannot express the feature order.
- `pnpm lint` exits 0 on the finished tree.
