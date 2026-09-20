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
    availableSearch: readonly string[];
    availableOrderBy: readonly string[];
}

export interface IPaginationQueryOffsetOptions {
    availableOrderBy?: readonly string[];
    availableSearch?: readonly string[];
    defaultPerPage?: number;
}

export interface IPaginationQueryCursorOptions {
    availableOrderBy?: readonly string[];
    availableSearch?: readonly string[];
    defaultPerPage?: number;
    cursorField?: string;
}

export interface IPaginationQueryDefaultWhere {
    or?: Record<string, { contains?: string }>[];
    [key: string]: unknown;
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

export type IPaginationShape =
    | { include?: unknown; select?: never }
    | { select?: unknown; include?: never };

export type IPaginationOffsetArgs<TArgsWhere = unknown> =
    IPaginationQueryOffsetParams<TArgsWhere> & IPaginationShape;

export type IPaginationCursorArgs<TArgsWhere = unknown> =
    IPaginationQueryCursorParams<TArgsWhere> & {
        includeCount?: boolean;
    } & IPaginationShape;

export interface IPaginationQueryFilterOptions {
    customField?: string;
}

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

/**
 * Wire shape shared by offset list query DTOs after zod parse.
 */
export interface IPaginationOffsetQueryDto {
    page?: number;
    perPage?: number;
    search?: string;
    orderBy?: string | string[];
}

/**
 * Wire shape shared by cursor list query DTOs after zod parse.
 */
export interface IPaginationCursorQueryDto {
    cursor?: string;
    perPage?: number;
    search?: string;
    orderBy?: string | string[];
}

/**
 * One filter helper result: Prisma `where` fragment plus the scalar the store surfaces.
 */
export interface IPaginationQueryFilterResult<
    TWhere extends Record<string, unknown> = Record<string, unknown>,
> {
    where: TWhere;
    storeFilter: IPaginationQueryFilter;
}
