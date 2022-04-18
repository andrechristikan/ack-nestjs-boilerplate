import { ENUM_PAGINATION_AVAILABLE_SORT_TYPE } from './pagination.constant';

export interface IPaginationOptions {
    limit: number;
    skip: number;
    sort?: Record<string, ENUM_PAGINATION_AVAILABLE_SORT_TYPE>;
}

export interface IPaginationSort {
    field: string;
    type: string;
    sort: Record<string, ENUM_PAGINATION_AVAILABLE_SORT_TYPE>;
}
