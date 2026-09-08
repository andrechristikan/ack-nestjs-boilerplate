# Validation — zod schemas through the global pipe

Detail in `docs/request-validation.md` and `docs/response.md`. Shapes and placement are
`rules/dto.md`; OpenAPI annotation is `rules/swagger.md`.

## The pipe

`RequestSchemaValidationPipe` (`src/common/request/pipes/request.schema-validation.pipe.ts`)
extends Nest's `StandardSchemaValidationPipe` and is registered ONCE as `APP_PIPE` in
`RequestModule.forRoot()`, with an `exceptionFactory` turning the issues into
`RequestValidationException`. `AppValidationFilter` localizes those issues into the error
envelope (`rules/exceptions.md`, `rules/i18n.md`).

**A body reaching a handler with no schema attached is a wiring defect and the pipe refuses
it** — `RequestSchemaMissingException`. Binding a body is therefore always
`@Body({ schema: <Module><Action>RequestSchema })`; a bare `@Body()` is the defect the pipe
exists to catch.

## Request schemas

- Live in `<module>/dtos/request/`, exporting `<Module><Action>RequestSchema` and the inferred
  `<Module><Action>RequestDto` type (`rules/naming.md`).
- **A root request schema is `z.strictObject`**, so an unknown key is an error rather than a
  silently ignored one. A derived schema inherits that from the base it extends — `.extend()`,
  `.omit()`, `.pick()` and `.partial()` keep the strictness, so only the root spells it out.
- **Every field carries its constraints on the schema** — `.min()`, `.max()`, `.email()`,
  `.regex()`, `z.enum()`. A field typed `z.string()` with nothing else is an unvalidated wire
  input, and the shape is the only thing standing between the request and the service.
- **Normalization belongs on the schema, not in the service** — `.trim()`,
  `.toLowerCase()`, `.transform()` run at the boundary so every caller sees one canonical
  value.
- Every field also carries `.meta({ description, example })`, which is what the OpenAPI
  document is generated from (`rules/swagger.md`).
- Shared custom checks live in `src/common/request/validations/`; module-specific ones go in
  `<module>/validations/`. Never inline a regex that duplicates one that exists.
- Optional fields are `.optional()` — this is the ONE layer where `undefined` is legal
  (`rules/null-safety.md`).

## Params and queries

- A path param is validated by pipes on the param itself — `RequestRequiredPipe`,
  `RequestIsValidObjectIdPipe` — not by a schema (`rules/http.md`).
- Pagination and filtering come from the `@Pagination*` decorators in
  `src/common/pagination/` (`rules/pagination.md`), not from hand-rolled `@Query` parsing.
  Reach for a query schema when an endpoint has its own non-pagination filter set; otherwise
  use the existing decorators.

## Environment variables

`AppEnvSchema` (`src/app/dtos/app.env.dto.ts`) is the zod schema `ConfigModule.forRoot()`
validates `process.env` against at boot. A new env var is added there as well as in
`src/configs/` (`rules/config.md`).
