---
paths:
    - 'src/**'
    - 'test/**'
---

# Concurrency and errors

Async-first in `src/` and `test/`: independent operations run concurrently, awaited together by `Promise.all` (the default: one failure fails the whole) or `Promise.allSettled` (each outcome handled on its own: a best-effort side effect, a fan-out notification, a cache clear). Write each call as an array element; a promise goes in a `const` only when it must start before another `await`, is used more than once, or joins an array built conditionally (`push`, or a `let` set in if/else). A `.map()` with a multi-statement callback goes in a named `const`; one with a one-expression callback stays inline, `Promise.all(ids.map(id => this.repo.find(id)))`. A dependent chain (start, then use the result) is its own async function or private method whose promise joins the array. A sequential `await` of independent work is a defect outside the cases below; one still in the tree is a sweep finding, not a precedent.

```ts
const [user, setting] = await Promise.all([
    this.userRepository.findOneById(userId),
    this.settingRepository.findByUser(userId),
]);
```

A sequential `await` whose dependency is visible in the code carries no comment: the call takes an earlier result, or it acts on the subject an earlier step changed (the same container, app, client, or loop iteration, as in a poll on its own probe; the same `tx`, whose MongoDB session runs one operation at a time). Sequential awaits on different subjects whose order matters occur only in these cases, each named at the site in a one-line `// Sequential by design: <case>` comment, in a loop too:

- a write that must not happen if an earlier step throws;
- a gate that decides whether the request proceeds (a feature-flag gate, an existence or permission check) runs before the work it guards, so a closed gate starts no query and its exception is the one the caller sees;
- side effects whose order is part of the contract (a reset before a boot, seeds that read rows an earlier seed wrote);
- a fan-out over an unbounded collection: bounded chunks in turn, each concurrent; the size is a config key (`config.md`).

`.catch()` belongs only to `bootstrap().catch` in `src/main.ts` and `src/migration.ts` and to a promise never awaited.
