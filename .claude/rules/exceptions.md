# Exceptions, status codes, and messages

Detail in `docs/handling-error.md` and `docs/message.md`.

## The hierarchy

Every typed error is a dedicated class extending `AppBaseException` (`src/app/exceptions/app.base.exception.ts`):

```ts
export abstract class AppBaseException extends Error {
    abstract readonly module: string;
    abstract readonly statusCode: number;
    abstract readonly statusCodeKey: string;
    abstract readonly httpStatus: HttpStatus;

    readonly messageProperties?: IMessageProperties;
    readonly metadata?: Record<string, unknown>;
    readonly rawError?: unknown;
    readonly data?: unknown;

    constructor(readonly messagePath: string, options?: IAppBaseExceptionOptions) { … }
}
```

**One exception per file**, in the `exceptions/` folder of the module owning its status-code enum:

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

- `statusCodeKey` is always the reverse lookup on the same member — hardcoding the string lets the key and the number describe different things while `tsc` stays green.
- Interpolated messages take explicit named constructor params and map them into `messageProperties`: `super('user.error.passwordMustNew', { messageProperties: { period } })`.
- A caught error is wrapped, never swallowed: `throw new AppUnknownException(err)`. The cause rides in `rawError`, reaches Sentry for 5xx, and is never serialized into the response body.

## Throwing rules

- **Services throw the module's typed exception.** Never a bare `throw new Error(...)`, never a raw NestJS `BadRequestException` / `NotFoundException` from feature code — the filter chain maps `AppBaseException`, and a framework exception bypasses the module and status-code fields entirely.
- **Repositories do not throw HTTP-shaped errors.** A data-access failure stays a data-access failure; a business conflict is the service's call.
- **Controllers do not catch module exceptions (`AppBaseException`).** The global filter chain owns the mapping. A `try/catch` in a controller that reshapes an exception is duplicating the filter and will drift from it.
- Framework `HttpException`s (route 404, throttler 429, payload limits) are the framework's to throw and `AppHttpFilter`'s to handle. Feature code does not raise them.

## Status codes

Detail and the full procedure (tables): `rules/status-code.md`. Summary:

| Rule | Detail |
|---|---|
| Location | `<module>/enums/<module>.status-code.enum.ts` — `Enum<Module>StatusCodeError` |
| Values | **5 digits** for every status code |
| Keys | camelCase descriptors (`notFound`) |
| Reference | By enum member name — never a numeric literal |
| Procedure | Follow `rules/status-code.md` |
| Docs | Quoted numbers in `docs/*.md` are updated from `generated/docs/report-coder-<feature>.md` |

- **Reuse before adding.** Duplicate near-synonyms make the error surface unreadable.
- **The number is a client-visible contract.** Removing a member and shifting survivors changes what a frontend keying on the integer matches. Prefer `module` + `statusCodeKey`.

## The filter chain

`app.module.ts` registers the `APP_FILTER` providers in this array order — general → base-exception → http → validation → validation-import. NestJS evaluates them in reverse, so the most specific catch runs first:

- `app.validation-import.filter.ts` — `@Catch(FileImportException)`, row-level CSV import errors. No Sentry.
- `app.validation.filter.ts` — `@Catch(RequestValidationException)`, class-validator failures. No Sentry.
- `app.http.filter.ts` — `@Catch(HttpException)`, framework errors only. Sentry at 500+.
- `app.base-exception.filter.ts` — `@Catch(AppBaseException)`, every `AppBaseException`. Sentry only when `httpStatus >= 500`.
- `app.general.filter.ts` — `@Catch()`, the fallback. Always 500, always Sentry.

`AppBaseException` does not extend `HttpException`, so the relative position of those two is inert today — but the array order is the fact; do not reorder it to match a doc.

**`httpStatus` is also the alerting switch.** Choosing it on an exception chooses whether that failure pages anyone. Treat it as both the wire status and the Sentry predicate.

Response shape is `ResponseErrorDto`: `{ statusCode, statusCodeKey, module, message, metadata, data?, errors? }`, plus the `x-*` headers the filters set.

## i18n messages

- `messagePath` is a **nested** JSON key, and the filename is the prefix: `user.error.notFound` → `src/languages/en/user.json` → `{ "error": { "notFound": "..." } }`.
- **Flat keys are forbidden.** `"error.notFound": "..."` as a single string key does not resolve.
- Every new exception needs its key added to every language file, not just `en`.
- Placeholders use `{name}` and are fed by `messageProperties`.
