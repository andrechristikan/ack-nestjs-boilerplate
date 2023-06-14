import { Query } from '@nestjs/common';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import {
    IPaginationFilterDateOptions,
    IPaginationFilterStringContainOptions,
    IPaginationFilterStringEqualOptions,
} from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationFilterContainPipe } from 'src/common/pagination/pipes/pagination.filter-contain.pipe';
import { PaginationFilterDatePipe } from 'src/common/pagination/pipes/pagination.filter-date.pipe';
import { PaginationFilterEqualObjectIdPipe } from 'src/common/pagination/pipes/pagination.filter-equal-object-id.pipe';
import { PaginationFilterEqualPipe } from 'src/common/pagination/pipes/pagination.filter-equal.pipe';
import { PaginationFilterInBooleanPipe } from 'src/common/pagination/pipes/pagination.filter-in-boolean.pipe';
import { PaginationFilterInEnumPipe } from 'src/common/pagination/pipes/pagination.filter-in-enum.pipe';
import { PaginationOrderPipe } from 'src/common/pagination/pipes/pagination.order.pipe';
import { PaginationPagingPipe } from 'src/common/pagination/pipes/pagination.paging.pipe';
import { PaginationSearchPipe } from 'src/common/pagination/pipes/pagination.search.pipe';

export function PaginationQuery(
    defaultPerPage: number,
    defaultOrderBy: string,
    defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
    availableSearch: string[],
    availableOrderBy: string[]
): ParameterDecorator {
    return Query(
        PaginationSearchPipe(availableSearch),
        PaginationPagingPipe(defaultPerPage),
        PaginationOrderPipe(
            defaultOrderBy,
            defaultOrderDirection,
            availableOrderBy
        )
    );
}

export function PaginationQuerySearch(
    availableSearch: string[]
): ParameterDecorator {
    return Query(PaginationSearchPipe(availableSearch));
}

export function PaginationQueryFilterInBoolean(
    field: string,
    defaultValue: boolean[],
    queryField?: string,
    raw = false
): ParameterDecorator {
    return Query(
        queryField ?? field,
        PaginationFilterInBooleanPipe(field, defaultValue, raw)
    );
}

export function PaginationQueryFilterInEnum<T>(
    field: string,
    defaultValue: T,
    defaultEnum: Record<string, any>,
    queryField?: string,
    raw = false
): ParameterDecorator {
    return Query(
        queryField ?? field,
        PaginationFilterInEnumPipe<T>(field, defaultValue, defaultEnum, raw)
    );
}

export function PaginationQueryFilterEqual(
    field: string,
    queryField?: string,
    options?: IPaginationFilterStringEqualOptions,
    raw = false
): ParameterDecorator {
    return Query(
        queryField ?? field,
        PaginationFilterEqualPipe(field, raw, options)
    );
}

export function PaginationQueryFilterContain(
    field: string,
    queryField?: string,
    options?: IPaginationFilterStringContainOptions,
    raw = false
): ParameterDecorator {
    return Query(
        queryField ?? field,
        PaginationFilterContainPipe(field, raw, options)
    );
}

export function PaginationQueryFilterDate(
    field: string,
    queryField?: string,
    options?: IPaginationFilterDateOptions,
    raw = false
): ParameterDecorator {
    return Query(
        queryField ?? field,
        PaginationFilterDatePipe(field, raw, options)
    );
}

export function PaginationQueryFilterEqualObjectId(
    field: string,
    queryField?: string,
    raw = false
): ParameterDecorator {
    return Query(
        queryField ?? field,
        PaginationFilterEqualObjectIdPipe(field, raw)
    );
}
