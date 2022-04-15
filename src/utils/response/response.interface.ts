export type IResponse = Record<string, any>;

export interface IResponsePaging {
    totalData: number;
    totalPage: number;
    currentPage: number;
    perPage: number;
    availableSort: string[];
    sort: {
        field: string;
        type: string;
    };
    data: Record<string, any>[];
}
