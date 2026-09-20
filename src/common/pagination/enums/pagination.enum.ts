/**
 * Which bound of a date range a date filter sets: start or end.
 * @public
 */
export enum EnumPaginationFilterDateBetweenType {
    start = 'start',
    end = 'end',
}

/**
 * Sort directions a paginated query accepts.
 * @public
 */
export enum EnumPaginationOrderDirectionType {
    asc = 'asc',
    desc = 'desc',
}

/**
 * Pagination styles a paginated response uses: offset or cursor.
 * @public
 */
export enum EnumPaginationType {
    offset = 'offset',
    cursor = 'cursor',
}
