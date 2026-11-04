import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';

/**
 * Page size used when a list request sends no `perPage`.
 * @public
 */
export const PaginationDefaultPerPage = 20;

/**
 * Largest `perPage` a list request may send.
 * @public
 */
export const PaginationDefaultMaxPerPage = 100;

/**
 * Longest `search` string a list request may send.
 * @public
 */
export const PaginationDefaultMaxSearchLength = 100;

/**
 * Largest `page` an offset list request may send.
 * @public
 */
export const PaginationDefaultMaxPage = 20;

/**
 * Field a cursor is keyed on when a list names no cursor field.
 * @public
 */
export const PaginationDefaultCursorField = 'id';

/**
 * Longest cursor string a cursor list request may send.
 * @public
 */
export const PaginationMaxCursorLength = 2560;

/**
 * Key purpose the cursor token is sealed under, so a ciphertext sealed for another use never opens as a cursor.
 * @public
 */
export const PaginationCursorEncryptionPurpose = 'PaginationCursor';

/**
 * Authenticated context of a sealed cursor token. A token has no owning id, so the context is fixed and the fingerprint binds the token to its query.
 * @public
 */
export const PaginationCursorEncryptionContext = 'PaginationCursorContext';

/**
 * Key tagging a `Date` sort value in a cursor token (`{ "$date": <ISO string> }`), so a string value that looks like a date stays a string.
 * @public
 */
export const PaginationCursorDateKey = '$date';

/**
 * Hex width of the cursor fingerprint — the leading 64 bits of the sha256 over the
 * canonicalized `{ where, orderBy }` the cursor was issued for.
 * @public
 */
export const PaginationCursorFingerprintLength = 16;

/**
 * Default ordering when no `orderBy` is provided: newest `createdAt` first. Frozen, because an
 * in-place mutation of a shared default reorders every list in the process.
 * @public
 */
export const PaginationDefaultOrderBy: readonly IPaginationOrderBy[] =
    Object.freeze([
        Object.freeze({
            createdAt: EnumPaginationOrderDirectionType.desc,
        }),
    ]);

/**
 * Request-store key holding the parsed pagination, search and filter state of a list request.
 * @public
 */
export const PaginationStoreKey = 'PaginationStoreKey';
