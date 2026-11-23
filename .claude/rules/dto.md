---
paths:
    - '**/dtos/**'
    - '**/*.dto.ts'
    - 'src/modules/**/controllers/**'
    - 'src/common/request/**'
    - 'src/common/response/**'
---

# DTOs and validation

A DTO is a zod schema plus `z.infer` of it, in one `*.dto.ts` file under its module's `dtos/` declaring exactly one schema const and its `Dto` type (`naming.md`). Every zod schema const but a validation (Shape) is one, a cache, pipeline, and snapshot schema included. A cache, pipeline, or snapshot schema's `I*` shape is what services and repositories pass; its `Dto` type names no signature. A request DTO enters at the controller and travels down as far as the shape is unchanged; a response schema is declared on the route. No third model between controller and use case.

## Shape

The request and response bullets bind a transport schema; a cache, pipeline, or snapshot schema keeps the shape its reader parses.

- A request schema is `z.strictObject`, a path or query param's a named scalar (`WorkspaceSlugRequestSchema`); a response schema is `z.object`. Neither is a top-level `z.array` or `z.record`; a list is a paginated route whose schema is the row (`pagination.md`). A response schema carries no censor transform: the non-admin use case censors contact values (`security.md`, Contact values).
- Compose with `.extend()`, `.omit()`, `.pick()`, `.partial()` (never to build an update request schema, which requires every editable field: `null-safety.md`, Update and create), `.nullable()`; a base such as `DatabaseResponseSchema` is extended, not copied. A field validation a request or an environment schema reuses is a validation in `src/common/request/validations/request.<name>.validation.ts` or `<module>/validations/`; a piece reused across cache, pipeline, or snapshot schemas is a dto file of its own with its `Dto` type (`analytic.pipeline-object-id.dto.ts`). A validation file exports zod schema consts only, no function and no module-level helper; custom logic sits inside the chain (`superRefine`, `transform`, `preprocess`, `pipe` callbacks).
- Every request field carries its constraints (`.min()`, `.max()`, `.regex()`, `z.enum()`) and, for free text a person types (a name, a description, a message), normalization (`.trim()`, `.toLowerCase()`); a secret, a token, and a regex-bounded value are taken as sent. A bare `z.string()` is an unvalidated wire input. Every request string and array has an upper bound: a literal looser than any length a config key sets, the service keeping the exact check; the pagination `cursor` is bounded by `PaginationCursorUtil.checkFormat` instead. An email field normalizes, then pipes into `RequestEmailSchema` (`request.email.validation.ts`), which reports the first failed check under `request.error.email.*`: `.trim().toLowerCase().max(100).pipe(RequestEmailSchema)`. An email's local part holds letters, digits, `-`, `_`, and `.` only. Every field carries `.meta({ description, example })`, the OpenAPI source.
- The presign kit schemas (`src/common/aws/dtos/request/`) bound `size` to `.int().min(1)` and `partNumber` to `.int().min(1).max(AwsS3MaxPartNumber)`. A consumer DTO extending them carries no size cap, neither a constant nor a `.max()`: the consumer's service compares `size` with its own `InBytes` config key (`user.photo.maxSizeInBytes`, `termPolicy.content.maxSizeInBytes`) and throws its module's 400 exception.
- A date-shaped request field is typed as a date on the schema. A body field never duplicates a path param.
- In `AppEnvSchema` (`src/app/dtos/app.env.dto.ts`), a boolean is `RequestBooleanStringSchema`, an encryption root `RequestEncryptionSecretSchema`, a third-party key (AWS, Firebase, Google and Apple sign-in, `SENTRY_DSN`, `EMAIL_*_ADDRESS`, `APP_HTTP_TRUSTED_PROXIES`) a `RequestOptionalEnv*Schema` const from `request.optional-env.validation.ts`. Each is `RequestOptionalEnvSchema` (blank or missing to `null`) piped into the value schema, so a set value meets its format; a new format is a named const there, not a dto const. The `AppEnvSchema` `superRefine` requires an integration's keys once its trigger is set (a trigger compares `!== null`): an S3 or SES credential key or secret (SES adds `EMAIL_NO_REPLY_ADDRESS` and `EMAIL_SUPPORT_ADDRESS`), any Firebase key; a new integration adds its group there. The two Sentry sample rates are required numbers from 0 to 1, declared inline.
- A device fingerprint is a client value of 32 to 128 characters; no per-device secret is issued.

## The pipe and the interceptor

`RequestSchemaValidationPipe` (`src/common/request/pipes/request.schema-validation.pipe.ts`) is the single `APP_PIPE`. A body or path param with no schema attached raises `RequestSchemaMissingException` (`RequestSchemaValidationPipe.transform`), so each binds a named `{ schema }` (`@Body({ schema })`, `http.md`); a query with no schema passes unvalidated. The response schema is what reaches the wire: `z.object` strips undeclared keys, `@Response()` with no schema declares a route returning no data, and a payload the schema rejects raises `ResponseSerializationException`. The envelopes are `IResponseReturn<T>`, `IResponsePaginationReturn<T>`, and `IResponseFileReturn`; a no-data method is `Promise<IResponseReturn<void>>`. A response schema never reaches a service.

## Specs

A DTO spec parses a payload and asserts exactly the declared fields survive, an undeclared key is stripped by a response schema and rejected by a request schema, and nothing sensitive rides along.

A rejection case asserts `expect(Schema.safeParse(input).error?.issues).toEqual([expect.objectContaining({ path, code })])`, every issue listed, `message` added only for an i18n key the schema's chain sets (its own `superRefine` or a validation it pipes into); never a bare `.toThrow()` or `success` alone.
