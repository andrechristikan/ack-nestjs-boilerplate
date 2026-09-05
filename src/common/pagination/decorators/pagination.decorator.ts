import { Query } from '@nestjs/common';
import { PaginationOrderPipe } from '@common/pagination/pipes/pagination.order.pipe';
import { PaginationSearchPipe } from '@common/pagination/pipes/pagination.search.pipe';
import {
    IPaginationQueryCursorOptions,
    IPaginationQueryFilterDateOptions,
    IPaginationQueryFilterEnumOptions,
    IPaginationQueryFilterEqualOptions,
    IPaginationQueryFilterOptions,
    IPaginationQueryOffsetOptions,
} from '@common/pagination/interfaces/pagination.interface';
import {
    PaginationQueryFilterDatePipe,
    PaginationQueryFilterEqualPipe,
    PaginationQueryFilterInEnumPipe,
    PaginationQueryFilterNinEnumPipe,
    PaginationQueryFilterNotEqualPipe,
} from '@common/pagination/pipes/pagination.filter.pipe';
import { PaginationOffsetPipe } from '@common/pagination/pipes/pagination.offset.pipe';
import { PaginationCursorPipe } from '@common/pagination/pipes/pagination.cursor.pipe';

/**
 * Binds offset pagination query params (search, page/perPage, order) via their pipes.
 */
export function PaginationOffsetQuery(
    options?: IPaginationQueryOffsetOptions
): ParameterDecorator {
    return Query(
        PaginationSearchPipe(options?.availableSearch),
        PaginationOffsetPipe(options?.defaultPerPage),
        PaginationOrderPipe(options?.availableOrderBy)
    );
}

/**
 * Binds cursor pagination query params (search, cursor/perPage, order) via their pipes.
 */
export function PaginationCursorQuery(
    options?: IPaginationQueryCursorOptions
): ParameterDecorator {
    return Query(
        PaginationSearchPipe(options?.availableSearch),
        PaginationCursorPipe(options?.defaultPerPage, options?.cursorField),
        PaginationOrderPipe(options?.availableOrderBy)
    );
}

/**
 * Filters a field by enum membership (`in`).
 */
export function PaginationQueryFilterInEnum<T>(
    field: string,
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterInEnumPipe(defaultEnum, options));
}

/**
 * Filters a field by enum exclusion (`not in`).
 */
export function PaginationQueryFilterNinEnum<T>(
    field: string,
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterNinEnumPipe(defaultEnum, options));
}

/**
 * Filters a field by boolean equality.
 */
export function PaginationQueryFilterEqualBoolean(
    field: string,
    options?: IPaginationQueryFilterOptions
): ParameterDecorator {
    return Query(
        field,
        PaginationQueryFilterEqualPipe({
            ...options,
            isBoolean: true,
        })
    );
}

/**
 * Filters a field by number equality.
 */
export function PaginationQueryFilterEqualNumber(
    field: string,
    options?: IPaginationQueryFilterOptions
): ParameterDecorator {
    return Query(
        field,
        PaginationQueryFilterEqualPipe({
            ...options,
            isNumber: true,
        })
    );
}

/**
 * Filters a field by string equality.
 */
export function PaginationQueryFilterEqualString(
    field: string,
    options?: IPaginationQueryFilterEqualOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterEqualPipe(options));
}

/**
 * Filters a field by inequality (`not`).
 */
export function PaginationQueryFilterNotEqual(
    field: string,
    options?: IPaginationQueryFilterEqualOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterNotEqualPipe(options));
}

/**
 * Filters a field by date, optionally as a range bound (`gte`/`lte`).
 */
export function PaginationQueryFilterDate(
    field: string,
    options?: IPaginationQueryFilterDateOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterDatePipe(options));
}
