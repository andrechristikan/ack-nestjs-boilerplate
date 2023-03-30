import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';

export interface IPaginationService {
    offset(page: number, perPage: number): number;

    totalPage(totalData: number, perPage: number): number;

    offsetWithoutMax(page: number, perPage: number): number;

    totalPageWithoutMax(totalData: number, perPage: number): number;

    page(page: number): number;

    perPage(perPage: number): number;

    order(
        orderByValue: string,
        orderDirectionValue: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
        availableOrderBy: string[],
        availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[]
    ): IPaginationOrder;

    search(
        searchValue: string,
        availableSearch: string[]
    ): Record<string, any> | undefined;

    filterEqual<T = string>(
        field: string,
        filterValue?: T
    ): Record<string, any> | undefined;

    filterContain(
        field: string,
        filterValue?: string
    ): Record<string, any> | undefined;

    filterIn<T = string>(
        field: string,
        filterValue?: T[]
    ): Record<string, any> | undefined;
}
