---
paths:
  - "test/**"
  - "vitest.config.ts"
---

# Testing

A spec succeeds when it fails on a behaviour change. Three kinds: unit (one class, collaborators doubled),
integration (one adapter against a real engine), e2e (one transport path through the running app). This tree
holds unit specs; integration and e2e need a run surface `ack-code` adds first. Load tests are not this suite.

## Where specs live and how the suite runs

- `vitest.config.ts` is the only test configuration; `test.include` is `test/**/*.spec.ts`, so a spec mirrors
  its subject's path under `test/` plus `.spec.ts`. Anywhere else it never runs. No second config or `--config`.
- `pnpm test` is `TZ=UTC vitest run --passWithNoTests`; a positional argument filters spec paths
  (`pnpm test user.domain`). Report a scoped run by naming the filter.
- `coverage.enabled` is `false`; `pnpm test:cov` collects it and the 100% thresholds apply. `coverage.include`
  is `src/**/*.ts` minus the `exclude` list in `vitest.config.ts` (`*.module *.enum *.interface *.constant
  *.contract *.controller *.processor *.repository *.doc`, `src/generated`, `src/migration`, `src/router`,
  `src/configs`, `src/languages`, root `src/*.ts`). An excluded file gets no spec.
- `test/setup.ts` (`setupFiles`) mutes Nest `Logger` and `ConsoleLogger`. Never re-mock, spy, or assert on a logger.
- Doubles: `mock<T>()` from `vitest-mock-extended`; `mockDeep<T>()` only for a nested reach (`DatabaseService.client`).

## The skeleton

```ts
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionRepository } from '@modules/session/repositories/session.repository';

vi.mock('<third-party-package>'); // after the imports, before the first describe

describe('SessionDomain', () => {
    const sessionRepository = mock<SessionRepository>();
    let domain: SessionDomain;
    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [SessionDomain, { provide: SessionRepository, useValue: sessionRepository }],
        }).compile();
        domain = module.get(SessionDomain);
    });
    describe('getListCursor', () => { it('…', async () => {}); });
});
```

A shared double is a `const` at the root `describe`; a single-use one lives in its test. The subject is `let`,
rebuilt in `beforeEach` after `vi.resetAllMocks()` (`clearAllMocks` is not a reset). Every DI dependency is
doubled, by class. `beforeAll` holds immutable setup (`vi.useFakeTimers()`, fixed dates), `afterEach` runs
`vi.restoreAllMocks()` after `vi.spyOn`, `afterAll` undoes `beforeAll`; no empty hook. A `vi.mock('<pkg>')`
identical in three or more specs, none needing the real module, moves to `test/setup.ts`.

## Assertions

- Matchers that name the thing: `toHaveBeenCalledWith`, `toHaveBeenNthCalledWith`, `toHaveBeenCalledTimes`,
  `expect.objectContaining`, `expect.any(Class)`. Capture a built argument through `mockImplementation`;
  record cross-mock order in an array.
- A thrown `AppBaseException` is asserted by class and by `module`, `statusCode`, `statusCodeKey`,
  `messagePath` through `rejects.toMatchObject`; `toThrow(new X())` compares `message` only.
- A first-party fixture is built complete, never cast; a third-party shape is cast once at the boundary.
  `@ts-ignore` and `@ts-expect-error` are out. Date fixtures are `Date` objects.
- A spec declares no `class`: apply a param decorator to a plain object and read the metadata; a class ref
  is `{} as Type<unknown>` plus `Reflect.defineMetadata`; an abstract base is exercised through a real subclass.
- Every private method gets its own `describe` by index access (`service['x'](…)`) after the public ones;
  the public describes call the real private, never a stub of it. Cover the branches, not only the happy path.
- Per layer: a domain asserts orchestration and the exception per branch; an HTTP or processor service asserts
  transport shaping and the hand-off; a queue class asserts job name, payload with every encrypted field, and
  options; a guard asserts transport behaviour only; an interceptor or filter asserts the envelope and headers;
  a DTO follows `dto.md`; an exception asserts its five fields. A controller, processor, repository, contract,
  or module is not a subject.

## Hard boundaries

On the coverage path `src/` wins: no production change beyond a typo fix; pin the spec to current behaviour
and record the defect with file and line. Do not delete, `.skip`, or weaken a failing spec, lower the
threshold, extend the exclude list, or add `/* v8 ignore */`. A subject needing an elaborate mock is a design
defect to report; a hard `new Date()` is not (`vi.useFakeTimers()`).
