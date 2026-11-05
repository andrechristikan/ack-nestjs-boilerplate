import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import {
    EnumPaginationFilterDateBetweenType,
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { PaginationInvalidPageException } from '@common/pagination/exceptions/pagination.invalid-page.exception';
import type { PaginationPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.page-cannot-be-less-than-one.exception';
import type { PaginationPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.page-exceeds-maximum.exception';
import type { Prisma } from '@generated/prisma-client/client';

export type IPaginationQueryFilter = Record<
    string,
    string | number | boolean | Array<string | number | boolean> | Date
>;

export type IPaginationOrderBy = Record<
    string,
    EnumPaginationOrderDirectionType
>;

/** The `orderBy` value a list DTO parses (zod output of an optional field): one `field:direction` string, an empty string, or absent. */
export type IPaginationOrderByQuery = string | undefined;

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
    availableOrderBy: readonly string[];
    availableSearch?: readonly string[];
    defaultPerPage?: number;
}

export interface IPaginationQueryCursorOptions {
    scope: string;
    availableOrderBy: readonly string[];
    availableSearch?: readonly string[];
    defaultPerPage?: number;
}

export interface IPaginationQueryDefaultWhere {
    or?: Record<string, { contains?: string }>[];
    [key: string]: unknown;
}

export interface IPaginationSearchWhere {
    OR: Array<Record<string, Prisma.StringFilter>>;
}

export interface IPaginationQueryReturn<
    TArgsWhere = IPaginationQueryDefaultWhere,
> {
    where?: TArgsWhere;
    orderBy: IPaginationOrderBy[];
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
    fingerprint: string;
}

export interface IPaginationDelegate {
    findMany(args: never): PromiseLike<object[]>;
    count(args: never): PromiseLike<number>;
}

export type IPaginationDelegateArgs<TDelegate> = Prisma.Args<
    TDelegate,
    'findMany'
>;

export type IPaginationDelegateShape<TDelegate> =
    | {
          select?: IPaginationDelegateArgs<TDelegate> extends {
              select?: infer TSelect;
          }
              ? TSelect
              : never;
          include?: never;
      }
    | {
          include?: IPaginationDelegateArgs<TDelegate> extends {
              include?: infer TInclude;
          }
              ? TInclude
              : never;
          select?: never;
      };

export type IPaginationDelegateRow<TDelegate, TShape> =
    Prisma.Result<TDelegate, TShape, 'findMany'> extends ReadonlyArray<
        infer TRow
    >
        ? TRow
        : never;

export type IPaginationOffsetArgs<TDelegate> = IPaginationQueryOffsetParams<
    NonNullable<IPaginationDelegateArgs<TDelegate>['where']>
>;

export type IPaginationCursorArgs<TDelegate> = IPaginationQueryCursorParams<
    NonNullable<IPaginationDelegateArgs<TDelegate>['where']>
> & { includeCount?: boolean };

export type IPaginationPageException =
    | PaginationInvalidPageException
    | PaginationPageExceedsMaximumException
    | PaginationPageCannotBeLessThanOneException;

export interface IPaginationQueryFilterOptions {
    customField?: string;
}

export interface IPaginationQueryFilterEqualOptions extends IPaginationQueryFilterOptions {
    isBoolean?: boolean;
    isNumber?: boolean;
}

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

export type IPaginationCursorScalar = string | number | boolean | Date;

export type IPaginationCursorJsonValue =
    string | number | boolean | { $date: string };

export interface IPaginationCursorKeyset {
    OR: Record<
        string,
        | IPaginationCursorScalar
        | { gt: IPaginationCursorScalar }
        | { lt: IPaginationCursorScalar }
    >[];
}

export interface IPaginationCursorToken {
    values: Record<string, IPaginationCursorJsonValue>;
    fingerprint: string;
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

export type IPaginationQueryPatch = Partial<IPaginationQuery>;
