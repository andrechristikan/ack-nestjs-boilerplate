export const PAGINATION_PER_PAGE = 20;
export const PAGINATION_MAX_PER_PAGE = 100;
export const PAGINATION_PAGE = 1;
export const PAGINATION_MAX_PAGE = 20;
export const PAGINATION_SORT = 'createdAt@asc';
export const PAGINATION_AVAILABLE_SORT = ['createdAt'];

export enum ENUM_PAGINATION_AVAILABLE_SORT_TYPE {
    ASC = 1,
    DESC = -1,
}

export enum ENUM_PAGINATION_TYPE {
    FULL = 'FULL',
    SIMPLE = 'SIMPLE',
    MINI = 'MINI',
}
