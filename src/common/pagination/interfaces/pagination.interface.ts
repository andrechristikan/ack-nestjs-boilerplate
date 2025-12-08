import { ENUM_HELPER_DATE_DAY_OF } from '@common/helper/enums/helper.enum';
import {
    ENUM_PAGINATION_FILTER_DATE_BETWEEN_TYPE,
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
    ENUM_PAGINATION_TYPE,
} from '@common/pagination/enums/pagination.enum';

export type IPaginationQueryFilter = Record<
    string,
    string | number | boolean | Array<string | number | boolean> | Date
>;

export interface IPaginationQuery {
    search?: string;
    filters?: IPaginationQueryFilter;
    page: number;
    perPage: number;
    cursor?: string;
    orderBy: string;
    orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;
    availableSearch: string[];
    availableOrderBy: string[];
}

export interface IPaginationQueryOffsetOptions {
    availableSearch?: string[];
    defaultPerPage?: number;
    availableOrderBy?: string[];
}

export interface IPaginationQueryCursorOptions {
    availableSearch?: string[];
    defaultPerPage?: number;
    availableOrderBy?: string[];
    cursorField?: string;
}

export type IPaginationOrderBy = Record<
    string,
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE
>;

export interface IPaginationQueryReturn {
    where?: {
        or: Record<string, { contains: string }>[];
        [key: string]: unknown;
    };
    orderBy?: IPaginationOrderBy;
    limit: number;
    include: unknown;
}

export interface IPaginationQueryOffsetParams extends IPaginationQueryReturn {
    select?: unknown;
    skip: number;
}

export interface IPaginationQueryCursorParams extends IPaginationQueryReturn {
    select?: unknown;
    cursor?: string;
    cursorField?: string;
    includeCount?: boolean;
}

export interface IPaginationQueryFilterOptions {
    customField?: string;
}

export type IPaginationQueryFilterEnumOptions = IPaginationQueryFilterOptions;

export interface IPaginationQueryFilterNumberOptions
    extends IPaginationQueryFilterOptions {
    isNumber: true;
}

export interface IPaginationQueryFilterBooleanOptions
    extends IPaginationQueryFilterOptions {
    isBoolean: true;
}

export type IPaginationQueryFilterEqualOptions =
    | IPaginationQueryFilterOptions
    | IPaginationQueryFilterBooleanOptions
    | IPaginationQueryFilterNumberOptions;

export interface IPaginationQueryFilterDateOptions
    extends IPaginationQueryFilterOptions {
    dayOf?: ENUM_HELPER_DATE_DAY_OF;
    type?: ENUM_PAGINATION_FILTER_DATE_BETWEEN_TYPE;
}

export interface IPaginationIn {
    in: string[];
}

export interface IPaginationNin {
    notIn: string[];
}

export interface IPaginationEqual {
    equals: string | number | boolean;
}

export interface IPaginationNotEqual {
    not: string | number | boolean;
}

export interface IPaginationDate {
    gte?: Date;
    lte?: Date;
    equals?: Date;
}

export interface IPaginationOffsetReturn<T = unknown> {
    type: ENUM_PAGINATION_TYPE.OFFSET;
    count: number;
    perPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
    page: number;
    nextPage?: number;
    previousPage?: number;
    totalPage: number;
    data: T[];
}

export interface IPaginationCursorReturn<T = unknown> {
    type: ENUM_PAGINATION_TYPE.CURSOR;
    count?: number;
    perPage: number;
    hasNext: boolean;
    cursor?: string;
    data: T[];
}

export interface IPaginationRepository {
    findMany: (args?: unknown) => Promise<unknown[]>;
    count: (args?: unknown) => Promise<number>;
}

export interface IPaginationCursorValue {
    cursor: string;
    orderBy: IPaginationOrderBy;
    where: unknown;
}
