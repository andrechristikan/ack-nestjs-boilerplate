export interface IPaginationService {
    offset(page: number, perPage: number): number;

    totalPage(totalData: number, perPage: number): number;

    offsetWithoutMax(page: number, perPage: number): number;

    totalPageWithoutMax(totalData: number, perPage: number): number;

    page(page: number): number;

    perPage(perPage: number): number;

    sort(
        _availableSort: string[],
        sortValue: string
    ): Record<string, number | string>;

    search(
        _availableSearch: string[],
        searchValue?: string
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
