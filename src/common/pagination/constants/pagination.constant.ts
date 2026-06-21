import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';

export const PaginationDefaultPerPage = 20;

export const PaginationDefaultMaxPerPage = 100;

export const PaginationDefaultMaxPage = 20;

export const PaginationDefaultCursorField = 'id';

export const PaginationMaxCursorLength = 256;

/**
 * Default ordering when no `orderBy` is provided: newest `createdAt` first.
 */
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

export const PaginationStoreKey = 'PaginationStore';
