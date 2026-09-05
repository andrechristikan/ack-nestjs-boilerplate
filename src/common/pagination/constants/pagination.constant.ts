import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';

export const PaginationDefaultPerPage = 20;

export const PaginationDefaultMaxPerPage = 100;

export const PaginationDefaultMaxPage = 20;

export const PaginationDefaultCursorField = 'id';

export const PaginationMaxCursorLength = 256;

/**
 * Hex width of the cursor fingerprint — the leading 64 bits of the sha256 over the
 * canonicalized `{ where, orderBy }` the cursor was issued for.
 */
export const PaginationCursorFingerprintLength = 16;

/**
 * Default ordering when no `orderBy` is provided: newest `createdAt` first. Frozen, because an
 * in-place mutation of a shared default reorders every list in the process.
 */
export const PaginationDefaultOrderBy: readonly IPaginationOrderBy[] =
    Object.freeze([
        Object.freeze({
            createdAt: EnumPaginationOrderDirectionType.desc,
        }),
    ]);

export const PaginationAllowedOrderDirections: EnumPaginationOrderDirectionType[] =
    [
        EnumPaginationOrderDirectionType.asc,
        EnumPaginationOrderDirectionType.desc,
    ];

export const PaginationStoreKey = 'PaginationStore';
