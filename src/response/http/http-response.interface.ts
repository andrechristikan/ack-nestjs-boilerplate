export type IHttpResponse = Record<string, any>;

export interface IHttpResponsePaging {
    totalData: number;
    totalPage: number;
    currentPage: number;
    perPage: number;
    data: Record<string, any>[];
}
