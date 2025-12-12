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
 * Creates a parameter decorator for handling pagination query parameters.
 * Converts request query parameters to database query format with search, paging, and ordering.
 * @param {IPaginationQueryOffsetOptions} [options] - Optional configuration for pagination behavior
 * @returns {ParameterDecorator} Parameter decorator that applies pagination pipes for database queries
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
 * Creates a parameter decorator for handling cursor-based pagination query parameters.
 * Converts request query parameters to database query format with search, cursor paging, and ordering.
 * @param {IPaginationQueryCursorOptions} [options] - Optional configuration for cursor pagination behavior
 * @returns {ParameterDecorator} Parameter decorator that applies pagination pipes for cursor-based database queries
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
 * Creates a parameter decorator for enum filtering using 'in' operator for database queries.
 * Converts query parameter to database 'in' filter format.
 * @template T - Type of enum values
 * @param {string} field - The query parameter field name
 * @param {T[]} defaultEnum - Array of default enum values
 * @param {IPaginationQueryFilterEnumOptions} [options] - Optional filter configuration
 * @returns {ParameterDecorator} Parameter decorator that converts to database 'in' filter
 */
export function PaginationQueryFilterInEnum<T>(
    field: string,
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterInEnumPipe(defaultEnum, options));
}

/**
 * Creates a parameter decorator for enum filtering using 'not in' operator for database queries.
 * Converts query parameter to database 'not in' filter format.
 * @template T - Type of enum values
 * @param {string} field - The query parameter field name
 * @param {T[]} defaultEnum - Array of default enum values
 * @param {IPaginationQueryFilterEnumOptions} [options] - Optional filter configuration
 * @returns {ParameterDecorator} Parameter decorator that converts to database 'not in' filter
 */
export function PaginationQueryFilterNinEnum<T>(
    field: string,
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterNinEnumPipe(defaultEnum, options));
}

/**
 * Creates a parameter decorator for boolean equality filtering in database queries.
 * Converts query parameter to database boolean equality filter format.
 * @param {string} field - The query parameter field name
 * @param {IPaginationQueryFilterOptions} [options] - Optional filter configuration
 * @returns {ParameterDecorator} Parameter decorator that converts to database boolean filter
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
 * Creates a parameter decorator for number equality filtering in database queries.
 * Converts query parameter to database number equality filter format.
 * @param {string} field - The query parameter field name
 * @param {IPaginationQueryFilterOptions} [options] - Optional filter configuration
 * @returns {ParameterDecorator} Parameter decorator that converts to database number filter
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
 * Creates a parameter decorator for string equality filtering in database queries.
 * Converts query parameter to database string equality filter format.
 * @param {string} field - The query parameter field name
 * @param {IPaginationQueryFilterEqualOptions} [options] - Optional filter configuration
 * @returns {ParameterDecorator} Parameter decorator that converts to database string filter
 */
export function PaginationQueryFilterEqualString(
    field: string,
    options?: IPaginationQueryFilterEqualOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterEqualPipe(options));
}

/**
 * Creates a parameter decorator for inequality filtering in database queries.
 * Converts query parameter to database inequality filter format.
 * @param {string} field - The query parameter field name
 * @param {IPaginationQueryFilterEqualOptions} [options] - Optional filter configuration
 * @returns {ParameterDecorator} Parameter decorator that converts to database inequality filter
 */
export function PaginationQueryFilterNotEqual(
    field: string,
    options?: IPaginationQueryFilterEqualOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterNotEqualPipe(options));
}

/**
 * Creates a parameter decorator for date range filtering in database queries.
 * Converts query parameter to database date range filter format.
 * @param {string} field - The query parameter field name
 * @param {IPaginationQueryFilterDateOptions} [options] - Optional date filter configuration
 * @returns {ParameterDecorator} Parameter decorator that converts to database date filter
 */
export function PaginationQueryFilterDate(
    field: string,
    options?: IPaginationQueryFilterDateOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterDatePipe(options));
}
