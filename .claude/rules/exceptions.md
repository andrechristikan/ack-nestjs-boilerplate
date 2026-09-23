---
paths:
  - "**/exceptions/**"
  - "**/*.status-code.enum.ts"
  - "src/app/**"
---

# Exceptions and status codes

## The hierarchy

Every typed error extends `AppBaseException` (`src/app/exceptions/app.base.exception.ts`),
one class per file under the `exceptions/` folder of the module owning its status-code enum:

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
- A caught error is wrapped, never swallowed: `throw new AppUnknownException(err)`. The cause
  rides in `rawError`, reaches Sentry for 5xx, and never reaches the response body.
- `httpStatus` is the wire status and the Sentry switch: filters report at 500 and above.

## Who throws

- The domain throws the typed exception of the subject that failed; never `new Error()`,
  never a Nest `BadRequestException` / `NotFoundException` from feature code. Another
  module's exception is correct when that module owns the entity (`cross-module.md`).
- An HTTP service and a processor service throw nothing of their own.
- A util maps an error to an exception and returns it; the caller throws
  (`const exception = this.util.mapCollision(error); throw exception;`).
- A repository throws no HTTP-shaped error; the one typed exception it raises is
  `DatabaseUniqueValueGenerationFailedException` (`database.md`).
- A param decorator throws `RequestContextMissingException` (`50304`, HTTP 500) when its store
  key or field is missing, so a handler never receives `null` from `@UserCurrent()` and its
  siblings.
- A controller does not catch `AppBaseException`; the filter chain owns the mapping.
- Framework `HttpException`s (route 404, throttler 429) are the framework's to throw and
  `AppHttpFilter`'s to handle; multipart limits are the one surface the kit maps onto typed
  `file` exceptions first (`file.md`).

## The filter chain

`src/app/app.module.ts` registers `APP_FILTER` in array order general → base-exception →
http → validation → validation-import; Nest evaluates them in reverse, so the most specific
runs first. `AppValidationImportFilter` (`FileImportException`, no Sentry),
`AppValidationFilter` (`RequestValidationException`, no Sentry), `AppHttpFilter`
(`HttpException`, Sentry at 500+), `AppBaseExceptionFilter` (`AppBaseException`, Sentry when
`httpStatus >= 500`, reporting `rawError` when set), `AppGeneralFilter` (fallback, always
500, always Sentry). Do not reorder the array. The error body is `ResponseErrorDto`:
`{ statusCode, statusCodeKey, module, message, metadata, data?, errors? }`.

## Status codes

`statusCode` is a 5-digit integer in `Enum<Module>StatusCodeError` at
`<module>/enums/<module>.status-code.enum.ts`, camelCase keys, referenced by member name
only. Each owner (a feature module, or a `src/common/` sub-tree such as `file`, `pagination`,
`request`, `database`) holds one contiguous hundred (`51000`–`51099`), members sequential from
the block base with no gaps. The enum files are the registry: scan them before allocating,
never allocate from memory. Reuse a member that already means the thing before adding one.
The integer is client-visible; prefer keying a client on `module` + `statusCodeKey`.
Procedure (scan, add, claim a block, remove, move): the `ack-add-status-code` skill.

## Messages

`messagePath` is `<module>.error.<descriptor>`; the first segment is the language file name
and every language directory carries the key (`i18n.md`).
