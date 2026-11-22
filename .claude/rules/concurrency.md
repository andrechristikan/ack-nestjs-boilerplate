---
paths:
    - 'src/**'
    - 'test/**'
---

# Concurrency and errors

Async-first in `src/` and `test/`: independent operations run concurrently, awaited together by `Promise.all` (the default: one failure fails the whole) or `Promise.allSettled` (each outcome handled on its own: a best-effort side effect, a fan-out notification, a cache clear). Write each call as an array element; a promise goes in a `const` only when it must start before another `await`, is used more than once, or joins an array built conditionally (`push`, or a `let` set in if/else). A `.map()` with a multi-statement callback goes in a named `const`; one with a one-expression callback stays inline, `Promise.all(files.map(file => this.validate(file)))`. A dependent chain (start, then use the result) is its own async function or private method whose promise joins the array. A sequential `await` of independent work is a defect outside the cases below; one still in the tree is a sweep finding, not a precedent.

```ts
const [user, setting] = await Promise.all([
    this.userRepository.findOneById(userId),
    this.settingRepository.findByUser(userId),
]);
```

A `Promise.all` destructure binds its read results first, in order; an unread result follows with no binding, never a hole.

```ts
const [role, email] = await Promise.all([readRole, readEmail, gateCountry]);
// never: const [role, , email] = await Promise.all([readRole, gateCountry, readEmail]);
```

## Together and alone

- Every independent fail-fast check, a feature gate included, is its own `assert*` or `get*` method that reads and throws, or a `validate*` gate that reads and throws its own exception, under its existing name (`FeatureFlagService.validateFeatureFlagMetadata`); the use case awaits them in one `Promise.all`, and whichever fails first answers.
- Statements on one `tx` that use no other statement's result and are bound to no order run in one `Promise.all`.
- One `Promise.all` holds reads only or writes only, and a write follows its checks. A method whose only read on `tx` serves its own write (the ids for its `updateMany`, its own row, a keyed outbox add's key) is a write; a method that reads another subject to build its write joins none (`TermPolicyAcceptanceService.acceptPublishedManyInTx`).
- Awaited alone, in turn:
    - a statement whose failure is the answer: a guarded statement, `UserAuthService.completeReauthenticationInTx` and `MFAService.completeReauthenticationInTx` in turn, an insert whose unique collision is mapped or retried;
    - a credential proof (the `UserAuthService` and `MFAService` re-authentication checks `checkReauthenticationPassword` and `checkReauthentication`, `MFAService.check`, `checkPasskeyLogin`, `checkTOTPSetupCode`, the password compare), so a failed proof is always counted and recorded;
    - a statement another depends on;
    - a cheap check before the expensive or external work it guards (S3, an argon2 hash, a send).
- argon2id hashes, and argon2id compares over several hashes, run under `Promise.all`.
- Parallel is not the goal: where the order serves, the sequence stays.

## Sequential by design

A sequential `await` whose dependency is visible in the code carries no comment: the call takes an earlier result, or it acts on the subject an earlier step changed (the same container, app, client, or loop iteration, as in a poll on its own probe). Sequential awaits on different subjects whose order matters occur only in these cases, each named in the method's `// Sequential by design: <case>` line:

- a credential proof, awaited alone;
- a statement whose failure is the answer, awaited before an unrelated write;
- a cheap check before the expensive or external work it guards;
- a write after its checks;
- side effects whose order is part of the contract (a reset before a boot, seeds that read rows an earlier seed wrote);
- a fan-out over an unbounded collection: bounded chunks in turn, each concurrent; the size is a config key (`injectable.md`, Config).

A method carries at most one `// Sequential by design: <case>` line, above its first ordered `await`, naming every case the method has (`cheap check before the external work it guards; write after its checks`); the later `await`s of the same method, a loop body included, carry none.

`.catch()` belongs only to the `.catch(bootstrapFailed)` in `src/main.ts` and `src/migration.ts` and to a promise never awaited.
