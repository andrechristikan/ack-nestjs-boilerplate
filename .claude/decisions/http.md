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
