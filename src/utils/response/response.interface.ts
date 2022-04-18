export type IResponse = Record<string, any>;

export interface IResponsePaging {
    totalData: number;
    totalPage: number;
    currentPage: number;
    perPage: number;
    availableSearch?: string[];
    availableSort: string[];
    data: Record<string, any>[];
}
