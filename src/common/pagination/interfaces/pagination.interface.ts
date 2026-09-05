import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import {
    EnumPaginationFilterDateBetweenType,
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';

export type IPaginationQueryFilter = Record<
    string,
    string | number | boolean | Array<string | number | boolean> | Date
>;

export type IPaginationOrderBy = Record<
    string,
    EnumPaginationOrderDirectionType
>;

export interface IPaginationQuery {
    search?: string;
    filters?: IPaginationQueryFilter;
    page: number;
    perPage: number;
    cursor?: string;
    orderBy: IPaginationOrderBy[];
    availableSearch: string[];
    availableOrderBy: string[];
}

export interface IPaginationQueryOffsetOptions {
    availableOrderBy?: string[];
    availableSearch?: string[];
    defaultPerPage?: number;
}

export interface IPaginationQueryCursorOptions {
    availableOrderBy?: string[];
    availableSearch?: string[];
    defaultPerPage?: number;
    cursorField?: string;
}

export interface IPaginationQueryDefaultWhere {
    or?: Record<string, { contains?: string }>[];
    [key: string]: unknown;
}

export interface IPaginationQueryRaw {
    search?: string;
    page?: number | string;
    perPage?: number | string;
    cursor?: string;
    orderBy?: string | string[];
}

export interface IPaginationSearchPipeReturn<TArgsWhere = unknown> extends Omit<
    IPaginationQueryRaw,
    'search'
> {
    where?: TArgsWhere;
}

export interface IPaginationPipeReturn<TArgsWhere = unknown> {
    where?: TArgsWhere;
    orderBy?: string | string[];
    limit: number;
}

export interface IPaginationOffsetPipeReturn<
    TArgsWhere = unknown,
> extends IPaginationPipeReturn<TArgsWhere> {
    skip: number;
}

export interface IPaginationCursorPipeReturn<
    TArgsWhere = unknown,
> extends IPaginationPipeReturn<TArgsWhere> {
    cursor?: string;
    cursorField: string;
}

export interface IPaginationQueryReturn<
    TArgsWhere = IPaginationQueryDefaultWhere,
> {
    where?: TArgsWhere;
    orderBy?: IPaginationOrderBy[];
    limit: number;
}

export interface IPaginationQueryOffsetParams<
    TArgsWhere = unknown,
> extends IPaginationQueryReturn<TArgsWhere> {
    skip: number;
}

export interface IPaginationQueryCursorParams<
    TArgsWhere = unknown,
> extends IPaginationQueryReturn<TArgsWhere> {
    cursor?: string;
    cursorField?: string;
}

export interface IPaginationOffsetArgs<
    TArgsWhere = unknown,
> extends IPaginationQueryOffsetParams<TArgsWhere> {
    include?: unknown;
}

export interface IPaginationCursorArgs<
    TArgsWhere = unknown,
> extends IPaginationQueryCursorParams<TArgsWhere> {
    include?: unknown;
    includeCount?: boolean;
}

export interface IPaginationQueryFilterOptions {
    customField?: string;
}

export type IPaginationQueryFilterEnumOptions = IPaginationQueryFilterOptions;

export interface IPaginationQueryFilterNumberOptions extends IPaginationQueryFilterOptions {
    isNumber: true;
}

export interface IPaginationQueryFilterBooleanOptions extends IPaginationQueryFilterOptions {
    isBoolean: true;
}

export type IPaginationQueryFilterEqualOptions =
    | IPaginationQueryFilterOptions
    | IPaginationQueryFilterBooleanOptions
    | IPaginationQueryFilterNumberOptions;

export interface IPaginationQueryFilterDateOptions extends IPaginationQueryFilterOptions {
    dayOf?: EnumHelperDateDayOf;
    type?: EnumPaginationFilterDateBetweenType;
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
    type: EnumPaginationType.offset;
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
    type: EnumPaginationType.cursor;
    count?: number;
    perPage: number;
    hasNext: boolean;
    cursor?: string;
    data: T[];
}

export interface IPaginationRepository {
    findMany(args?: unknown): Promise<unknown[]>;
    count(args?: unknown): Promise<number>;
}

export interface IPaginationCursorValue {
    cursor: string;
    fingerprint: string;
}
