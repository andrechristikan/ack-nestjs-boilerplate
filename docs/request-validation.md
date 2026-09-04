# Request Validation Documentation

This documentation explains the features and usage of **Request Module**: Located at `src/common/request`

## Overview

Every request shape is a [zod][ref-zod] schema. Schemas reach the framework through the [Standard Schema][ref-standard-schema] interface, so NestJS validates a request body against the schema bound to the parameter, and the same schema also produces the OpenAPI document through [zod-openapi][ref-zod-openapi].

## Related Documents

- [Message Documentation][ref-doc-message] - For internationalization and error message translation
- [Handling Error Documentation][ref-doc-handling-error] - For exception handling and response formatting
- [Doc Documentation][ref-doc-doc] - For API documentation generated from the same schemas
- [Response Documentation][ref-doc-response] - For the outbound half, where a response schema serializes the payload
- [File Upload Documentation][ref-doc-file-upload] - For file validation pipes

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Request Module](#request-module)
- [Usage](#usage)
  - [Request Body Validation](#request-body-validation)
  - [Path Parameters Validation](#path-parameters-validation)
  - [Query Parameters](#query-parameters)
- [Schema Shape](#schema-shape)
- [Composing Schemas](#composing-schemas)
- [Shared Validations](#shared-validations)
- [Validation Pipes](#validation-pipes)
- [CSV Import Validation](#csv-import-validation)
- [Environment Variables](#environment-variables)
- [Error Message Mapping](#error-message-mapping)
- [Error Message Translation](#error-message-translation)

## Request Module

`RequestSchemaValidationPipe` (`src/common/request/pipes/request.schema-validation.pipe.ts`) extends the framework's `StandardSchemaValidationPipe` and is registered once as an `APP_PIPE` inside `RequestModule.forRoot()`:

```typescript
{
  provide: APP_PIPE,
  useFactory: () =>
    new RequestSchemaValidationPipe({
      exceptionFactory: (issues: readonly StandardSchemaV1.Issue[]) =>
        new RequestValidationException(issues),
    }),
}
```

The subclass adds one rule on top of the framework pipe: a `body` argument arriving with no schema attached throws `RequestSchemaMissingException` instead of reaching the handler unchecked. Binding a body is therefore always `@Body({ schema: <Module><Action>RequestSchema })`. The constraint when writing one: `rules/validation.md`.

**Processing flow**:
```
Request received
    ↓
RequestSchemaValidationPipe validates the argument against its schema
    ↓
Valid? → parsed and transformed value reaches the controller
    ↓ No
RequestValidationException carries the Standard Schema issues
    ↓
AppValidationFilter catches the exception
    ↓
MessageService localizes each issue
    ↓
Standardized error response (HTTP 422)
```

## Usage

### Request Body Validation

The schema is bound on `@Body()`; the parameter is typed with the inferred DTO type:

```typescript
@Controller('users')
export class UserAdminController {
  @Post('/create')
  create(
    @Body({ schema: UserCreateRequestSchema }) body: UserCreateRequestDto
  ) {
    return this.userHttpService.create(body);
  }
}
```

**Schema example** (`src/modules/user/dtos/request/user.claim-username.request.dto.ts`):

```typescript
export const UserClaimUsernameRequestSchema = z.strictObject({
    username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9]+$/)
        .meta({
            description: 'username to claim',
            example: 'john_doe123',
        })
        .transform(value => value as Lowercase<string>),
});

export type UserClaimUsernameRequestDto = z.infer<
    typeof UserClaimUsernameRequestSchema
>;
```

Each request schema lives in `<module>/dtos/request/` and exports the `<Module><Action>RequestSchema` constant next to the `<Module><Action>RequestDto` type inferred from it, so the type and the runtime check can never drift apart.

### Path Parameters Validation

A path param is validated by pipes on the param itself, not by a schema:

```typescript
@Get('/get/:user')
findOne(
  @Param('user', RequestRequiredPipe, RequestIsValidObjectIdPipe) user: string
) {
  return this.userHttpService.get(user);
}
```

### Query Parameters

Pagination, search, and filtering arrive through the `@Pagination*` decorators of `src/common/pagination/` (see [Pagination][ref-doc-pagination]). A single extra filter is read with `@Query()` and validated by a pipe:

```typescript
@Get('/list')
async list(
  @PaginationOffsetQuery({
    availableSearch: ProjectDefaultAvailableSearch,
    availableOrderBy: ProjectDefaultAvailableOrderBy,
  })
  pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
  @Query('workspaceId', new RequestIsValidUuidPipe({ optional: true }))
  workspaceId?: string
) {
  return this.projectHttpService.getListForAdmin(pagination, workspaceId);
}
```

## Schema Shape

- **A root request schema is `z.strictObject`**, so an unknown key is a validation error rather than a silently dropped one.
- **Constraints live on the field**: `.min()`, `.max()`, `.regex()`, `z.enum()`. A field typed `z.string()` alone is unvalidated wire input.
- **Normalization runs at the boundary**: `.trim()`, `.toLowerCase()`, and `.transform()` on the schema mean every caller downstream sees one canonical value.
- **`.meta({ description, example })`** on every field is what the OpenAPI document is generated from. See [Doc][ref-doc-doc].
- **`.optional()`** marks an optional field. Request DTOs are the one layer where `undefined` is legal.

An issue message can be a message path, which the i18n layer resolves later:

```typescript
newPassword: z
    .string()
    .min(8)
    .max(50)
    .regex(RequestPasswordStrengthRegex, {
        error: () => 'request.error.isPassword.strong',
    })
```

`RequestPasswordStrengthRegex` (`src/common/request/constants/request.constant.ts`) asserts at least one uppercase letter, one lowercase letter, and one digit; length is checked by `.min()` / `.max()` beside it.

## Composing Schemas

Zod's own combinators build one schema from another. `.extend()`, `.omit()`, `.pick()`, and `.partial()` all preserve the strictness of the base, so only the root spells out `z.strictObject`.

**Extend**, to add fields to a base:

```typescript
export const UserCreateRequestSchema = UserClaimUsernameRequestSchema.extend({
    email: z.string().trim().toLowerCase().max(100),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    countryId: z.string().regex(/^[0-9a-fA-F]{24}$/),
});
```

**Pick**, to take a subset:

```typescript
export const UserImportRequestSchema = UserCreateRequestSchema.pick({
    email: true,
    name: true,
    username: true,
});
```

**Omit and partial**, to drop a field and relax the rest before adding new ones:

```typescript
export const UserChangePasswordRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.omit({ challengeToken: true })
        .partial()
        .extend({
            newPassword: z.string().min(8).max(50),
            oldPassword: z.string().min(1),
        });
```

## Shared Validations

Checks too detailed for a chained method live as plain functions in `src/common/request/validations/` and are called from `.superRefine()`.

**`validateEmail`** (`request.custom-email.validation.ts`) walks an address part by part (`@` count, domain length, domain labels, TLD, local part) and returns the i18n path of the first rule it fails, so the client is told which rule broke rather than that the address is invalid:

```typescript
email: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .superRefine((value, ctx) => {
        const validation = validateEmail(value);
        if (!validation.validated) {
            ctx.addIssue({
                code: 'custom',
                message: validation.messagePath,
            });
        }
    })
```

A module-specific check goes in that module's `validations/` folder instead.

## Validation Pipes

Pipes validate a single param, body field, or query value. A multi-field payload uses a schema.

**RequestRequiredPipe**
Throws `RequestParamRequiredException` when the value is missing or empty:

```typescript
@Get('/get/:user')
findOne(@Param('user', RequestRequiredPipe) user: string) {
  return this.userHttpService.get(user);
}
```

**RequestIsValidUuidPipe**
Validates UUID path parameters:

```typescript
@Get(':userId')
findOne(@Param('userId', RequestIsValidUuidPipe) userId: string) {
  return this.userService.findById(userId);
}
```

**File validation pipes**
`FileExtensionPipe` validates the upload extension. See [File Upload][ref-doc-file-upload].

## CSV Import Validation

A CSV import composes two pipes in order: `FileCsvParsePipe` parses the buffer into rows, then `FileCsvValidationPipe(schema)` validates every row against a request schema.

```typescript
@UploadedFile(
  RequestRequiredPipe,
  FileExtensionPipe([EnumFileExtensionDocument.csv]),
  FileCsvParsePipe,
  FileCsvValidationPipe(UserImportRequestSchema, {
    maxDataImportConfigKey: 'user.maxDataImport',
  })
)
data: UserImportRequestDto[]
```

The pipe caps the row count at the `file.maxDataImport` config value (100, overridable per pipe through `maxDataImportConfigKey`) by throwing `FileExceedMaxDataImportException`, rejects an empty file with `FileRequiredExtractFirstException`, and collects every per-row failure, keyed by row index, into one `FileImportException` handled by `AppValidationImportFilter`. See [File Upload][ref-doc-file-upload].

## Environment Variables

`AppEnvSchema` (`src/app/dtos/app.env.dto.ts`) is the zod schema `ConfigModule.forRoot()` validates `process.env` against at boot, so a missing or malformed variable stops the process instead of surfacing later as a runtime error. An env boolean is exactly `'true'` or `'false'`; every other spelling fails the boot. See [Environment][ref-doc-environment].

## Error Message Mapping

`RequestValidationException` carries the raw `StandardSchemaV1.Issue[]`, and `MessageService.setValidationMessage()` turns each one into an `IMessageValidationError`:

```typescript
interface IMessageValidationError {
  key: string;        // camelCase issue code, e.g. 'invalidFormat'
  property: string;   // dotted property path, e.g. 'address.street'
  message: string;    // localized message
}
```

**Per issue**:

1. `key` is the issue's `code` in camelCase (`too_small` becomes `tooSmall`). An issue with no string `code` falls back to `custom`.
2. `property` is the issue `path` joined with dots, so a nested field reads `address.street`. An empty path becomes `Unknown`.
3. `message` is resolved by translating `issue.message` first. When that path exists in the language file, its translation is used, which is how a schema raising `'request.error.isPassword.strong'` speaks for itself. When the translation comes back unchanged, the message is looked up under `request.error.{key}` instead, so a plain zod issue still gets a localized sentence.
4. Both lookups interpolate `{property}` with the last segment of the path.

## Error Message Translation

Messages are translated using [nestjs-i18n][ref-nestjs-i18n] through the [Message System][ref-doc-message].

**Message path pattern**: `request.error.{key}`

**Message file** (`src/languages/en/request.json`), one entry per zod issue code plus the nested groups a shared validation points at:

```json
{
  "error": {
    "invalidType": "{property} is not of the expected type.",
    "tooSmall": "{property} is shorter than the minimum allowed.",
    "tooBig": "{property} is longer than the maximum allowed.",
    "invalidFormat": "{property} does not match the expected format.",
    "invalidValue": "{property} is not one of the allowed values.",
    "unrecognizedKeys": "The request contains fields that are not allowed.",
    "custom": "{property} failed a validation rule.",
    "isPassword": {
      "strong": "{property} must be a strong password containing uppercase, lowercase, numbers, and special characters."
    },
    "email": {
      "invalid": "{property} should be a valid email address."
    }
  }
}
```

**Final response** (built by `AppValidationFilter`):
```json
{
  "statusCode": 50300,
  "statusCodeKey": "validation",
  "module": "request",
  "message": "There are validation errors.",
  "errors": [
    {
      "key": "custom",
      "property": "email",
      "message": "email should be a valid email address."
    },
    {
      "key": "tooSmall",
      "property": "password",
      "message": "password is shorter than the minimum allowed."
    }
  ],
  "metadata": {
    "language": "en",
    "timestamp": 1660190937231,
    "timezone": "Asia/Jakarta",
    "version": "1",
    "repoVersion": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "correlationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }
}
```

See [Handling Error][ref-doc-handling-error] for the complete error handling flow.


<!-- REFERENCES -->

[ref-zod]: https://zod.dev
[ref-zod-openapi]: https://github.com/samchungy/zod-openapi
[ref-standard-schema]: https://standardschema.dev
[ref-nestjs-i18n]: https://nestjs-i18n.com

[ref-doc-message]: message.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-doc]: doc.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-response]: response.md
[ref-doc-pagination]: pagination.md
[ref-doc-environment]: environment.md
