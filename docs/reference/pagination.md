---
title: Pagination Reference
description: The query parameters, limits, metadata fields, service methods, filter helpers, and errors of the offset and cursor list kit.
---

# Pagination Reference

This page lists the facts of the pagination kit in `src/common/pagination/`, for a developer who builds a list route or consumes one.

## Table of Contents

- [Related Documents](#related-documents)
- [Query parameters](#query-parameters)
- [Limits](#limits)
- [Metadata fields](#metadata-fields)
- [PaginationService](#paginationservice)
- [PaginationQueryUtil](#paginationqueryutil)
- [PaginationFilterUtil](#paginationfilterutil)
- [Errors](#errors)

## Related Documents

- [Pagination][ref-doc-concept-pagination]: how offset, cursor, sealing, and presets work
- [Pagination Guide][ref-doc-guide-pagination]: build an offset or cursor list route
- [HTTP Contract][ref-doc-http-contract]: the envelope the metadata sits in
- [Status Codes][ref-doc-reference-status-codes]: the code of each error below
- [Response][ref-doc-response]: the interceptor that builds the page metadata

## Query parameters

The base schemas are `PaginationOffsetQuerySchema` and `PaginationCursorQuerySchema`. A list schema extends one of them and adds its `orderBy` and its filters.

| Parameter | Strategy | Type | Description |
| --- | --- | --- | --- |
| `page` | offset | integer | The 1-based page number. Absent means 1 |
| `cursor` | cursor | string | The `nextCursor` of the previous page. Absent or blank means the first page |
| `perPage` | both | integer | Rows per page. Absent means the route's default, `20` unless the route sets another |
| `search` | both | string | A case-insensitive partial match across the route's search fields. Trimmed, at most 100 characters. A longer value answers HTTP 422 with the code `50300`, from the list schema |
| `orderBy` | both | string | One preset name of the route, or an empty string. Absent or empty means the route's default preset, the `defaultOrderBy` the use case passes |
| a filter | both | string | A route's own field. An enum filter takes a comma-separated list. The route's schema bounds it at 256 characters, and a longer value answers HTTP 422 with the code `50300` |

## Limits

| Limit | Value | Constant |
| --- | --- | --- |
| Default `perPage` | 20 | `PaginationDefaultPerPage` |
| Maximum `perPage` | 100 | `PaginationDefaultMaxPerPage` |
| Maximum `page` | 20 | `PaginationDefaultMaxPage` |
| Maximum `search` length | 100 characters | `PaginationDefaultMaxSearchLength` |
| Maximum filter length | 256 characters, set on each route's filter field | `PaginationMaxFilterLength` |
| Maximum cursor length | 2560 characters | `PaginationMaxCursorLength` |
| Cursor characters | `A-Za-z0-9_.-` | `PaginationCursorFormatRegex` |
| Cursor fingerprint | 16 hex characters | `PaginationCursorFingerprintLength` |
| Sort of a read with no preset | `createdAt` descending | `PaginationDefaultOrderBy` |
| Tiebreak field | `id` | `PaginationDefaultCursorField` |

## Metadata fields

A paginated response adds these fields to the base [metadata][ref-doc-http-contract-metadata]. The schema is `ResponsePaginationMetadataSchema`.

| Field | Strategy | Type | Description |
| --- | --- | --- | --- |
| `type` | both | `offset` or `cursor` | The strategy of the response |
| `perPage` | both | number | Rows per page |
| `count` | offset, or cursor with a count | number | The total of matching rows |
| `hasNext` | both | boolean | Whether a next page exists |
| `hasPrevious` | both | boolean | Whether a previous page exists. Always `false` on a cursor page |
| `page` | offset | number | The current page, 1-based |
| `totalPage` | offset | number | The number of pages, at most 20 |
| `nextPage` | offset | number | Present when `hasNext` is `true` |
| `previousPage` | offset | number | Present when `hasPrevious` is `true` |
| `nextCursor` | cursor | string | Present when `hasNext` is `true` |
| `search` | both | string | The applied search term. Present only when the route has search fields and the term is not blank |
| `filters` | both | object | The applied filters, by field name |
| `orderBy` | both | string | The name of the preset applied |
| `availableSearch` | both | string array | The search fields of the route. Empty when the route has none |
| `availableOrderBy` | both | string array | The preset names of the route |
| `computedAt` | generated lists | date | When the stored result behind the list was computed. Absent on any other list |

- `previousCursor` is declared on the schema and never populated.
- `data` is the array of rows, validated against the route's item schema.

## PaginationService

`PaginationService` (`src/common/pagination/services/pagination.service.ts`) pages at the database. A repository injects it and passes the Prisma delegate of the model it owns.

| Method | Arguments | Returns |
| --- | --- | --- |
| `offset(delegate, args)` | `args` is `IPaginationOffsetArgs`: `limit`, `skip`, `orderBy`, an optional `where`, and one of `select` or `include` | `IPaginationOffsetReturn`: `type`, `count`, `perPage`, `page`, `totalPage`, `hasNext`, `hasPrevious`, optional `nextPage` and `previousPage`, and `data` |
| `cursor(delegate, args)` | `args` is `IPaginationCursorArgs`: `limit`, `orderBy`, `fingerprint`, an optional `where` and `cursor`, one of `select` or `include`, and an optional `includeCount` | `IPaginationCursorReturn`: `type`, `perPage`, `hasNext`, an optional `cursor` and `count`, and `data` |

- `offset` runs the count and the page query together. The count ignores `select`, so a narrow projection never changes the total.
- `cursor` reads `limit + 1` rows through a keyset filter and seals the last row into `cursor` when a next page exists.
- Both append `{ id: <direction of the last term> }` to `orderBy` through `PaginationQueryUtil.resolveTiebreak`, unless a term already names `id`. `PaginationService` appends it, and no repository, service, or use case adds a tiebreak term.
- The route's `defaultOrderBy` decides the order of a request with no `orderBy`. `PaginationDefaultOrderBy` applies only to a read that skips `PaginationQueryUtil` and passes an empty `orderBy`, such as a processor.
- `PaginationOffsetUtil.page` builds an offset return from rows and a total in hand, which a list computed outside the database uses.

## PaginationQueryUtil

`PaginationQueryUtil` (`src/common/pagination/utils/pagination.query.util.ts`) turns a validated list query into the parameters of the repository and the state of the response.

| Method | Options | Returns |
| --- | --- | --- |
| `offset(dto, options)` | `orderBy` (the preset constant), `defaultOrderBy`, optional `availableSearch`, optional `defaultPerPage` | `params` (`limit`, `skip`, `orderBy`, optional `where`) and `storePatch` |
| `cursor(dto, options)` | the options of `offset` plus the required `scope` | `params` (`limit`, `orderBy`, `fingerprint`, optional `cursor` and `where`) and `storePatch` |
| `resolveTiebreak(orderBy, field)` | none | the order with the tiebreak term appended |

## PaginationFilterUtil

`PaginationFilterUtil` (`src/common/pagination/utils/pagination.filter.util.ts`) builds typed filters. Each method takes the Prisma scalar field and the query value, and returns `{ where, storeFilter }` or `null` when the value is blank. The optional `options` argument takes `customField`, the model field to filter when it differs from the query field.

| Signature | Query value | Where fragment |
| --- | --- | --- |
| `equalBoolean(field, value, options?)` | a boolean, or the string `true` or `false` | equals the boolean |
| `equalString(field, value, options?)` | a string | equals the trimmed string |
| `equalNumber(field, value, options?)` | a number string | equals the number |
| `notEqual(field, value, options?)` | a string. `options` also takes `isBoolean` and `isNumber` | not equal to the value |
| `inEnum(field, value, allowedValues, options?)` | a comma-separated list. `allowedValues` is the array of values the filter accepts | `in` the values |
| `ninEnum(field, value, allowedValues, options?)` | a comma-separated list, checked against `allowedValues` | `notIn` the values |
| `dateBetween(field, value, options?)` | an ISO date string. `options` also takes `type` (`start` or `end`) and `dayOf` | `gte` for `start`, `lte` for `end`, and `equals` with no type |

## Errors

All are HTTP 422 and live in the `pagination` block ([Status Codes][ref-doc-reference-status-codes-pagination]).

| Exception | Raised when |
| --- | --- |
| `PaginationInvalidPageException`, `PaginationPageExceedsMaximumException`, `PaginationPageCannotBeLessThanOneException` | `page` is not an integer, is above 20, or is below 1 |
| `PaginationInvalidPerPageException`, `PaginationPerPageExceedsMaximumException`, `PaginationPerPageCannotBeLessThanOneException` | `perPage` is not an integer, is above 100, or is below 1 |
| `PaginationCursorTooLongException`, `PaginationInvalidCursorFormatException` | the cursor is longer than 2560 characters or holds a character outside the allowed set |
| `PaginationFailedToDecodeCursorException` | the token does not decrypt or parse |
| `PaginationInvalidCursorPaginationParamsException` | the fingerprint differs from the one the request recomputed |
| `PaginationInvalidCursorDataException` | the token values do not match the sort fields, or a sort value on the last row is null |
| `PaginationFilterInvalidValueException`, `PaginationFilterInvalidValueEnumException` | a filter value is a malformed boolean, number, or date, or is outside the enum. Both carry the one code `50200` |

- The list schema validates the `orderBy` preset name, so an unknown preset answers `50300`, the request validation code, with HTTP 422.

<!-- REFERENCES -->

[ref-doc-concept-pagination]: ../concepts/pagination.md
[ref-doc-guide-pagination]: ../guides/pagination.md
[ref-doc-http-contract]: http-contract.md
[ref-doc-http-contract-metadata]: http-contract.md#metadata
[ref-doc-reference-status-codes]: status-codes.md
[ref-doc-reference-status-codes-pagination]: status-codes.md#pagination
[ref-doc-response]: ../concepts/response.md
