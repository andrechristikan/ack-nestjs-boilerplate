# HTTP decisions

## Routes and responses

### A request with a body is never `DELETE`

Rule: `http.md`, Route path shape.

- The proof in a `DELETE` body: RFC 9110 gives it no semantics, and an intermediary may drop it.

### A guard-loaded id is read raw and answers not-found

Rule: `guards.md`, Guards.

- The guard validates and answers 422: the workspace header takes the same raw path and would still answer 404 beside it, and the doc kit has no entry for a param.

### Response metadata is typed by its schema, and an exception adds keys through its `metadata` option

Rule: `filter.md`.

- An open record on the metadata type: any key type-checks as metadata.
- No `metadata` option on the exception: the owner keeps response metadata as part of the template, and an error answering with extra keys needs the option.

### `PaginationQueryUtil` returns the search `where` with no type argument

Rule: `pagination.md`.

- A caller-chosen `TArgsWhere`: the util builds only the search `OR`, so the argument named a type it never produced and needed a cast.

### A refused request is logged by status in the filters

Rule: `filter.md`.

- Requiring `LOGGER_ACCESS_LOG_ENABLED` in production: the access log records every request, the refused ones lost among them.
- Logging every 4xx: a mistyped route and every business error drown the refusals.

### A regex holds characters, a whole-value length is `.min()`, `.max()`, or `.length()`

Rule: `code-style.md`, Literal strings.

- A length quantifier inside the regex (`{32,128}`): a too-short or too-long value answers a format error instead of a length error, the OpenAPI document loses `minLength` and `maxLength`, and a reader no longer finds every length bound in one shape outside the regex, schema and plain code alike.

### A DTO is a zod schema and its inferred type

Rule: `dto.md`.

- DTO classes with class-validator, class-transformer, and `@nestjs/swagger` property decorators: the runtime check, the static type, the response strip, and the OpenAPI shape would be parallel declarations that drift, where one schema yields all four.

### A route is an action path under a scope prefix

Rule: `http.md`, Route path shape.

- REST resource routes with the scope decided by guards (`PATCH /users/:id`): an action segment keeps several writes on one resource apart, and a scope prefix lets one router module mount one guard family.

### An update is a full replace

Rule: `null-safety.md`, Update and create.

- PATCH semantics (optional fields, an omitted field left unchanged): a partial update needs a third "unchanged" state beside a value and `null`, the omit-or-null ambiguity the null rules remove.

### A service throws a typed exception class with a module status code

Rule: `exceptions.md`, Who throws.

- Nest's built-in `HttpException` family with a message string: it carries an HTTP status and a string only, where a class per failure gives a client a stable `module` and `statusCode` pair and one i18n path.

### Admin lists are offset, every other list is cursor with no count

Rule: `pagination.md`.

- Offset everywhere: a user-facing list would pay for a count and a deep skip.
- Cursor everywhere: a back-office table needs page jumps and totals, over sets small enough to count.

### Offset pagination caps its metadata at the page cap

Rule: `pagination-kit.md`.

- Removing the page cap for a `maxSkip` bound: a new config key for a window that search and filters already reach.

### The email local part holds letters, digits, `-`, `_`, and `.`

Rule: `dto.md`, Shape.

- `+`: no large provider's primary address holds it, and a plus alias lets one mailbox open many accounts.
- The full RFC 5322 character set: addresses stay plain.
- Refusing `.`: it refuses most work addresses.

### The workspace id travels in the `x-workspace-id` header

Rule: `guards.md`, Guards.

- A `:workspaceId` route param: every workspace-scoped path would carry the id, where a header lets a client switch its active workspace without rewriting a path.

### A generated or config-windowed analytic route takes no window from the client

Rule: `analytic.md`, On request or generated.

- Reading the snapshot for the configured window and computing any other window on request: the expensive path stays reachable and two code paths are kept.
- A client `windowMs` on an on-request signal: the signal runs on request because its index bounds it to the configured window, and a wider one is a scan.

### A list sorts by a named preset the backend defines

Rule: `pagination.md`.

- `field:direction` from the client: the client must know the backend's fields and directions, and a default must be kept inside an allow-list beside it.
- A `defaultOrderBy` of terms kept inside a field allow-list: two constants to keep in step where one constant names the presets.
- A required `default` key in every constant: its name says nothing about the order, and the same terms under a second name (`latest`) duplicate it.
- Preset names as plain keys of the constant: each name is a magic string, and the request DTO reaches the names only through a cast of `Object.keys`.
- A metadata fallback (`''`, `[]`) when a paginated route left no store entry: it hides the route's missing store merge and answers a sort that never ran.
- A runtime check of the default: a wrong default shows only on a request, as a 500.

### A generated analytic list defaults to `value` desc through its `highestValue` preset as `defaultOrderBy`

Rule: `pagination.md`.

- The snapshot repository swapping in its own sort: the response metadata would name a sort the data does not follow.
- The kit default, `createdAt` desc: `createdAt` is the write time of a row's batch, so the list runs in reverse write order, which says nothing about the signal.

## Response headers

### A content security policy on every response, with its own policy on the docs path

Rule: `security.md`, Response headers.

- No policy on the docs path: the docs page would be the one response outside the standard.
- No policy at all on a JSON API: ASVS requires a global policy on every response whatever the body type.

### `*` is refused as a CORS origin in production only

Rule: `config.md`.

- Refused in every environment: every local setup would need an origin list for clients whose origin changes.
- Allowed everywhere: the standard requires an allowlist for sensitive responses.

## Files and import

### The browser uploads straight to S3 through a presigned URL

Rule: `file.md`, S3 presign.

- A multipart upload through the API, then a server-side put: the bytes would cross the API, holding its memory and request time for every upload.

### Admin import is a job, export is not

Rule: `login.md`.

- Synchronous import: hashing up to fifty passwords and one bulk transaction would hold the request open.
- Asynchronous export: the response is the file.

### S3 without bucket versioning

Rule: `file.md`.

- Version-aware list and delete: the bucket is not versioned by design.

### A file import route documents its errors through `@FileImportSingle`

Rule: `file.md`, CSV import; `http.md`.

- `DocErrors` on the import route's controller method: a controller calls no `DocErrors`.
- An import option on `FileUploadSingle`: a knob on the upload decorator for one route kind.

### No antivirus scanner

Rule: `file.md`, Upload validation is a pipe.

- A ClamAV container with a scan job and a quarantine state: it adds a container to both compose files, a queue, and a photo state every client must handle, for files that are already signature-checked images and text templates.
