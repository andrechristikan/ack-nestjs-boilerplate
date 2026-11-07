# 0009. The `<module>.` file prefix stays

- Status: accepted
- Date: 2026-11-07

## Context

Use cases add a new kind of file to every module. Every file under `src/modules/` carries the `<module>.` prefix.

## Decision

Every file keeps the `<module>.` prefix, a use case included (`user.sign-up.use-case.ts`).

## Considered options

- `user.sign-up.use-case.ts` (chosen)
- short names (`sign-up.use-case.ts`): rejected, the `<module>.` prefix keeps every file findable by a search on its module name, matches the existing tree, and keeps the spec mirror unambiguous.

## Consequences

Class names follow the file, `UserSignUpUseCase` and `UserPasswordService`.
