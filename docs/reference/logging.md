---
title: Logging Reference
description: The log levels, output targets, fields of a log record, redacted keys, and access-log exclusions.
---

# Logging Reference

This page lists the facts of the log output, for a developer who reads a log record or adds a sensitive key.

## Table of Contents

- [Related Documents](#related-documents)
- [Levels](#levels)
- [Output targets](#output-targets)
- [Log record fields](#log-record-fields)
- [Request and response fields](#request-and-response-fields)
- [Masked route segments](#masked-route-segments)
- [Redacted keys](#redacted-keys)
- [Redaction limits](#redaction-limits)
- [Access-log exclusions](#access-log-exclusions)

## Related Documents

- [Logging][ref-doc-concept-logging]: how the logger takes over, what a request log carries, and how failures end the process
- [Sentry][ref-doc-concept-sentry]: the scrub that reads the same key list
- [Middleware][ref-doc-reference-middleware]: the request id and Pino HTTP entries
- [Configuration Reference][ref-doc-reference-configuration-logger]: the `logger` keys and their environment variables

## Levels

`LOGGER_LEVEL` (`logger.level`) takes one of the six levels of `EnumLoggerLevel`. The `severity` column is the name `LoggerUtil.mapLevelToSeverity` gives a Pino level number: 60 and above is `CRITICAL`, 50 and above `ERROR`, 40 and above `WARNING`, 30 and above `INFO`, 20 and above `DEBUG`, and anything lower `TRACE`.

| Level | Pino number | `severity` in the record | Meaning |
| --- | --- | --- | --- |
| `fatal` | 60 | `CRITICAL` | The process cannot continue |
| `error` | 50 | `ERROR` | Someone must look |
| `warn` | 40 | `WARNING` | Degraded but handled |
| `info` | 30 | `INFO` | A lifecycle fact |
| `debug` | 20 | `DEBUG` | Detail, written at `debug` and `trace` |
| `trace` | 10 | `TRACE` | Detail, written at `trace` only |
| `silent` | above every level | none | `LOGGER_ENABLED` is off: Pino drops every line. It is a Pino level and not a member of `EnumLoggerLevel` |

## Output targets

| Target | Switch | Level filter | Behavior |
| --- | --- | --- | --- |
| Pretty console | `logger.prettyEnabled` (`LOGGER_PRETTY_ENABLED`) | records at or above `logger.level` | `pino-pretty` with colors, the level first, the time as `SYS:standard`, and the message as `[{context}] {msg}` |
| Rolling file | `logger.fileEnabled` (`LOGGER_FILE_ENABLED`) | records at or above `logger.level` | `pino-roll` writes `api.log` under `logger.filePath` (`/logs`, relative to the working directory of the process, so `./logs/api.log`), rolls daily or at 10 MB, and creates the folder |
| Standard output | neither switch is on | Pino's own level, `logger.level` | One JSON record per line |

## Log record fields

A record is one object with these fields, in this order:

| Field | Type | Holds |
| --- | --- | --- |
| `severity` | string | The Pino level number mapped to a severity name, as the Levels table shows |
| `context` | string | The class that logged, or `LoggerAutoContext` when none is set |
| `requestId` | string or `null` | The request id from the request store |
| `correlationId` | string or `null` | The correlation id from the request store |
| `userId` | string or `null` | The acting user from the request store |
| `timestamp` | number | The time in epoch milliseconds |
| `msg` | string | The message, cleaned of ANSI sequences, `~`, `→`, numbers at the start of a line (`^\s*\d+\s+` on each line), and extra whitespace |
| `service` | object | `name` (`app.name`), `environment` (`app.env`), and `version` (`app.version`) |
| `additionalData` | object | The extra data of the call, redacted by `LoggerUtil.redactValue`. Present only when the call passed some |
| `debug` | object | Outside production: `memory.rss` and `memory.heapUsed` in MB, `uptime` in seconds, `pid`, and `hostname` |
| `err` | object | A serialized error: `type`, `message`, `code` (the HTTP status of the error), `statusCode`, `stack`, and `cause`. The redacted keys do not apply to this object |
| `res` | object | The response, on the access-log line |
| `req` | object | The request, on the access-log line |

## Request and response fields

`req`, on the access-log line:

| Field | Holds |
| --- | --- |
| `method` | The HTTP method |
| `route` | The route template, or the URL with each dynamic segment replaced by `[REDACTED]` ([Masked route segments](#masked-route-segments)) |
| `userAgent` | The `user-agent` header |
| `contentType` | The `content-type` header |
| `referer` | The `referer` header reduced to its origin and its path with the dynamic segments replaced by `[REDACTED]`, or `null`. The key `referer` redacts the `referer` header inside `headers` and `query`, and this top-level field keeps the replaced URL |
| `ip` | `request.ip`, the socket address, or `unknown` |
| `query` | The query, redacted |
| `params` | Each route param name with the value `[REDACTED]` |
| `headers` | The headers, redacted |

`res`, on the access-log line:

| Field | Holds |
| --- | --- |
| `httpCode` | The status code |
| `contentLength` | The `content-length` header |
| `responseTime` | The `X-Response-Time` header, in milliseconds with the `ms` suffix |
| `headers` | The response headers, redacted |

## Masked route segments

`LoggerUrlUtil.maskUrl` keeps the static segments of a path, replaces every other segment with `[REDACTED]`, and drops the query string and the fragment. `LoggerUrlStaticSegmentRegex` decides:

| Segment | Result |
| --- | --- |
| `:name`, a route placeholder of letters | kept |
| `v` and digits, such as `v1` | kept |
| lower-case letters and dashes, optionally after leading digits, such as `users`, `sign-up`, `2fa` | kept |
| digits only, such as `123` | replaced |
| any segment with an upper-case letter, `_`, `.`, or another character | replaced |
| an empty segment | kept |

## Redacted keys

`LoggerSensitiveFields` (`src/common/logger/constants/logger.constant.ts`) lists 41 keys, matched case-insensitively and sorted here alphabetically. The marker is `[REDACTED]`.

`accessToken`, `apiKey`, `authorization`, `backupCode`, `backupCodes`, `bearer`, `challengeToken`, `code`, `cookie`, `cookies`, `coordinates`, `credential`, `encryptedInviteAcceptLink`, `encryptedJoinRequestReviewLink`, `encryptedLink`, `encryptedPassword`, `gps`, `inviteToken`, `jwt`, `latitude`, `link`, `location`, `longitude`, `newPassword`, `nonce`, `oldPassword`, `otp`, `otpauthUrl`, `passkeyChallengeToken`, `password`, `pendingSecret`, `privateKey`, `recoveryCode`, `referer`, `refreshToken`, `secret`, `secretKey`, `sessionId`, `set-cookie`, `token`, and `x-api-key`.

Pino's `redact` option takes each key under these container paths. A key with a dash is addressed as `container["key"]`.

| Container | Paths |
| --- | --- |
| `req` | `req.body`, `req.headers`, `req.query`, `req.params` |
| `res` | `res.body`, `res.headers` |
| `request` | `request.body`, `request.headers`, `request.query`, `request.params` |
| `response` | `response.body`, `response.headers` |

The record has `req` and `res` and no body, so the `body`, `request`, and `response` paths match no field of the tables above.

## Redaction limits

Depth counts from the value handed to `LoggerUtil.redactValue`, which is depth 0.

| Limit | Value | Applies to |
| --- | --- | --- |
| `LoggerRedactMaxDepth` | 5 | `LoggerUtil.redactValue`: an object at depth 5 is replaced whole with `[REDACTED]` |
| `LoggerRedactMaxArrayLength` | 10 | `LoggerUtil.redactValue`: an array is cut after 10 items, and one final item `{ truncated: '...[TRUNCATED] - total length <n>' }` holds the total length |
| `LoggerSentryRedactMaxDepth` | 10 | The Sentry scrub of events, contexts, and bodies |
| Buffer | `{ buffer: '[BUFFER]' }` | `LoggerUtil.redactValue` |
| Error cause depth | 5 | `LoggerUtil.serializeError`, counted by its own counter from the error: a cause past depth 5 is left out of `cause` |

## Access-log exclusions

`logger.excludedRoutes` skips the paths below on the access-log line when `logger.accessLogEnabled` is on. The same list excludes events and traces from Sentry, whatever `logger.accessLogEnabled` holds.

- `/api/public/hello` and `/api/public/hello/*`
- `/api/system/health` and `/api/system/health/*`
- `/metrics` and `/metrics/*`
- `/favicon.ico`
- the Swagger prefix (`/docs`) and `/docs/*`
- `/`

The list follows the global prefix (`app.globalPrefix`, `/api`) and the Swagger prefix (`doc.prefix`). The hello and health routes are version neutral, so no pattern holds a version segment.

`LoggerUrlUtil.matchesPatterns` matches the path of the URL, without the query string and the fragment, in lower case:

| Pattern | Matches |
| --- | --- |
| no `*` | the path equal to the pattern |
| ends in `*` | the path equal to the text before the `*`, or that starts with that text followed by `/`; when the text ends in `/`, the path that starts with it |
| an inner `*` | the path that starts with the text before the first `*`, ends with the text after the last `*`, and holds the text between them in order |

<!-- REFERENCES -->

[ref-doc-concept-logging]: ../concepts/logging.md
[ref-doc-concept-sentry]: ../concepts/sentry.md
[ref-doc-reference-middleware]: middleware.md
[ref-doc-reference-configuration-logger]: configuration.md#logger
