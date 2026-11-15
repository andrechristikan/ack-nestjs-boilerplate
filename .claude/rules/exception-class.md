---
paths:
    - '**/exceptions/**'
    - '**/*.status-code.enum.ts'
---

# Exception classes and status codes

Who throws what, wrapping, and `QueueException`: `exceptions.md`.

Every typed error extends `AppBaseException` (`src/app/exceptions/app.base.exception.ts`) except `QueueException` and its subclasses (job failures, `exceptions.md`), one class per file under the `exceptions/` folder of the module owning its status-code enum:

```ts
export class UserNotFoundException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.notFound;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('user.error.notFound');
    }
}
```

- `statusCodeKey` is the reverse lookup on the same member, never a hardcoded string.
- Interpolated messages take named constructor params mapped into `messageProperties`.

## Status codes

`statusCode` is a 5-digit integer in `Enum<Module>StatusCodeError` at `<module>/enums/<module>.status-code.enum.ts`, camelCase keys, referenced by member name only. Each owner (a feature module, or a `src/common/` sub-tree such as `file`, `pagination`, `request`, `database`, `redis`) holds one contiguous hundred (`51000`–`51099`), members sequential from the block base. The integer is client-visible; prefer keying a client on `module` + `statusCodeKey`. Procedure: `.claude/skills/ack-build/references/add-status-code.md`.

## Messages

`messagePath` is `<module>.error.<descriptor>`, its first segment the language file name, the key in every language directory (`i18n.md`). A generic transport failure reuses `http.<class>.<descriptor>` (`http.clientError.forbidden`).
