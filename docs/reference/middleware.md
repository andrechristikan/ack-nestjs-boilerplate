---
title: Middleware Reference
description: Each request middleware and global, upload, or response interceptor with its run order, config keys, and behavior.
---

# Middleware Reference

This page lists every middleware and request or response interceptor of the HTTP kit, for a developer who looks up what runs on a request and which key tunes it.

## Table of Contents

- [Related Documents](#related-documents)
- [Pino HTTP](#pino-http)
- [Request store](#request-store)
- [Request ID](#request-id)
- [Request log](#request-log)
- [Helmet](#helmet)
- [Body parser](#body-parser)
- [CORS](#cors)
- [URL version](#url-version)
- [Response time](#response-time)
- [Custom language](#custom-language)
- [Compression](#compression)
- [Active workspace](#active-workspace)
- [Request timeout](#request-timeout)
- [Upload interceptors](#upload-interceptors)
- [Response interceptors](#response-interceptors)

## Related Documents

- [Request Pipeline][ref-doc-request-pipeline]: the order of the stages and why it holds
- [Security][ref-doc-security]: the headers, the rate limits, CORS, and the timeout in depth
- [Configuration Reference][ref-doc-reference-configuration-request]: every `request` key with its default
- [HTTP Contract][ref-doc-http-contract]: the headers and metadata the entries below write
- [I18n][ref-doc-i18n]: the language the custom language middleware resolves

Every entry has the same fields: its class, where it is mounted, the order, the config keys, and what it does. A field with no value reads `none`. The chain order is the array order in `src/common/request/request.middleware.module.ts`, and all nine middlewares of the chain apply to every route. Nest registers the middleware of global modules first and the other modules by distance from the root, so the two entries before the chain run first and `WorkspaceIdMiddleware` runs after it.

## Pino HTTP

- Class: the HTTP middleware of `nestjs-pino`, mounted by the logger module.
- Order: before the chain.
- Config keys: `logger.accessLogEnabled`.
- Behavior: it writes the access log of every route when the key is on.

## Request store

- Class: `ClsMiddleware`, mounted by `ClsModule.forRoot` in `RequestModule`.
- Order: before the chain.
- Config keys: none.
- Behavior: it opens the request store, so the chain finds it ready.

## Request ID

- Class: `RequestRequestIdMiddleware`, mounted by `RequestMiddlewareModule`.
- Order: 1.
- Config keys: none.
- Behavior:
    - It keeps the inbound `x-request-id` when it is a string of at most 128 characters from `A-Z a-z 0-9 . _ -`. Any other value, and a missing header, gets a new UUID v7.
    - It resolves `x-correlation-id` by the same rule. A missing correlation id becomes a new UUID v7 of its own, not a copy of the request id.
    - It writes both ids to `req.id` and `req.correlationId`, to the matching request headers, and to the request store, where the logger and the response metadata read them.

## Request log

- Class: `RequestRequestLogMiddleware`, mounted by `RequestMiddlewareModule`.
- Order: 2.
- Config keys: none.
- Behavior: it resolves the user agent, the client IP, and the geo-location once, through `RequestUtil.buildRequestLog`, and writes the result to the request store. The IP is `req.ip` with the socket address as a fallback. A field it cannot resolve is stored as `null`.

## Helmet

- Class: `RequestHelmetMiddleware`, mounted by `RequestMiddlewareModule`.
- Order: 3.
- Config keys: `request.helmet.maxAgeInSeconds`, `request.helmet.includeSubDomainsEnabled`, and `request.helmet.preloadEnabled`.
- Behavior: it sets `Cache-Control: no-store` and runs Helmet with an explicit options object. The headers it sets are listed in [Security][ref-doc-security-headers].

## Body parser

- Class: `RequestBodyParserMiddleware`, mounted by `RequestMiddlewareModule`.
- Order: 4.
- Config keys: `request.body.json.limitInBytes`, `request.body.text.limitInBytes`, `request.body.urlencoded.limitInBytes`, and `request.body.applicationOctetStream.limitInBytes`.
- Behavior:
    - It picks the parser from the `Content-Type`: `application/json`, `application/x-www-form-urlencoded`, `text/*`, or `application/octet-stream`. Any other type, `multipart/form-data` included, passes through to the upload interceptors.
    - A parser error with status 413 becomes `RequestPayloadTooLargeException`, and 415 becomes `RequestUnsupportedMediaTypeException`.
    - Any other 4xx becomes a `RequestValidationException` with one `invalid_format` issue on `body`.

## CORS

- Class: `RequestCorsMiddleware`, mounted by `RequestMiddlewareModule`.
- Order: 5.
- Config keys: `request.cors.allowedOrigins`, `request.cors.allowedMethods`, `request.cors.allowedHeaders`, `request.cors.exposedHeaders`, and `request.cors.maxAgeInSeconds`.
- Behavior: it matches the `Origin` against the allowed patterns, allows credentials unless the list holds `*`, and answers a preflight with 204. The matching rules are in [Security][ref-doc-security-cors].

## URL version

- Class: `RequestUrlVersionMiddleware`, mounted by `RequestMiddlewareModule`.
- Order: 6.
- Config keys: `app.globalPrefix`, `app.urlVersioning.enabled`, `app.urlVersioning.prefix`, and `app.urlVersioning.defaultVersion`.
- Behavior: when versioning is on and the URL starts with the global prefix and the version prefix, it reads the version from the second path segment, so `/api/v1/...` is version `1`. Otherwise it takes the default version. It writes the result to the request store, which the response metadata reads.

## Response time

- Class: `RequestResponseTimeMiddleware`, mounted by `RequestMiddlewareModule`.
- Order: 7.
- Config keys: none.
- Behavior: it wraps the `response-time` package and sets the `X-Response-Time` header with the handling time in milliseconds.

## Custom language

- Class: `RequestCustomLanguageMiddleware`, mounted by `RequestMiddlewareModule`.
- Order: 8.
- Config keys: `message.availableLanguages` and `message.defaultLanguage`.
- Behavior: it normalizes the `x-custom-lang` header, keeps it only when it names an available language, and writes the result to the request store and back to the header. The rules are in [I18n][ref-doc-i18n-resolution].

## Compression

- Class: `RequestCompressionMiddleware`, mounted by `RequestMiddlewareModule`.
- Order: 9.
- Config keys: none.
- Behavior: it wraps the `compression` package with its defaults and compresses responses the client accepts.

## Active workspace

- Class: `WorkspaceIdMiddleware`, mounted by `WorkspaceModule` in its own `configure`.
- Order: after the chain, outside the array above.
- Config keys: none.
- Behavior: it copies the `x-workspace-id` header into the request store, or `null` when the header is absent or not a string. It validates nothing, because the workspace guard resolves and validates the id.

## Request timeout

- Class: `RequestTimeoutInterceptor`, an `APP_INTERCEPTOR` provided by `RequestModule.forRoot()`.
- Order: the outermost interceptor. A global interceptor runs before the interceptors of a route and, on the way out, after them, so the limit covers the upload parsing, the handler, and the response interceptor.
- Config keys: `request.timeoutInMs`.
- Behavior: it fails a handler that runs past the limit with `RequestTimeoutException` (HTTP 408). `@RequestTimeout('1m')` sets another limit for one handler, in the [ms][ref-ms] format.
- `RequestUploadTimeout` is the constant `'1m'` in `src/common/request/constants/request.constant.ts`. A route that accepts an upload passes it to `@RequestTimeout`.

## Upload interceptors

A route that accepts a multipart body mounts them through `@FileUploadSingle`, `@FileImportSingle`, `@FileUploadMultiple`, or `@FileUploadMultipleFields`. A route with no upload decorator mounts none.

- Class: `FileUploadErrorInterceptor`, then Multer's `FileInterceptor`, `FilesInterceptor`, or `FileFieldsInterceptor`, mounted by the decorator. `@FileImportSingle` wraps `@FileUploadSingle`.
- Order: inside the timeout interceptor and before the response interceptor, in the order of the decorators nearest the method.
- Config keys: none. The size limit is the `fileSize` option of the decorator, `FileSizeInBytes` (10 MB) by default, and a multiple upload takes at most `FileMaxMultiple` (3) files.
- Behavior: Multer parses the multipart body. `FileUploadErrorInterceptor` maps a Multer limit error to a typed `file` exception: `FileExceedMaxSizeUploadException`, `FileExceedMaxFilesException`, `FileFieldUnexpectedException`, or `FileMultipartInvalidException`.

## Response interceptors

Three interceptors build the response. A route mounts one through its response decorator, and each runs after the upload interceptors and inside the timeout interceptor. All three set the metadata headers through `ResponseMetadataService`. The behavior of each is in [Response][ref-doc-response].

### ResponseInterceptor

- Class: `ResponseInterceptor`, mounted by `@Response`.
- Order: innermost, around the handler.
- Config keys: none.
- Behavior: it validates the payload against the route schema, resolves the message, and wraps both in the success envelope.

### ResponsePaginationInterceptor

- Class: `ResponsePaginationInterceptor`, mounted by `@ResponsePagination`.
- Order: innermost, around the handler.
- Config keys: none.
- Behavior: it serializes each row, then merges the page and the request-store list state into the metadata.

### ResponseFileInterceptor

- Class: `ResponseFileInterceptor`, mounted by `@ResponseFile`.
- Order: innermost, around the handler.
- Config keys: `response.filenameExportPattern`, `file.maxSizeExportInBytes`, and `file.maxDataExport`, or the config key the route names for its row cap.
- Behavior: it validates the file payload, enforces the row and size caps, and answers a `StreamableFile` with a `Content-Disposition: attachment` header.

<!-- REFERENCES -->

[ref-ms]: https://github.com/vercel/ms
[ref-doc-request-pipeline]: ../concepts/request-pipeline.md
[ref-doc-security]: ../concepts/security.md
[ref-doc-security-headers]: ../concepts/security.md#headers
[ref-doc-security-cors]: ../concepts/security.md#cors
[ref-doc-reference-configuration-request]: configuration.md#request
[ref-doc-http-contract]: http-contract.md
[ref-doc-i18n]: ../concepts/i18n.md
[ref-doc-i18n-resolution]: ../concepts/i18n.md#language-resolution
[ref-doc-response]: ../concepts/response.md
