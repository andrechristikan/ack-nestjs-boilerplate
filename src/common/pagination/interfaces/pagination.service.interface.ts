import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';

export interface IPaginationService {
    offset(page: number, perPage: number): number;
    totalPage(totalData: number, perPage: number): number;
    offsetWithoutMax(page: number, perPage: number): number;
    totalPageWithoutMax(totalData: number, perPage: number): number;
    page(page?: number): number;
    perPage(perPage?: number): number;
    order(
        orderByValue?: string,
        orderDirectionValue?: string,
        availableOrderBy?: string[]
    ): IPaginationOrder;
    search(
        searchValue?: string,
        availableSearch?: string[]
    ): Record<string, any> | undefined;
    filterEqual<T = string>(field: string, filterValue: T): Record<string, T>;
    filterContain(
        field: string,
        filterValue: string
    ): Record<string, { $regex: RegExp; $options: string }>;
    filterContainFullMatch(
        field: string,
        filterValue: string
    ): Record<string, { $regex: RegExp; $options: string }>;
    filterIn<T = string>(
        field: string,
        filterValue: T[]
    ): Record<string, { $in: T[] }>;
    filterDate(field: string, filterValue: Date): Record<string, Date>;
}
