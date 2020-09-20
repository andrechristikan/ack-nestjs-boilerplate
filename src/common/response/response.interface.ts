export interface IResponseSuccess {
    statusCode: number;
    httpCode: number;
    message: string;
    data?: Record<string, any> | Array<Record<string, any>>;
}

export interface IPagination {
    limit: number;
    skip: number;
}
