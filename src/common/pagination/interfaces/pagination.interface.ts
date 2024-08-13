import {
    ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS,
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
} from 'src/common/pagination/enums/pagination.enum';

export type IPaginationOrder = Record<
    string,
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE
>;

export interface IPaginationQueryOptions {
    defaultPerPage?: number;
    defaultOrderBy?: string;
    defaultOrderDirection?: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;
    availableSearch?: string[];
    availableOrderBy?: string[];
}

export interface IPaginationFilterOptions {
    queryField?: string;
    raw?: boolean;
}

export interface IPaginationFilterDateOptions
    extends Omit<IPaginationFilterOptions, 'isNumber'> {
    time?: ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS;
}

export interface IPaginationFilterEqualOptions
    extends IPaginationFilterOptions {
    isNumber?: boolean;
}
