import {
    IDatabaseOrder,
    IDatabaseOrderDetail,
} from '@common/database/interfaces/database.interface';
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
    availableOrderBy: IPaginationQueryAvailableOrderBy;
}

export type IPaginationQueryAvailableOrderBy = Record<
    string,
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE[]
>;

export interface IPaginationQueryOptions {
    availableSearch?: string[];
    defaultPerPage?: number;
    availableOrderBy?: IPaginationQueryAvailableOrderBy;
}

export interface IPaginationQueryReturn {
    search?: { or: Record<string, { contains: string }>[] };
    order?: IDatabaseOrderDetail<unknown>;
    limit: number;
    skip: number;
}

export interface IPaginationQueryFilterOptions {
    customField?: string;
}

export interface IPaginationQueryFilterEnumOptions
    extends IPaginationQueryFilterOptions {
    isNumber?: boolean;
}

export type IPaginationQueryFilterEqualOptions =
    IPaginationQueryFilterEnumOptions;

export interface IPaginationQueryFilterDateOptions
    extends IPaginationQueryFilterOptions {
    dayOf?: ENUM_HELPER_DATE_DAY_OF;
    type?: ENUM_PAGINATION_FILTER_DATE_BETWEEN_TYPE;
}
