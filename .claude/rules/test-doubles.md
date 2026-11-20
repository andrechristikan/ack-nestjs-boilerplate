---
paths:
    - 'test/unit/**'
---

# Test doubles

- Real, each built with its own dependencies under this split: the `Helper*Service` classes and every `*.util.ts` class under `src/`.
- Doubled: every other collaborator, `MessageService` and `PaginationService` included; `ConfigService` is `buildConfigService` (`test.unit.config.helper.ts`) holding every key a real helper reads.
- A real helper's random, id, or argon2 method is stubbed with `vi.spyOn`, argon2 excepted where hashing is the subject; a clock read runs under `vi.useFakeTimers()` and `vi.setSystemTime()`; a randomly encrypted value or cursor is decrypted with the real helper and the plain value asserted.
- A `src/` branch a spec reaches only by stubbing another real-helper method is dead code, never kept behind a stub: a `src/` change deletes it; on the coverage path it is a recorded defect (`testing.md`, Unit).
- A spec asserts the subject's result and the arguments reaching a double; it asserts a call on a real helper or util only through a `vi.spyOn` stub it installed, and takes no expected value from a copy of a helper's logic.
