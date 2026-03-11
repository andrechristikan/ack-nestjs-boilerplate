import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
/**
 * Default number of items per page for pagination.
 */
export const PaginationDefaultPerPage = 20;

/**
 * Maximum allowed number of items per page for pagination.
 */
export const PaginationDefaultMaxPerPage = 100;

/**
 * Maximum allowed page number for pagination.
 */
export const PaginationDefaultMaxPage = 20;

/**
 * Default field used for cursor-based pagination.
 */
export const PaginationDefaultCursorField = 'id';

export const PaginationMaxCursorLength = 256;

export const PaginationDefaultOrderBy: IPaginationOrderBy[] = [
    {
        createdAt: EnumPaginationOrderDirectionType.desc,
    },
];

export const PaginationAllowedOrderDirections: EnumPaginationOrderDirectionType[] =
    [
        EnumPaginationOrderDirectionType.asc,
        EnumPaginationOrderDirectionType.desc,
    ];
