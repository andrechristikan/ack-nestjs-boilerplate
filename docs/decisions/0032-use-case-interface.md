# 0032. Every use case implements `IAppUseCase`

- Status: accepted
- Date: 2026-11-08

## Context

Every use case has one public method, `execute`, but the signature is a convention no type checks. The shared contract belongs with the app module, in its own file.

## Decision

`src/app/interfaces/app.use-case.interface.ts` declares `IAppUseCase<TArgs extends unknown[], TResult>` with `execute(...args: TArgs): Promise<TResult>`. Every use case implements it. `unknown[]` as the generic bound is allowed: `null-safety.md` names a generic bound as a narrowing input.

## Considered options

- generic arguments and result (chosen)
- a single input object: rejected, it changes every multi-parameter use case's signature and its callers, and the behavior moves.
- a marker interface with `execute(...args: never[]): Promise<unknown>`: rejected, the untyped `unknown` result is what `null-safety.md` limits, and the type check is weak.

## Consequences

- A new use case `implements IAppUseCase<[<execute params>], <result>>` with its own type arguments.
- `execute` is `async`, and its parameters and result match the type arguments (`use-case.md`).
