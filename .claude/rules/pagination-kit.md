---
paths:
    - 'src/common/pagination/**'
---

# Pagination kit

Lists, allow-lists, filters, and the cursor scope: `pagination.md`.

- The cursor token carries `{ values, fingerprint }` only, sealed by `HelperEncryptionService.aes256Encrypt` under `PaginationCursorEncryptionPurpose` with the `app.encryptionSecret` root; a client can neither read nor change it. The token is the `aes256Encrypt` output as is, with no further encoding; its parts are base64url joined by `.`. `values` holds the last row's value of every `orderBy` term, tiebreak included.
- `PaginationCursorUtil` (`src/common/pagination/utils/pagination.cursor.util.ts`) returns `null` on a failure, and `PaginationService` throws; `checkFormat` returns the exception. The token is opened once per request, in `PaginationService.cursor`.
- `PaginationOffsetUtil.parsePage` (`src/common/pagination/utils/pagination.offset.util.ts`) returns the page or the exception. The caller of `checkFormat` or `parsePage` throws through `if (x instanceof AppBaseException)`.
- `PaginationOffsetUtil.page` caps `totalPage` at `PaginationDefaultMaxPage`, and `hasNext` and `nextPage` follow it; `count` stays the real count. No `maxSkip` bound replaces the cap.
- `PaginationQueryUtil.cursor` obtains the fingerprint from `PaginationCursorUtil.fingerprint`: a hash of the canonicalized `{ scope, filters, orderBy }` of the client request. `filters` is the whole DTO less `cursor`, `perPage`, and the raw `orderBy`, with `search` included and blank values dropped. A whole string filter value is trimmed before hashing, and one blank after trim is dropped. `orderBy` is the resolved preset terms, so an absent and an empty `orderBy` compare equal and a token issued under one preset answers 422 under another. Value order and spacing inside a comma-separated filter count (`a,b` differs from `b,a` and from `a, b`). `perPage` may change between pages.
- `PaginationService.cursor` reads through a keyset filter built from `values` and joined to `where` by `AND`, never Prisma's `cursor` argument or `skip`, so a last row that left `where` or was deleted moves no page boundary.
- A null or absent sort value on the last row throws `PaginationInvalidCursorDataException`, and a token whose `values` keys differ from the `orderBy` terms throws the same. A token that fails to open throws `PaginationFailedToDecodeCursorException`. A failure sealing a token is unhandled and answers 500 through `AppGeneralFilter`.
- A `Date` value is tagged under `PaginationCursorDateKey`, so a date-shaped string stays a string.
- A value the cursor token, query parsing, or fingerprint exclusion names is a constant in `src/common/pagination/constants/pagination.constant.ts`; a Prisma operator stays literal.
- Date bounds use `EnumPaginationFilterDateBetweenType`; the interceptor reads `EnumPaginationType` off the return. OpenAPI list params come only from the zod schema.
