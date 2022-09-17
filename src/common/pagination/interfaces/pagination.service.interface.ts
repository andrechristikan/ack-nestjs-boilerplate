export interface IPaginationService {
    skip(page: number, perPage: number): Promise<number>;

    totalPage(totalData: number, limit: number): Promise<number>;
}
