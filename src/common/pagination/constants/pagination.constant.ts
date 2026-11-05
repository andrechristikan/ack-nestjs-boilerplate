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
 * Tiebreak field appended to every offset and cursor `orderBy`.
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
 * Authenticated context of a sealed cursor token; fixed, because the fingerprint binds the token to its request.
 * @public
 */
export const PaginationCursorEncryptionContext = 'PaginationCursorContext';

/**
 * Key tagging a `Date` sort value in a cursor token (`{ "$date": <ISO string> }`), so a string value that looks like a date stays a string.
 * @public
 */
export const PaginationCursorDateKey = '$date';

/**
 * Hex width of the cursor fingerprint, the leading 64 bits of the sha256 over the canonicalized `{ scope, filters, orderBy }` of the client request.
 * @public
 */
export const PaginationCursorFingerprintLength = 16;

/**
 * Alphabet a cursor string must match before it is opened: the base64url characters and the `.` joining the parts of an `aes256Encrypt` payload.
 * @public
 */
export const PaginationCursorFormatRegex = /^[A-Za-z0-9_.-]+$/;

/**
 * Query DTO fields left out of the cursor fingerprint, because they page or sort the list rather than filter it.
 * @public
 */
export const PaginationFingerprintExcludedFields: readonly string[] = [
    'cursor',
    'perPage',
    'orderBy',
];

/**
 * Separator between the values of a comma-separated enum filter.
 * @public
 */
export const PaginationFilterValueSeparator = ',';

/**
 * Separator between the field and the direction of an `orderBy` term.
 * @public
 */
export const PaginationOrderBySeparator = ':';

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
