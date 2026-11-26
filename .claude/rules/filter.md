---
paths:
    - 'src/app/**'
---

# The filter chain

`AGENTS.md` states the `APP_FILTER` order in `src/app/app.module.ts`; do not reorder the array. Most specific first:

- `AppValidationImportFilter`: `FileImportException`, no Sentry.
- `AppValidationFilter`: `RequestValidationException`, no Sentry.
- `AppHttpFilter`: `HttpException`, the error log and Sentry at 5xx.
- `AppGeneralFilter` (`@Catch()`), the single translator for everything else: an `AppBaseException` renders as itself, anything else as `AppUnknownException` (500); it maps no Redis, database, or third-party error.

A refused request leaves one `warn`, `'A request was refused'` with `statusCode`, `statusCodeKey`, and `httpStatus`, when the answered status is in `AppRefusalLogStatuses` (401, 403, 413, 415, 422, 429). `AppGeneralFilter`, `AppValidationFilter`, and `AppHttpFilter` write it; `AppHttpFilter` has no project status code, and `AppValidationImportFilter` writes none. The line does not depend on `LOGGER_ACCESS_LOG_ENABLED` and never reaches Sentry; every other status below 500 writes no line.

The body is `ResponseErrorSchema` (`src/common/response/dtos/response.error.dto.ts`); its metadata holds the schema's keys, and an exception's own `metadata` option (`IAppBaseExceptionOptions`) adds keys beneath them, the schema's keys winning (`AppGeneralFilter`); the option is the named map `IAppBaseExceptionMetadata`, flat primitive values under any key.
