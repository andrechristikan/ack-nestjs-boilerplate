import { Transform } from 'class-transformer';
import {
    ENUM_PAGINATION_AVAILABLE_SORT_TYPE,
    PAGINATION_DEFAULT_AVAILABLE_SORT,
    PAGINATION_DEFAULT_MAX_PAGE,
    PAGINATION_DEFAULT_MAX_PER_PAGE,
    PAGINATION_DEFAULT_PAGE,
    PAGINATION_DEFAULT_PER_PAGE,
    PAGINATION_DEFAULT_SORT,
} from './pagination.constant';

export function PaginationDefaultPage(
    page = PAGINATION_DEFAULT_PAGE
): PropertyDecorator {
    return Transform(
        ({ value }) =>
            !value
                ? page
                : value && isNaN(value)
                ? page
                : parseInt(value) > PAGINATION_DEFAULT_MAX_PAGE
                ? PAGINATION_DEFAULT_MAX_PAGE
                : parseInt(value),
        { toClassOnly: true }
    );
}

export function PaginationDefaultPerPage(
    perPage = PAGINATION_DEFAULT_PER_PAGE
): PropertyDecorator {
    return Transform(
        ({ value }) =>
            !value
                ? perPage
                : value && isNaN(value)
                ? perPage
                : parseInt(value) > PAGINATION_DEFAULT_MAX_PER_PAGE
                ? PAGINATION_DEFAULT_MAX_PER_PAGE
                : parseInt(value),
        { toClassOnly: true }
    );
}

export function PaginationDefaultSort(
    sort = PAGINATION_DEFAULT_SORT,
    availableSort = PAGINATION_DEFAULT_AVAILABLE_SORT
): PropertyDecorator {
    return Transform(
        ({ value, obj }) => {
            const bSort = PAGINATION_DEFAULT_SORT.split('@')[0];

            const rSort = value || sort;
            const rAvailableSort = obj._availableSort || availableSort;
            const field: string = rSort.split('@')[0];
            const type: string = rSort.split('@')[1];
            const convertField: string = rAvailableSort.includes(field)
                ? field
                : bSort;
            const convertType: number =
                type === 'desc'
                    ? ENUM_PAGINATION_AVAILABLE_SORT_TYPE.DESC
                    : ENUM_PAGINATION_AVAILABLE_SORT_TYPE.ASC;

            return {
                field: convertField,
                type: convertType,
                sort: { [convertField]: convertType },
            };
        },
        {
            toClassOnly: true,
        }
    );
}

export function PaginationDefaultAvailableSort(
    availableSort = PAGINATION_DEFAULT_AVAILABLE_SORT
): PropertyDecorator {
    return Transform(({ value }) => (!value ? availableSort : value), {
        toClassOnly: true,
    });
}
