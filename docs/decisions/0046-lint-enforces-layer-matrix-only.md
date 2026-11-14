# 0046. Lint enforces the layer matrix only

- Status: accepted
- Date: 2026-11-11

## Context

0031 had `eslint.config.mjs` read every feature module file to build the module graph, then derive per-feature reach policies and a cycle rule from it. That took about 230 lines of config. A cycle already fails the boot with `ReferenceError`, and the reviewer already checks the declared `imports:` against the dependency order. The owner wants a lint config that keeps only the rules that are, or are likely to be, broken often.

## Decision

`ts/boundaries` enforces the layer matrix of `layering.md` and nothing per feature. The module graph reader, the per-feature policies, and the cycle rule are gone. Supersedes 0031.

## Considered options

- the layer matrix only (chosen)
- lint derives the module graph, per-feature policies, and cycles (0031): rejected, about 230 lines of config for what the boot and the reviewer catch.
- the dependency order hard-coded in the config: rejected, it drifts from the module files.

## Consequences

- A higher-module import or an import missing from `imports:` passes lint; the reviewer catches it against `layering.md`, Dependency order.
- A service injecting another module's repository, cache, or queue class, a controller or processor calling another feature's use case, and a guard, interceptor, or decorator injecting a non-`@Global()` feature's service also pass lint; the reviewer holds them (`cross-module.md`).
- A module cycle fails the boot, not `pnpm lint`.
- `.claude/rules/eslint.md` carries the remaining rule set.
- Outbox clause removed by 0053: the processor allowance for `OutboxService` ended when the outbox moved into the kit.
