---
paths:
    - 'test/**'
    - 'vitest.config.ts'
---

# Testing

A spec succeeds when it fails on a behaviour change. Load tests are not this suite.

A unit spec's subject is one class (service, use case, util, cache class, guard, pipe, interceptor, filter, queue class, DTO), every collaborator doubled.

Integration and e2e are held: no Vitest project, script, or `test/` folder exists for them. Do not run, write, or dispatch one; a task needing one is a hand-back.

## Layout and runs

- `vitest.config.ts` is the only config; `test.projects` holds `unit` (`test/unit/**/*.spec.ts`); a released type adds its project on the same pattern. A spec mirrors its subject's `src/` path under `test/<type>/` (`test/unit/modules/<module>/use-cases/`, `test/unit/modules/<module>/services/`). A helper for one type lives in `test/<type>/helpers/` and moves to `test/helpers/` when a second type imports it; specs import it through `@test/*`.
- `pnpm test` (unit, no Docker) takes a path filter (`pnpm test user.service`); name it when reporting. Pre-commit runs the full unit suite; the Stop hook `verify.sh` runs the specs of the changed modules, and the full suite when a changed path lies outside `src/modules/<name>/`, `src/common/<name>/`, and their `test/unit/` mirrors. `pnpm test:cov` applies the 100% thresholds to `src/**/*.ts` minus `coverage.exclude`; an excluded file gets no spec, the config factories excepted: one spec under `test/unit/configs/` asserts every `AppEnvSchema` key lands at its config path (`config.md`, Names) while `src/configs/**` stays excluded.
- `test/helpers/test.logger.helper.ts`, first in every `setupFiles`, mutes Nest loggers; `vi.spyOn` reaches a muted logger as it reaches any other method.
- A scoped `pnpm test:cov <path>` exits 1 with every spec passing because the 100% threshold is global. Read the `Tests` line and the per-file rows, not the exit code.
- `pnpm test` applies no threshold (`coverage.enabled` is `false`). `.github/workflows/test-integration.yml` and `test-e2e.yml` fail calling the held scripts.

## File names

Under `test/`, a spec with a subject file is that file's name plus `.spec.ts` and mirrors its `src/` path under `test/<type>/`. Every other file starts with `test.`: `test.[<type>.][<noun>.]<role>.ts`, role `setup` or `global-setup` at the root of `test/<type>/`, `helper` in a `helpers/` folder; the type segment is present everywhere except `test/helpers/`. A binary fixture is `test.<type>.<noun>.fixture.<ext>` in that type's `helpers/`.

## Spec content

- A fake is a plain object, a decorator is applied to one and its metadata read, a class ref is `{} as Type<unknown>` plus metadata.
- One root `describe` per spec, named for the subject class or schema (a decorator spec: its file stem); inside it one `describe` per method under its bare name, privates last. An `it` label opens on a present-tense third-person verb (`returns`, `throws`), never `should`. The subject variable is its class's last word, lowercased (`service`, `guard`); a use case's is `useCase`.
- Reused data is a `const` in the `describe`; a variant is a spread (`{ ...user, status }`), and so is a fixture the subject mutates (`{ ...baseUser }`). A first-party fixture is complete, never cast; a date is a fixed ISO-8601 UTC literal.
- Logic (a builder, a deferred, a transaction body) is an exported helper taking no function parameter: async `create<Subject>` through `Test.createTestingModule` (`createInitialized<Subject>` also runs `onModuleInit`), sync `build<Thing>`, `expect<Outcome>`, `stub<Scenario>`; a doubles bag is `I<Subject>Doubles` (`test.unit.aws.helper.ts`).

## Unit

- A double is `const userRepository: MockProxy<UserRepository> = mock<UserRepository>()`, shared at the root `describe`; `mockDeep<T>()` only for a nested reach (`DatabaseService.client`); a stub is `vi.fn().mockReturnValue()`.
- The subject is rebuilt in `beforeEach` after `vi.resetAllMocks()` through `Test.createTestingModule`, every DI dependency doubled by class. A `vi.mock('<pkg>')` identical in three or more specs, none needing the real module, moves to a `test/unit/test.unit.setup.ts` added to the unit `setupFiles`.
- `beforeAll` holds immutable setup (`vi.useFakeTimers()`); `afterEach` runs `vi.restoreAllMocks()` after `vi.spyOn`; `afterAll` undoes `beforeAll`; no empty hook.
- Matchers name the thing (`toHaveBeenCalledWith`, `expect.objectContaining`); a built argument is captured through `mockImplementation`; a thrown `AppBaseException` through `rejects.toMatchObject` on `module` and `statusCode`; the exception's own spec pins the rest. A private is called by index access and never stubbed. Cover every branch.
- Per layer: a service asserts the calls on its own module's collaborators and on the other modules' services and utils it injects, each a double like any other, the exception per branch, and, when it owns a shared transaction, the `*InTx` calls on one `tx`; a use case the shaping, the service call sequence, the effects and activity entries it adds, and, when it owns the transaction, the `*InTx` calls on one `tx` and the mapped write conflict; an HTTP use case the mapped unique collision and slug retry exhaustion; a queue class the scheduler's job name and options; an effect builder the queue, name, data with every encrypted field, priority, and key; a cache class the keys and leases it builds and the TTLs it reads, or, writing on the cache client, the command, key, JSON value, and `PX` TTL it sends and the failure handling (`cache.md`), `CacheService` and the `RedisCacheClient` client doubled; a service's `readThrough` call its key, schema, TTL, lease, and the loader's repository read; a guard transport behaviour; an interceptor or filter the envelope and headers; a DTO per `dto.md`; an exception its five fields. A controller, processor, repository, contract, or module is no unit subject.
- On the coverage path `src/` wins: no production change beyond the compile-blocking typo `.claude/agents/tester.md` allows; pin the spec to current behaviour and record the defect with file and line. Never delete, `.skip`, or weaken a failing spec, lower the threshold, extend the exclude list, or add `/* v8 ignore */`. An elaborate mock is a design defect to report; `new Date()` is not.
