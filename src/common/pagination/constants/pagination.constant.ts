import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';

/** @public */
export const PaginationDefaultPerPage = 20;

/** @public */
export const PaginationDefaultMaxPerPage = 100;

/** @public */
export const PaginationDefaultMaxSearchLength = 100;

/** @public */
export const PaginationDefaultMaxPage = 20;

/** @public */
export const PaginationDefaultCursorField = 'id';

/** @public */
export const PaginationMaxCursorLength = 2560;

/** @public */
export const PaginationCursorEncryptionPurpose = 'PaginationCursor';

/** @public */
export const PaginationCursorEncryptionContext = 'PaginationCursorContext';

/** @public */
export const PaginationCursorDateKey = '$date';

/** @public */
export const PaginationCursorFingerprintLength = 16;

/** @public */
export const PaginationCursorFormatRegex = /^[A-Za-z0-9_.-]+$/;

/** @public */
export const PaginationFingerprintExcludedFields: readonly string[] = [
    'cursor',
    'perPage',
    'orderBy',
];

/** @public */
export const PaginationFilterValueSeparator = ',';

/** @public */
export const PaginationOrderBySeparator = ':';

/** @public */
export const PaginationDefaultOrderBy: readonly IPaginationOrderBy[] =
    Object.freeze([
        Object.freeze({
            createdAt: EnumPaginationOrderDirectionType.desc,
        }),
    ]);

/** @public */
export const PaginationStoreKey = 'PaginationStoreKey';
