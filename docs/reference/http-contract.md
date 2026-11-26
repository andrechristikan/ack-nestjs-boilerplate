---
title: HTTP Contract
description: The success envelope, the error envelope, the base metadata fields, and the request and response headers of every API response.
---

# HTTP Contract

This page lists the shapes and headers a client sees on every response, for a developer who writes a client or reads a response.

## Table of Contents

- [Related Documents](#related-documents)
- [Success envelope](#success-envelope)
- [Error envelope](#error-envelope)
- [Metadata](#metadata)
- [Response headers](#response-headers)
- [Request headers](#request-headers)

## Related Documents

- [Response][ref-doc-response]: how a handler's return becomes the success envelope
- [Error Handling][ref-doc-error-handling]: how a failure becomes the error envelope
- [Request Validation][ref-doc-request-validation]: the `errors` entries of a validation failure
- [I18n][ref-doc-i18n]: the language of `message` and `metadata.language`
- [Pagination Reference][ref-doc-reference-pagination]: the pagination metadata fields
- [Status Codes][ref-doc-reference-status-codes]: the `statusCode` of every exception
- [Security][ref-doc-security]: the rate-limit headers and the security headers

## Success envelope

A route that declares a schema answers `{ statusCode, message, metadata, data }`. A route with no payload omits `data`. The schema is `ResponseSchema` (`src/common/response/dtos/response.dto.ts`).

| Field | Type | Description |
| --- | --- | --- |
| `statusCode` | `number` | The HTTP status by default. A use case overrides this field alone through `metadata.statusCode` on its return, and overrides the HTTP status alone through `metadata.httpStatus`, so a success `statusCode` can differ from the HTTP status. Only the database health route sets either, both to 503 |
| `message` | `string` | The localized message of the route's message path |
| `metadata` | object | [Metadata](#metadata) |
| `data` | route schema | The payload, validated and stripped by the route's response schema. Absent on a route with no payload |

- The HTTP status is `201` for a `POST`, `200` otherwise, or the value of `@HttpCode`.
- A paginated route answers `data` as an array and extends `metadata` with the pagination fields, which [Pagination Reference][ref-doc-reference-pagination-metadata] lists.
- A file route answers the file bytes with no envelope, and the metadata headers still apply.

## Error envelope

Every failure answers `{ statusCode, statusCodeKey, module, message, metadata }`, with the optional fields below. The schema is `ResponseErrorSchema` (`src/common/response/dtos/response.error.dto.ts`).

| Field | Type | Description |
| --- | --- | --- |
| `statusCode` | `number` | The application status code of the exception, or the HTTP status for a framework error. It is not the HTTP status of an application error ([Status Codes][ref-doc-reference-status-codes]) |
| `statusCodeKey` | `string` | The member name of the status-code enum. A framework error carries the camelCase HTTP status name |
| `module` | `string` | The owning module of the exception. A framework error carries `http`, and an unknown error carries `app` |
| `message` | `string` | The localized message of the exception's message path |
| `metadata` | object | [Metadata](#metadata). An exception's own metadata adds keys beneath the standard ones |
| `data` | `unknown` | Optional. `AppHttpFilter` copies it from the `HttpException` response object, and no other filter sets it |
| `errors` | array | Optional. The field errors of a request, or the row errors of an import |

- A validation failure answers `errors` entries of `{ key, property, message }`, with the status code `50300`, the module `request`, and HTTP 422.
- A failed CSV import answers `errors` entries of `{ row, errors }`, where `errors` holds the same three fields per issue. It carries the status code `50110` and the module `file`, with HTTP 422.
- An error never carries the cause of the failure. The cause is logged and reported to Sentry.
- An unknown error answers HTTP 500 with the status code `50000`, the key `unknown`, and the module `app`.
- A rate-limited request answers HTTP 429 from the framework filter, with the `statusCode` `429`, the key `tooManyRequests`, and the module `http`.

## Metadata

The base `metadata` is `ResponseMetadataSchema` (`src/common/response/dtos/response.metadata.dto.ts`), built by `ResponseMetadataService.create()` for a success and for a failure.

| Field | Type | Description |
| --- | --- | --- |
| `language` | `string` | The language the message resolved in. `en` is the one shipped |
| `timestamp` | `string` | The time of the response as ISO 8601 with an offset |
| `timezone` | `string` | The time zone of the application |
| `version` | `string` | The API version of the request URL, or the default version `1` (`app.urlVersioning.defaultVersion`) |
| `repoVersion` | `string` | The application version from `package.json` |
| `requestId` | `string` or `null` | The request id. The request id middleware keeps a valid `x-request-id` and generates a UUID v7 when the header is missing or invalid. `null` only when the request store holds none, which a response built before that middleware ran would show |
| `correlationId` | `string` or `null` | The correlation id, resolved by the same rule from `x-correlation-id`. A missing header gets a new UUID v7 of its own, not the request id. `null` when the request store holds none |

## Response headers

`ResponseMetadataService.setHeaders` writes the metadata headers on every success and every failure.

| Header | Value |
| --- | --- |
| `x-custom-lang` | `metadata.language` |
| `x-timestamp` | `metadata.timestamp` |
| `x-timezone` | `metadata.timezone` |
| `x-version` | `metadata.version` |
| `x-repo-version` | `metadata.repoVersion` |
| `x-request-id` | `metadata.requestId`, omitted when it is `null` |
| `x-correlation-id` | `metadata.correlationId`, omitted when it is `null` |
| `X-Response-Time` | The handling time in milliseconds, from the response-time middleware |
| `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` | The default limiter, on every request that passes it |
| `X-RateLimit-Limit-route`, `X-RateLimit-Remaining-route`, `X-RateLimit-Reset-route` | The route limiter, on a route that names a tier |
| `X-RateLimit-Limit-user`, `X-RateLimit-Remaining-user`, `X-RateLimit-Reset-user` | The user limiter, on a route that sets `user: true` |
| `Retry-After` | Seconds until a blocked limiter admits the client, on a 429. A 429 carries no `X-RateLimit-*` header of the limiter that blocked it, and keeps the headers of a limiter that already admitted the request |
| `Content-Disposition` | `attachment` with the filename, on a file download |

- The security headers of every response are listed in [Security][ref-doc-security-headers].
- `request.cors.exposedHeaders` lists the metadata headers, `Retry-After`, and the nine rate-limit headers, so a browser client reads them across origins.

## Request headers

| Header | Meaning |
| --- | --- |
| `x-api-key` | The API key and secret of the calling application, as `key:secret` |
| `Authorization` | The bearer token of the signed-in user, or of a social provider on a social sign-in route |
| `x-custom-lang` | The requested language. A value outside the available languages falls back to the default |
| `x-request-id` | An optional request id. A value of at most 128 characters from `A-Z a-z 0-9 . _ -` is kept, and any other value is replaced with a server-generated UUID v7 |
| `x-correlation-id` | An optional correlation id, resolved by the same rule as the request id |
| `x-workspace-id` | The active workspace of a workspace-scoped route |
| `x-anonymous-id` | The anonymous identity that a percentage rollout of a feature flag uses for a caller with no user |

- The CORS allowed list in `request.cors.allowedHeaders` holds every header above.

<!-- REFERENCES -->

[ref-doc-response]: ../concepts/response.md
[ref-doc-error-handling]: ../concepts/error-handling.md
[ref-doc-request-validation]: ../concepts/request-validation.md
[ref-doc-i18n]: ../concepts/i18n.md
[ref-doc-reference-pagination]: pagination.md
[ref-doc-reference-pagination-metadata]: pagination.md#metadata-fields
[ref-doc-reference-status-codes]: status-codes.md
[ref-doc-security]: ../concepts/security.md
[ref-doc-security-headers]: ../concepts/security.md#headers
