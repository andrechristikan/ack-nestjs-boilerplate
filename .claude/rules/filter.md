---
paths:
    - 'src/app/**'
---

# The filter chain

`AGENTS.md` states the `APP_FILTER` order in `src/app/app.module.ts`; do not reorder the array. Most specific first:

- `AppValidationImportFilter`: `FileImportException`, no Sentry.
- `AppValidationFilter`: `RequestValidationException`, no Sentry.
- `AppHttpFilter`: `HttpException`, the error log and Sentry at 5xx.
- `AppGeneralFilter` (`@Catch()`), the single translator for everything else: an `AppBaseException` renders as itself; an `AppUnknownException` whose `rawError` maps through `DatabaseUtil.toException` or `CacheService.isConnectionError` renders as the mapped exception; any other error is mapped the same way or answers 500 as `AppUnknownException`.

The mappings: the Prisma ones in `database.md`; a Redis connection error (`cache.md`) to `RedisUnavailableException` (503). The body is `ResponseErrorSchema` (`src/common/response/dtos/response.error.dto.ts`).
