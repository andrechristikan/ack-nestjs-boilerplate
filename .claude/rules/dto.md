---
paths:
    - '**/dtos/**'
    - '**/*.dto.ts'
    - 'src/modules/**/controllers/**'
    - 'src/common/request/**'
    - 'src/common/response/**'
---

# DTOs and validation

A DTO is a zod schema plus `z.infer` of it, in one `*.dto.ts` file declaring exactly one schema const and its `Dto` type (`naming.md`). A request DTO enters at the controller and travels down as far as the shape is unchanged; a response schema is declared on the route. No third model between controller and use case.

## Shape

- A request schema is `z.strictObject`, a path or query param's a named scalar (`WorkspaceSlugRequestSchema`); a response schema is `z.object`. Neither is a top-level `z.array` or `z.record`; a list is a paginated route whose schema is the row (`pagination.md`).
- Compose with `.extend()`, `.omit()`, `.pick()`, `.partial()` (never to build an update request schema, which requires every editable field: `null-safety.md`, Update and create), `.nullable()`; a base such as `DatabaseResponseSchema` is extended, not copied. A piece reused across schemas is a validation in `src/common/request/validations/request.<name>.validation.ts` or `<module>/validations/`. A validation file exports zod schema consts only, no function and no module-level helper; custom logic sits inside the chain (`superRefine`, `transform`, `preprocess`, `pipe` callbacks).
- Every request field carries its constraints (`.min()`, `.max()`, `.regex()`, `z.enum()`) and normalization (`.trim()`, `.toLowerCase()`); a bare `z.string()` is an unvalidated wire input. Every request string and array has an upper bound: a literal looser than any length a config key sets, the service keeping the exact check; the pagination `cursor` is bounded by `PaginationCursorUtil.checkFormat` instead. An email field normalizes, then pipes into `RequestEmailSchema` (`request.email.validation.ts`), which reports the first failed check under `request.error.email.*`: `.trim().toLowerCase().max(100).pipe(RequestEmailSchema)`. An email's local part holds letters, digits, `-`, `_`, and `.` only. Every field carries `.meta({ description, example })`, the OpenAPI source.
- The presign kit schemas (`src/common/aws/dtos/request/`) bound `size` to `.int().min(1)` and `partNumber` to `.int().min(1).max(AwsS3MaxPartNumber)`. A consumer DTO extending them carries no size cap, neither a constant nor a `.max()`: the consumer's service compares `size` with its own `InBytes` config key (`user.photo.maxSizeInBytes`, `termPolicy.content.maxSizeInBytes`) and throws its module's 400 exception.
- A date-shaped request field is typed as a date on the schema. A body field never duplicates a path param (`naming.md`).
- In `AppEnvSchema` (`src/app/dtos/app.env.dto.ts`), a boolean is `RequestBooleanStringSchema`, an encryption root `RequestEncryptionSecretSchema`, a third-party key (AWS, Firebase, Google and Apple sign-in, `SENTRY_DSN`, `EMAIL_*_ADDRESS`, `APP_HTTP_TRUSTED_PROXIES`) a `RequestOptionalEnv*Schema` const from `request.optional-env.validation.ts`. Each is `RequestOptionalEnvSchema` (blank or missing to `null`) piped into the value schema, so a set value meets its format; a new format is a named const there, not a dto const. The `AppEnvSchema` `superRefine` requires an integration's keys once its trigger is set (a trigger compares `!== null`): an S3 or SES credential key or secret (SES adds `EMAIL_NO_REPLY_ADDRESS` and `EMAIL_SUPPORT_ADDRESS`), any Firebase key; a new integration adds its group there. The two Sentry sample rates are required numbers from 0 to 1, declared inline.
- A device fingerprint is a client value of 32 to 128 characters; no per-device secret is issued.

## The pipe and the interceptor

`RequestSchemaValidationPipe` (`src/common/request/pipes/request.schema-validation.pipe.ts`) is the single `APP_PIPE`. A body or path param with no schema attached raises `RequestSchemaMissingException` (`RequestSchemaValidationPipe.transform`), so each binds a named `{ schema }` (`@Body({ schema })`, `http.md`); a query with no schema passes unvalidated. The response schema is what reaches the wire: `z.object` strips undeclared keys, `@Response()` with no schema declares a route returning no data, and a payload the schema rejects raises `ResponseSerializationException`. Every handler returns an envelope its use case builds (`IResponseReturn<T>`, `IResponsePaginationReturn<T>`, `IResponseFileReturn`; `http.md`); a no-data method is `Promise<IResponseReturn<void>>` (`use-case.md`). A response schema never reaches a service.

## Specs

A DTO spec parses a payload and asserts exactly the declared fields survive, an undeclared key is stripped by a response schema and rejected by a request schema, and nothing sensitive rides along.
