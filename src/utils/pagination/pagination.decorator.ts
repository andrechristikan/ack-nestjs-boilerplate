import { applyDecorators } from '@nestjs/common';
import { Expose, Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import {
    ENUM_PAGINATION_AVAILABLE_SORT_TYPE,
    PAGINATION_DEFAULT_AVAILABLE_SORT,
    PAGINATION_DEFAULT_MAX_PAGE,
    PAGINATION_DEFAULT_MAX_PER_PAGE,
    PAGINATION_DEFAULT_PAGE,
    PAGINATION_DEFAULT_PER_PAGE,
    PAGINATION_DEFAULT_SORT,
} from './pagination.constant';

export function PaginationDefaultSearch(): any {
    return applyDecorators(
        Expose() as PropertyDecorator,
        Transform(({ value }) => (value ? value : undefined), {
            toClassOnly: true,
        }) as PropertyDecorator
    );
}

export function PaginationDefaultAvailableSearch(
    availableSearch: string[]
): any {
    return applyDecorators(
        Expose() as PropertyDecorator,
        Transform(() => availableSearch, {
            toClassOnly: true,
        }) as PropertyDecorator
    );
}

export function PaginationDefaultPage(page = PAGINATION_DEFAULT_PAGE): any {
    return applyDecorators(
        Expose() as PropertyDecorator,
        Transform(
            ({ value }) =>
                !value
                    ? page
                    : value && isNaN(value)
                    ? page
                    : parseInt(value) > PAGINATION_DEFAULT_MAX_PAGE
                    ? PAGINATION_DEFAULT_MAX_PAGE
                    : parseInt(value),
            {
                toClassOnly: true,
            }
        ) as PropertyDecorator
    );
}

export function PaginationDefaultPerPage(
    perPage = PAGINATION_DEFAULT_PER_PAGE
): any {
    return applyDecorators(
        Expose() as PropertyDecorator,
        Transform(
            ({ value }) =>
                !value
                    ? perPage
                    : value && isNaN(value)
                    ? perPage
                    : parseInt(value) > PAGINATION_DEFAULT_MAX_PER_PAGE
                    ? PAGINATION_DEFAULT_MAX_PER_PAGE
                    : parseInt(value),
            {
                toClassOnly: true,
            }
        ) as PropertyDecorator
    );
}

export function PaginationDefaultSort(
    sort = PAGINATION_DEFAULT_SORT,
    availableSort = PAGINATION_DEFAULT_AVAILABLE_SORT
): any {
    return applyDecorators(
        Expose() as PropertyDecorator,
        Transform(
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

                return { [convertField]: convertType };
            },
            {
                toClassOnly: true,
            }
        ) as PropertyDecorator
    );
}

export function PaginationDefaultAvailableSort(
    availableSort = PAGINATION_DEFAULT_AVAILABLE_SORT
): any {
    return applyDecorators(
        Expose() as PropertyDecorator,
        Transform(({ value }) => (!value ? availableSort : value), {
            toClassOnly: true,
        }) as PropertyDecorator
    );
}

export function PaginationDefaultFilterBoolean(defaultValue: boolean[]): any {
    return applyDecorators(
        Expose() as PropertyDecorator,
        IsBoolean({ each: true }) as PropertyDecorator,
        Transform(
            ({ value }) =>
                value
                    ? value
                          .split(',')
                          .map((val: string) => (val === 'true' ? true : false))
                    : defaultValue,
            { toClassOnly: true }
        ) as PropertyDecorator
    );
}

export function PaginationDefaultFilterEnum<T>(defaultValue: T): any {
    return applyDecorators(
        Expose() as PropertyDecorator,
        IsBoolean({ each: true }) as PropertyDecorator,
        Transform(
            ({ value }) =>
                value
                    ? value.split(',').map((val: string) => defaultValue[val])
                    : defaultValue,
            { toClassOnly: true }
        ) as PropertyDecorator
    );
}
