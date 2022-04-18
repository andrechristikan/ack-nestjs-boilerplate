import { ENUM_PAGINATION_AVAILABLE_SORT_TYPE } from './pagination.constant';

export interface IPaginationOptions {
    limit: number;
    skip: number;
    sort?: Record<string, ENUM_PAGINATION_AVAILABLE_SORT_TYPE>;
}

export type IPaginationSort = Record<
    string,
    ENUM_PAGINATION_AVAILABLE_SORT_TYPE
>;
