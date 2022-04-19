import { applyDecorators } from '@nestjs/common';
import { Expose, Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsMongoId,
    IsOptional,
    ValidateIf,
    IsEnum,
    IsNotEmpty,
    IsDate,
} from 'class-validator';
import { MinGreaterThan } from '../request/validation/request.min-greater-than.validation';
import {
    ENUM_PAGINATION_AVAILABLE_SORT_TYPE,
    PAGINATION_DEFAULT_AVAILABLE_SORT,
    PAGINATION_DEFAULT_MAX_PAGE,
    PAGINATION_DEFAULT_MAX_PER_PAGE,
    PAGINATION_DEFAULT_PAGE,
    PAGINATION_DEFAULT_PER_PAGE,
    PAGINATION_DEFAULT_SORT,
} from './pagination.constant';
import {
    IPaginationFilterDateOptions,
    IPaginationFilterOptions,
} from './pagination.interface';

export function PaginationSearch(): any {
    return applyDecorators(
        Expose(),
        Transform(({ value }) => (value ? value : undefined), {
            toClassOnly: true,
        })
    );
}

export function PaginationAvailableSearch(availableSearch: string[]): any {
    return applyDecorators(
        Expose(),
        Transform(() => availableSearch, {
            toClassOnly: true,
        })
    );
}

export function PaginationPage(page = PAGINATION_DEFAULT_PAGE): any {
    return applyDecorators(
        Expose(),
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
        )
    );
}

export function PaginationPerPage(perPage = PAGINATION_DEFAULT_PER_PAGE): any {
    return applyDecorators(
        Expose(),
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
        )
    );
}

export function PaginationSort(
    sort = PAGINATION_DEFAULT_SORT,
    availableSort = PAGINATION_DEFAULT_AVAILABLE_SORT
): any {
    return applyDecorators(
        Expose(),
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
        )
    );
}

export function PaginationAvailableSort(
    availableSort = PAGINATION_DEFAULT_AVAILABLE_SORT
): any {
    return applyDecorators(
        Expose(),
        Transform(({ value }) => (!value ? availableSort : value), {
            toClassOnly: true,
        })
    );
}

export function PaginationFilterBoolean(defaultValue: boolean[]): any {
    return applyDecorators(
        Expose(),
        IsBoolean({ each: true }),
        Transform(
            ({ value }) =>
                value
                    ? value
                          .split(',')
                          .map((val: string) => (val === 'true' ? true : false))
                    : defaultValue,
            { toClassOnly: true }
        )
    );
}

export function PaginationFilterEnum<T>(
    defaultValue: T[],
    defaultEnum: Record<string, any>
): any {
    const cEnum = defaultEnum as unknown;
    return applyDecorators(
        Expose(),
        IsEnum(cEnum as object, { each: true }),
        Transform(
            ({ value }) =>
                value
                    ? value.split(',').map((val: string) => defaultEnum[val])
                    : defaultValue,
            { toClassOnly: true }
        )
    );
}

export function PaginationFilterId(
    field: string,
    options?: IPaginationFilterOptions
): any {
    return applyDecorators(
        Expose(),
        IsMongoId(),
        options && options.required ? IsNotEmpty() : IsOptional(),
        options && options.required
            ? ValidateIf(() => false)
            : ValidateIf((e) => e[field] !== '')
    );
}

export function PaginationFilterDate(
    field: string,
    options?: IPaginationFilterDateOptions
): any {
    return applyDecorators(
        Expose(),
        IsDate(),
        Type(() => Date),
        options && options.required ? IsNotEmpty() : IsOptional(),
        options && options.required && options.asEndDate
            ? ValidateIf(
                  (e) =>
                      e[field] !== '' &&
                      e[options.asEndDate.moreThanField] !== ''
              )
            : options && options.required
            ? ValidateIf((e) => e[field] !== '')
            : options && options.asEndDate
            ? ValidateIf((e) => e[options.asEndDate.moreThanField] !== '')
            : ValidateIf(() => false),
        options && options.asEndDate
            ? MinGreaterThan(options.asEndDate.moreThanField)
            : ValidateIf(() => false)
    );
}
