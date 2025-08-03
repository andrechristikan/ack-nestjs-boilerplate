import { Query } from '@nestjs/common';
import { PaginationOrderPipe } from '@common/pagination/pipes/pagination.order.pipe';
import { PaginationPagingPipe } from '@common/pagination/pipes/pagination.paging.pipe';
import { PaginationSearchPipe } from '@common/pagination/pipes/pagination.search.pipe';
import {
    IPaginationQueryFilterDateOptions,
    IPaginationQueryFilterEnumOptions,
    IPaginationQueryFilterEqualOptions,
    IPaginationQueryFilterOptions,
    IPaginationQueryOptions,
} from '@common/pagination/interfaces/pagination.interface';
import {
    PaginationQueryFilterDatePipe,
    PaginationQueryFilterEqualPipe,
    PaginationQueryFilterInBooleanPipe,
    PaginationQueryFilterInEnumPipe,
    PaginationQueryFilterNinBooleanPipe,
    PaginationQueryFilterNinEnumPipe,
    PaginationQueryFilterNotEqualPipe,
} from '@common/pagination/pipes/pagination.filter.pipe';

/**
 * Creates a pagination query parameter decorator that applies search, paging, and ordering pipes.
 * Combines multiple pagination pipes into a single decorator for comprehensive query processing.
 *
 * @param options - Configuration options for search fields, default per page, and available order fields
 * @returns Parameter decorator that applies pagination pipes to query parameters
 */
export function PaginationQuery(
    options?: IPaginationQueryOptions
): ParameterDecorator {
    return Query(
        PaginationSearchPipe(options?.availableSearch),
        PaginationPagingPipe(options?.defaultPerPage),
        PaginationOrderPipe(options?.availableOrderBy)
    );
}

/**
 * Creates a query parameter decorator for filtering enum values using IN operation.
 * Validates that query values exist in the allowed enum and creates database filter conditions.
 *
 * @param field - Query parameter field name
 * @param defaultEnum - Array of allowed enum values for validation
 * @param options - Configuration options including number parsing and custom field mapping
 * @returns Parameter decorator that applies enum IN filtering to the specified field
 */
export function PaginationQueryFilterInEnum<T>(
    field: string,
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterInEnumPipe(defaultEnum, options));
}

/**
 * Creates a query parameter decorator for filtering enum values using NOT IN operation.
 * Validates that query values exist in the allowed enum and creates database exclusion filter conditions.
 *
 * @param field - Query parameter field name
 * @param defaultEnum - Array of allowed enum values for validation
 * @param options - Configuration options including number parsing and custom field mapping
 * @returns Parameter decorator that applies enum NOT IN filtering to the specified field
 */
export function PaginationQueryFilterNinEnum<T>(
    field: string,
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterNinEnumPipe(defaultEnum, options));
}

/**
 * Creates a query parameter decorator for filtering boolean values using IN operation.
 * Transforms comma-separated boolean strings and creates database filter with IN condition.
 *
 * @param field - Query parameter field name
 * @param options - Configuration options including custom field mapping
 * @returns Parameter decorator that applies boolean IN filtering to the specified field
 */
export function PaginationQueryFilterInBoolean(
    field: string,
    options?: IPaginationQueryFilterOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterInBooleanPipe(options));
}

/**
 * Creates a query parameter decorator for filtering boolean values using NOT IN operation.
 * Transforms comma-separated boolean strings and creates database filter with NOT IN condition.
 *
 * @param field - Query parameter field name
 * @param options - Configuration options including custom field mapping
 * @returns Parameter decorator that applies boolean NOT IN filtering to the specified field
 */
export function PaginationQueryFilterNinBoolean(
    field: string,
    options?: IPaginationQueryFilterOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterNinBooleanPipe(options));
}

/**
 * Creates a query parameter decorator for exact value matching using EQUAL operation.
 * Validates and transforms string or numeric values for exact database matching.
 *
 * @param field - Query parameter field name
 * @param options - Configuration options including number parsing and custom field mapping
 * @returns Parameter decorator that applies equal filtering to the specified field
 */
export function PaginationQueryFilterEqual(
    field: string,
    options?: IPaginationQueryFilterEqualOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterEqualPipe(options));
}

/**
 * Creates a query parameter decorator for non-matching values using NOT EQUAL operation.
 * Validates and transforms string or numeric values for database exclusion matching.
 *
 * @param field - Query parameter field name
 * @param options - Configuration options including number parsing and custom field mapping
 * @returns Parameter decorator that applies not equal filtering to the specified field
 */
export function PaginationQueryFilterNotEqual(
    field: string,
    options?: IPaginationQueryFilterEqualOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterNotEqualPipe(options));
}

/**
 * Creates a query parameter decorator for date-based filtering operations.
 * Validates ISO date strings and creates database filter with configurable comparison operations (equal, gte, lte).
 *
 * @param field - Query parameter field name
 * @param options - Configuration options including day-of handling, comparison type, and custom field mapping
 * @returns Parameter decorator that applies date filtering to the specified field
 */
export function PaginationQueryFilterDate(
    field: string,
    options?: IPaginationQueryFilterDateOptions
): ParameterDecorator {
    return Query(field, PaginationQueryFilterDatePipe(options));
}
