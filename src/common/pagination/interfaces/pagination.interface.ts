import {
    ENUM_PAGINATION_SORT_TYPE,
    ENUM_PAGINATION_FILTER_CASE_OPTIONS,
    ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS,
} from 'src/common/pagination/constants/pagination.enum.constant';

export type IPaginationSort = Record<string, ENUM_PAGINATION_SORT_TYPE>;

export interface IPaginationOptions {
    paging?: {
        limit: number;
        offset: number;
    };
    sort?: IPaginationSort;
}

export interface IPaginationFilterDateOptions {
    time?: ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS;
}

export interface IPaginationFilterStringContainOptions {
    case?: ENUM_PAGINATION_FILTER_CASE_OPTIONS;
    trim?: boolean;
}

export interface IPaginationFilterStringEqualOptions
    extends IPaginationFilterStringContainOptions {
    isNumber?: boolean;
}
