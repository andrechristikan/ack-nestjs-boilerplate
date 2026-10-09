---
paths:
    - '**/dtos/**'
    - '**/*.dto.ts'
    - 'src/common/request/**'
    - 'src/common/response/**'
---

# DTOs and validation

A DTO is a zod schema plus `z.infer` of it, in one `*.dto.ts` file declaring exactly one schema const and its `Dto` type (`naming.md`). A request DTO enters at the controller and travels down as far as the shape is unchanged; a response schema is declared on the route. No third model between controller and HTTP service.

## Shape

- A request schema is `z.strictObject`; a response schema is `z.object`. Neither is a top-level `z.array` or `z.record`; a list is a paginated route whose schema is the row (`pagination.md`).
- Compose with `.extend()`, `.omit()`, `.pick()`, `.partial()` (never to build an update request schema, which requires every editable field: `null-safety.md`, Update and create), `.nullable()`; a base such as `DatabaseResponseSchema` is extended, not copied. A piece reused across schemas is a validation in `src/common/request/validations/request.<name>.validation.ts` or `<module>/validations/`. A validation file exports zod schema consts only, no function and no module-level helper; custom logic sits inside the chain (`superRefine`, `transform`, `preprocess`, `pipe` callbacks).
- Every request field carries its constraints (`.min()`, `.regex()`, `z.enum()`) and normalization (`.trim()`, `.toLowerCase()`); a bare `z.string()` is an unvalidated wire input. An email field normalizes, then pipes into `RequestEmailSchema` (`request.email.validation.ts`), which reports the first failed check under `request.error.email.*`: `.trim().toLowerCase().max(100).pipe(RequestEmailSchema)`. Every field carries `.meta({ description, example })`, the OpenAPI source.
- Request schemas are the one layer where `.optional()` is legal; a response field is `.optional()` when genuinely absent and `.nullable()` when present-or-null. A date-shaped request field is typed as a date on the schema. A body field never duplicates a path param (`naming.md`).
- `AppEnvSchema` (`src/app/dtos/app.env.dto.ts`) validates `process.env` at boot through `ConfigModule` `validationSchema`, so every config value, an encryption root included, reaches `ConfigService` validated; config factories read raw env (`config.md`). A boolean is `RequestBooleanStringSchema`, an encryption root `RequestEncryptionSecretSchema`, a third-party key (AWS, Firebase, Google and Apple sign-in, Sentry, `EMAIL_*`, `HTTP_TRUSTED_PROXY`) a `RequestOptionalEnv*Schema` const from `request.optional-env.validation.ts`. Each is `RequestOptionalEnvSchema` (blank or missing to `null`) piped into the value schema, so a set value meets its format; a new format is a named const there, not a dto const. The `AppEnvSchema` `superRefine` requires an integration's keys once its trigger is set (a trigger compares `!== null`): an S3 or SES credential key or secret (SES adds `EMAIL_NO_REPLY` and `EMAIL_SUPPORT`), any Firebase key; a new integration adds its group there.

## The pipe and the interceptor

`RequestSchemaValidationPipe` (`src/common/request/pipes/request.schema-validation.pipe.ts:15`) is the single `APP_PIPE`. A body or path param with no schema attached raises `RequestSchemaMissingException` (`:37`), so each binds `{ schema }` (`@Body({ schema })`); a query with no schema passes unvalidated. The response schema is what reaches the wire: `z.object` strips undeclared keys, `@Response()` with no schema declares a route returning no data, and a payload the schema rejects raises `ResponseSerializationException`. Every handler returns an envelope its HTTP service builds (`IResponseReturn<T>`, `IResponsePaginationReturn<T>`, `IResponseFileReturn`; `http.md`); a no-data method is `Promise<IResponseReturn<void>>` (`layering.md`). A response schema never reaches a domain.

## Specs

A DTO spec parses a payload and asserts exactly the declared fields survive, an undeclared key is stripped by a response schema and rejected by a request schema, and nothing sensitive rides along.
