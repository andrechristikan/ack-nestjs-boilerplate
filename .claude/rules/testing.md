---
paths:
  - "test/**"
  - "vitest.config.ts"
---

# Testing

A spec succeeds when it fails on a behaviour change. Load tests are not this suite.

| Type | Subject | Runs against |
|---|---|---|
| unit | one class: domain, HTTP or processor service, util, guard, pipe, interceptor, filter, queue class, DTO | nothing; every collaborator doubled |
| integration | a repository, a domain whose invariant needs real storage, a kit adapter (`AwsS3Service`, `AwsSesService`, `DatabaseService`, cache), a queue class | Mongo, Redis, LocalStack; FCM faked |
| e2e | a route or a flow over HTTP, BullMQ workers included | Mongo, Redis, LocalStack, nginx serving JWKS; FCM faked |

Integration asserts only what a mock cannot: a rollback, a unique index rejecting a duplicate, the rows a filter, select,
or page returns, cross-repository consistency in one transaction, a request the emulator accepts. It never re-tests
branch logic a unit spec covers; a domain enters it only for a transaction or cross-repository invariant.

## Layout and runs

- `vitest.config.ts` is the only config; `test.projects` holds `unit`, `integration`, `e2e`, and each project runs
  only `test/<type>/**/*.spec.ts`. A spec with a subject file mirrors that file's `src/` path under `test/<type>/`;
  an e2e spec for a flow across several routes lives at `test/e2e/flows/<module>.<flow>.spec.ts`.
- A helper for one type lives in `test/<type>/helpers/` and moves to `test/helpers/` when a second type imports
  it. File names: `naming.md`. Specs import helpers through `@test/*`.
- `pnpm test` runs unit with no Docker (pre-commit and `verify.sh` run it); `pnpm test:integration` and
  `pnpm test:e2e` need a running Docker daemon. Each takes a path filter (`pnpm test user.domain`); name it when
  reporting. `pnpm test:cov` runs unit with the 100% thresholds over `src/**/*.ts` minus `coverage.exclude`
  (`coverage.enabled` is `false` otherwise). An excluded file gets no spec.
- `test/helpers/test.logger.helper.ts`, first in every project's `setupFiles`, mutes Nest `Logger` and `ConsoleLogger`;
  never re-mock, spy, or assert on a logger.

## Spec content

- A spec declares no function and stores none in a variable, at any depth; an arrow is only a direct argument to
  `describe`, `it`, `test`, a hook, `expect`, `vi.fn`, `vi.mock`, `vi.hoisted`, or `mockImplementation[Once]`.
- Reused data is a `const` inside the `describe`; a variant is a spread (`{ ...user, status }`); a stubbed member is
  `vi.fn().mockReturnValue(...)`. Logic (a builder, a deferred, a transaction body) is an exported helper function;
  a helper takes no function parameter.
- No `class` under `test/`: a fake is a plain object, a decorator is applied to a plain object and its metadata read,
  a class ref is `{} as Type<unknown>` plus `Reflect.defineMetadata`.

## Unit

- Doubles: `mock<T>()` from `vitest-mock-extended`; `mockDeep<T>()` only for a nested reach (`DatabaseService.client`).
- A shared double is a `const` at the root `describe`. The subject is `let`, rebuilt in `beforeEach` after `vi.resetAllMocks()`
  through `Test.createTestingModule`, every DI dependency doubled by class. A `vi.mock('<pkg>')` identical in three or more
  specs, none needing the real module, moves to `test/unit/test.unit.setup.ts`, created then and added to the unit `setupFiles`.
- `beforeAll` holds immutable setup (`vi.useFakeTimers()`); `afterEach` runs `vi.restoreAllMocks()` after `vi.spyOn`;
  `afterAll` undoes `beforeAll`; no empty hook.
- Matchers name the thing (`toHaveBeenCalledWith`, `expect.objectContaining`); capture a built argument through
  `mockImplementation`. A thrown `AppBaseException` is asserted through `rejects.toMatchObject` on `module`,
  `statusCode`, `statusCodeKey`, `messagePath`. A first-party fixture is complete, never cast; dates are `Date`s.
- Each private method gets a `describe` by index access after the public ones, which call the real private. Cover every branch.
- Per layer: a domain asserts orchestration and the exception per branch; an HTTP or processor service the shaping and
  hand-off; a queue class job name, payload with every encrypted field, and options; a guard transport behaviour; an
  interceptor or filter the envelope and headers; a DTO per `dto.md`; an exception its five fields. A controller,
  processor, repository, contract, or module is no unit subject.
- On the coverage path `src/` wins: no production change beyond a typo fix; pin the spec to current behaviour and
  record the defect with file and line. Never delete, `.skip`, or weaken a failing spec, lower the threshold, extend
  the exclude list, or add `/* v8 ignore */`. An elaborate mock is a design defect to report; `new Date()` is not.

## Integration and e2e

- `TestEnv` (`test/helpers/test.env.helper.ts`) names every `AppEnvSchema` key and `applyTestEnv` throws on a
  missing one: `@nestjs/config` fills a missing key from the local `.env`, which holds live credentials. No `.env.<type>`.
- Under `test/`, only setup files, global-setup files, `test.env.helper.ts`, and `test.container.helper.ts` touch
  `process.env`. An env-writing setup file imports nothing that reaches `AppModule` or `CommonModule`, because
  `ConfigModule.forRoot` and `queue.decorator.ts` read env at import; app hooks go in a later setup file.
- `test/<type>/test.<type>.global-setup.ts` starts the containers once per project run, runs
  `prisma db push --skip-generate` against the throwaway Mongo (the one schema push an agent runs), prepares
  LocalStack, and hands URLs to workers through `project.provide` and `inject` (`test.provided-context.d.ts`).
- `maxWorkers: 1`: files run serially on one database. Integration resets Mongo and Redis in `beforeEach`
  (`test.database.helper.ts`). e2e resets once per file, boots `AppModule` plus `MigrationModule` through
  `@configure`, and seeds the baseline (`test/e2e/helpers/test.e2e.app.helper.ts`); a spec calls `getE2eApp()`.
- FCM has no emulator: `TestFirebaseFake` (`test/helpers/test.firebase.helper.ts`) replaces `FirebaseService` through
  `.overrideProvider(...).useValue(...)` and records into `TestFirebasePushes`. S3 and SES reach LocalStack through
  `AWS_S3_ENDPOINT` and `AWS_SES_ENDPOINT`. Images: `docker.md`.
