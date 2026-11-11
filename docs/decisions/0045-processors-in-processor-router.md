# 0045. Processors are registered in the processor router

- Status: accepted
- Date: 2026-11-11

## Context

Controllers live in their feature and are declared by `src/router/http/router.http.<scope>.module.ts`. Processors lived in their feature too, but each `<Module>UseCaseModule` provided its own, so a feature module registered its own worker.

## Decision

A processor file stays in its feature's `processors/`. `src/router/processor/router.processor.module.ts` alone lists every processor in `providers` and imports each `<Module>UseCaseModule` whose use cases they inject. A use-case module provides and exports use cases only. Amends 0006.

## Considered options

- every processor in `router.processor.module.ts` (chosen)
- the processor in its feature's use-case module: rejected, the feature module then registers its own worker, unlike a controller.
- a `<module>.processor.module.ts` per feature: rejected, one more module file for every feature with a queue.

## Consequences

- Every use case a processor injects is exported by its use-case module.
- `.claude/rules/layering.md`, Module files, and `.claude/rules/cross-module.md`, Registration, carry it.
