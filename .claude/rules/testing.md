---
paths:
    - 'test/**'
    - 'vitest.config.ts'
---

# Testing

A spec succeeds when it fails on a behavior change. Load tests are not this suite.

A unit spec's subject is one class (service, use case, util, cache class, guard, pipe, interceptor, filter, queue class, DTO); its doubles: `test-doubles.md`.

Integration and e2e are held: no Vitest project, script, or `test/` folder exists for them. Do not run, write, or dispatch one; a task needing one is a hand-back.

## Layout and runs

- `vitest.config.ts` is the only config; `test.projects` holds `unit` (`test/unit/**/*.spec.ts`); a released type adds its project on the same pattern. A spec mirrors its subject's `src/` path under `test/<type>/` (`test/unit/modules/<module>/use-cases/`, `test/unit/modules/<module>/services/`). A helper for one type lives in `test/<type>/helpers/` and moves to `test/helpers/` when a second type imports it (the logger mute sits there already); specs import it through `@test/*`.
- `pnpm test` (unit, no Docker) takes a path filter (`pnpm test user.service`); name it when reporting. Pre-commit: `AGENTS.md`, Commit gates; no `pre-push` hook exists. `pnpm test:cov` applies the 100% thresholds to `src/**/*.ts` minus `coverage.exclude` (modules, enums, interfaces, constants, contracts, controllers, processors, repositories, configs, `src/migration/`, the router, languages, generated code, and the root files); `test-unit.yml`, which `.github/workflows/ci.yml` calls, runs it, and the thresholds fail that job. An excluded file gets no spec, the config factories excepted: one spec under `test/unit/configs/` asserts every `AppEnvSchema` key lands at its config path (`config.md`, Names) while `src/configs/**` stays excluded.
- `test/helpers/test.logger.helper.ts`, first in every `setupFiles`, mutes Nest loggers; `vi.spyOn` reaches a muted logger as it reaches any other method.
- A scoped `pnpm test:cov <path>` exits 1 with every spec passing because the 100% threshold is global. Read the `Tests` line and the per-file rows, not the exit code.
- `pnpm test` applies no threshold (`coverage.enabled` is `false`). `.github/workflows/test-e2e.yml` runs on manual dispatch only and fails, calling the held `pnpm test:e2e`.

## File names

Under `test/`, a spec with a subject file is that file's name plus `.spec.ts`. Every other file starts with `test.`: `test.[<type>.][<noun>.]<role>.ts`, role `setup` or `global-setup` at the root of `test/<type>/`, `helper` in a `helpers/` folder; the type segment is present everywhere except `test/helpers/`. A binary fixture is `test.<type>.<noun>.fixture.<ext>` in that type's `helpers/`.

## Spec content

- A decorator is applied to a plain object and its metadata read; a class ref is `{} as Type<unknown>` plus metadata.
- One root `describe` per spec, named for the subject class or schema (a decorator spec: its file stem); inside it one `describe` per method under its bare name, privates last. An `it` label opens on a present-tense third-person verb (`returns`, `throws`), never `should`. The subject variable is its class's last word, lowercased (`service`, `guard`); a use case's is `useCase`.
- Reused data is a `const` in the `describe`; a variant is a spread (`{ ...user, status }`), and so is a fixture the subject mutates (`{ ...baseUser }`). A first-party fixture is complete, never cast; a date is a fixed ISO-8601 UTC literal.
- Logic (a builder, a deferred, a transaction body) is an exported helper taking no function parameter: async `create<Subject>` through `Test.createTestingModule` (`createInitialized<Subject>` also runs `onModuleInit`), sync `build<Thing>`, `expect<Outcome>`, `stub<Scenario>`, a reader or extractor a plain verb (`readEnvExample`, `subscribeNext`); a doubles bag is `I<Subject>Doubles` (`test.unit.aws.helper.ts`).

## Unit

- A double is `const userRepository: MockProxy<UserRepository> = mock<UserRepository>()`, shared at the root `describe`; `mockDeep<T>()` only for a nested reach (`DatabaseService.client`); a stub is `vi.fn().mockReturnValue()`.
- The subject is rebuilt in `beforeEach` through `Test.createTestingModule`. The unit project's `mockReset` and `restoreMocks` reset every double and spy before each test, so a spec sets a shared mock implementation, a `vi.spyOn`, or `buildConfigService` in `beforeEach`.
- The unit project runs each spec file in its own module registry on the default pool with a fixed worker count (`vitest.config.ts`); never `isolate: false`, another pool, or more workers.
- A `vi.mock('<pkg>')` replaces a third-party or network boundary only; one identical in three or more specs, none needing the real module, moves to a `test/unit/test.unit.setup.ts` added to the unit `setupFiles`. Imports are static; `vi.resetModules()` with a dynamic import serves only a case that needs a fresh module (a per-case `vi.doMock`).
- `beforeAll` holds immutable setup (`vi.useFakeTimers()`); `afterAll` undoes `beforeAll`; no empty hook.
- A partial argument match is `expect.objectContaining`; a built argument is captured through `mockImplementation`; a thrown `AppBaseException` through `rejects.toMatchObject` on `module` and `statusCode`. A private is called by index access and never stubbed. Cover every branch.
- What each layer's spec asserts: `test-doubles.md`.
- On the coverage path the spec follows `src/`: no production change beyond the compile-blocking typo `.claude/agents/tester.md` allows; pin the spec to current behavior and record the defect with file and line. Never delete, `.skip`, or weaken a failing spec, lower the threshold, extend the exclude list, or add `/* v8 ignore */`. An elaborate mock is a design defect to report; `new Date()` is not.
