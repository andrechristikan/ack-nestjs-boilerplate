---
paths:
    - 'test/**'
    - 'vitest.config.ts'
---

# Testing

A spec succeeds when it fails on a behaviour change. Load tests are not this suite.

| Type | Subject | Runs against |
| --- | --- | --- |
| unit | one class: domain, HTTP or processor service, util, guard, pipe, interceptor, filter, queue class, DTO | nothing; every collaborator doubled |
| integration (held) | a repository, a domain whose invariant needs real storage, a kit adapter (`AwsS3Service`, `AwsSESService`, `DatabaseService`, cache), a queue class | Mongo, Redis, LocalStack; FCM faked |
| e2e (held) | a route or a flow over HTTP, BullMQ workers included | Mongo, Redis, LocalStack, nginx serving JWKS; FCM faked |

Integration and e2e are held: no Vitest project, script, or `test/` folder exists for them. Do not run, write, or dispatch one; a task needing one is a hand-back.

Integration asserts only what a mock cannot: a rollback, a unique index rejecting a duplicate, the rows a filter, select, or page returns, cross-repository consistency in one transaction, a request the emulator accepts. It never re-tests branch logic a unit spec covers; a domain enters it only for a transaction or cross-repository invariant.

## Layout and runs

- `vitest.config.ts` is the only config; `test.projects` holds `unit` (`test/unit/**/*.spec.ts`); a released type adds its project on the same pattern. A spec mirrors its subject's `src/` path under `test/<type>/`. A helper for one type lives in `test/<type>/helpers/` and moves to `test/helpers/` when a second type imports it (names: `naming.md`); specs import it through `@test/*`.
- `pnpm test` (unit, no Docker; pre-commit and `verify.sh` run it) takes a path filter (`pnpm test user.domain`); name it when reporting. `pnpm test:cov` applies the 100% thresholds to `src/**/*.ts` minus `coverage.exclude`; an excluded file gets no spec.
- `test/helpers/test.logger.helper.ts`, first in every `setupFiles`, mutes Nest loggers; never mock, spy, or assert one.

## Spec content

- The `ts/test` and `ts/test-spec` blocks in `eslint.config.mjs` place functions, arrows, and classes. A fake is a plain object, a decorator is applied to one and its metadata read, a class ref is `{} as Type<unknown>` plus metadata.
- One root `describe` per spec, named for the subject class or schema (a decorator spec: its file stem); inside it one `describe` per method under its bare name, privates last. An `it` label opens on a present-tense third-person verb (`returns`, `throws`), never `should`. The subject variable is its class's last word, lowercased (`domain`, `guard`).
- Reused data is a `const` in the `describe`; a variant is a spread (`{ ...user, status }`), and so is a fixture the subject mutates (`{ ...baseUser }`). A first-party fixture is complete, never cast; a date is a fixed ISO-8601 UTC literal.
- Logic (a builder, a deferred, a transaction body) is an exported helper taking no function parameter: async `create<Subject>` through `Test.createTestingModule` (`createInitialized<Subject>` also runs `onModuleInit`), sync `build<Thing>`, `expect<Outcome>`, `stub<Scenario>`; a doubles bag is `I<Subject>Doubles` (`test.unit.aws.helper.ts`).

## Unit

- A double is `const userRepository: MockProxy<UserRepository> = mock<UserRepository>()`, shared at the root `describe`; `mockDeep<T>()` only for a nested reach (`DatabaseService.client`); a stub is `vi.fn().mockReturnValue()`.
- The subject is rebuilt in `beforeEach` after `vi.resetAllMocks()` through `Test.createTestingModule`, every DI dependency doubled by class. A `vi.mock('<pkg>')` identical in three or more specs, none needing the real module, moves to a `test/unit/test.unit.setup.ts` added to the unit `setupFiles`.
- `beforeAll` holds immutable setup (`vi.useFakeTimers()`); `afterEach` runs `vi.restoreAllMocks()` after `vi.spyOn`; `afterAll` undoes `beforeAll`; no empty hook.
- Matchers name the thing (`toHaveBeenCalledWith`, `expect.objectContaining`); a built argument is captured through `mockImplementation`; a thrown `AppBaseException` through `rejects.toMatchObject` on `module`, `statusCode`, `statusCodeKey`, `messagePath`. A private is called by index access and never stubbed. Cover every branch.
- Per layer: a domain asserts orchestration and the exception per branch; an HTTP or processor service the shaping and hand-off; a queue class job name, payload with every encrypted field, and options; a guard transport behaviour; an interceptor or filter the envelope and headers; a DTO per `dto.md`; an exception its five fields. A controller, processor, repository, contract, or module is no unit subject.
- On the coverage path `src/` wins: no production change beyond a typo fix; pin the spec to current behaviour and record the defect with file and line. Never delete, `.skip`, or weaken a failing spec, lower the threshold, extend the exclude list, or add `/* v8 ignore */`. An elaborate mock is a design defect to report; `new Date()` is not.

## Integration and e2e (held)

- `TestEnv` (`test/helpers/test.env.helper.ts`) names every `AppEnvSchema` key and `applyTestEnv` throws on a missing one: `@nestjs/config` fills a missing key from the local `.env`, which holds live credentials. No `.env.<type>`.
- Under `test/`, only setup files, global-setup files, `test.env.helper.ts`, and `test.container.helper.ts` touch `process.env`. An env-writing setup file imports nothing that reaches `AppModule` or `CommonModule`, because `ConfigModule.forRoot` and `queue.decorator.ts` read env at import; app hooks go in a later setup file.
- `test/<type>/test.<type>.global-setup.ts` starts the containers once per project run, runs `prisma db push --skip-generate` against the throwaway Mongo, prepares LocalStack, and hands URLs to workers through `project.provide` and `inject` (`test.provided-context.d.ts`).
- `maxWorkers: 1`: files run serially on one database. Integration resets Mongo and Redis in `beforeEach` (`test.database.helper.ts`). e2e resets once per file, boots `AppModule` plus `MigrationModule` through `@configure`, and seeds the baseline (`test/e2e/helpers/test.e2e.app.helper.ts`); a spec calls `getE2eApp()`.
- FCM has no emulator: `TestFirebaseFake` (`test/helpers/test.firebase.helper.ts`) replaces `FirebaseService` through `.overrideProvider(...).useValue(...)` and records into `TestFirebasePushes`. S3 and SES reach LocalStack through `AWS_S3_ENDPOINT` and `AWS_SES_ENDPOINT`.
