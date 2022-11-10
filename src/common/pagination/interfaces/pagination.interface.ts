import {
    ENUM_PAGINATION_SORT_TYPE,
    ENUM_PAGINATION_FILTER_CASE_OPTIONS,
} from 'src/common/pagination/constants/pagination.enum.constant';

export type IPaginationSort = Record<string, ENUM_PAGINATION_SORT_TYPE>;

export interface IPaginationOptions {
    limit: number;
    skip: number;
    sort?: IPaginationSort;
}

export interface IPaginationFilterDateOptions {
    endOfDate?: boolean;
    operation?: {
        moreThanEqualToday?: boolean;
        lessThanEqualToday?: boolean;
        moreThanToday?: boolean;
        lessThanToday?: boolean;
    };
}

export interface IPaginationFilterStringOptions {
    case?: ENUM_PAGINATION_FILTER_CASE_OPTIONS;
    trim?: boolean;
}
