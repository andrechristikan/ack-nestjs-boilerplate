export interface IPaginationService {
    skip(page: number, perPage: number): Promise<number>;

    totalPage(totalData: number, limit: number): Promise<number>;

    skipWithoutMax(page: number, perPage: number): Promise<number>;

    totalPageWithoutMax(totalData: number, limit: number): Promise<number>;
}
