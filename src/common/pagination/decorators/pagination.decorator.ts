import { Query } from '@nestjs/common';
import {
    IPaginationFilterDateOptions,
    IPaginationFilterStringContainOptions,
    IPaginationFilterStringEqualOptions,
} from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationFilterContainPipe } from 'src/common/pagination/pipes/pagination.filter-contain.pipe';
import { PaginationFilterDatePipe } from 'src/common/pagination/pipes/pagination.filter-date.pipe';
import { PaginationFilterEqualPipe } from 'src/common/pagination/pipes/pagination.filter-equal.pipe';
import { PaginationFilterInBooleanPipe } from 'src/common/pagination/pipes/pagination.filter-in-boolean.pipe';
import { PaginationFilterInEnumPipe } from 'src/common/pagination/pipes/pagination.filter-in-enum.pipe';
import { PaginationPagingPipe } from 'src/common/pagination/pipes/pagination.paging.pipe';
import { PaginationSearchPipe } from 'src/common/pagination/pipes/pagination.search.pipe';
import { PaginationSortPipe } from 'src/common/pagination/pipes/pagination.sort.pipe';

export function PaginationQuery(
    defaultPerPage: number,
    _availableSearch: string[],
    defaultSort: string,
    _availableSort: string[]
): ParameterDecorator {
    return Query(
        PaginationSearchPipe(_availableSearch),
        PaginationSortPipe(defaultSort, _availableSort),
        PaginationPagingPipe(defaultPerPage)
    );
}

export function PaginationQueryFilterInBoolean(
    field: string,
    defaultValue: boolean[]
): ParameterDecorator {
    return Query(field, PaginationFilterInBooleanPipe(defaultValue));
}

export function PaginationQueryFilterInEnum<T>(
    field: string,
    defaultValue: T,
    defaultEnum: Record<string, any>
): ParameterDecorator {
    return Query(
        field,
        PaginationFilterInEnumPipe<T>(defaultValue, defaultEnum)
    );
}

export function PaginationQueryFilterEqual(
    field: string,
    options?: IPaginationFilterStringEqualOptions
): ParameterDecorator {
    return Query(field, PaginationFilterEqualPipe(options));
}

export function PaginationQueryFilterContain(
    field: string,
    options?: IPaginationFilterStringContainOptions
): ParameterDecorator {
    return Query(field, PaginationFilterContainPipe(options));
}

export function PaginationQueryFilterDate(
    field: string,
    options?: IPaginationFilterDateOptions
): ParameterDecorator {
    return Query(field, PaginationFilterDatePipe(options));
}
