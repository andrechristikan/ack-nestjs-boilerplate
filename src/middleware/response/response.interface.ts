export interface IApiResponseSuccess {
    statusCode: number;
    httpCode: number;
    message: string;
    data?: Record<string, any> | Record<string, any>[];
}

export interface IApiResponseError {
    statusCode: number;
    httpCode: number;
    message: string;
    errors?: Record<string, any> | Record<string, any>[];
}

export interface IPagination {
    limit: number;
    skip: number;
}
