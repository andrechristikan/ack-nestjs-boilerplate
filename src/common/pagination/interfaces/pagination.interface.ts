import { ENUM_HELPER_DATE_DAY_OF } from '@common/helper/enums/helper.enum';
import {
    ENUM_PAGINATION_FILTER_DATE_BETWEEN_TYPE,
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
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
    skip: number;
    orderBy: string;
    orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;
    availableSearch: string[];
    availableOrderBy: string[];
}

export interface IPaginationQueryOptions {
    availableSearch?: string[];
    defaultPerPage?: number;
    availableOrderBy?: string[];
}

export type IPaginationOrder = Record<
    string,
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE
>;

export interface IPaginationQueryReturn {
    search?: { or: Record<string, { contains: string }>[] };
    order?: IPaginationOrder;
    limit: number;
    skip: number;
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
