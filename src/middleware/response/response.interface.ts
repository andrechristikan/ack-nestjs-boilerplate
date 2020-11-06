import { HttpSuccessStatusCode } from 'middleware/response/response.constant';
import { HttpErrorStatusCode, SystemErrorStatusCode } from 'error/error.constant';

export interface IApiResponse {
    statusCode: HttpSuccessStatusCode | SystemErrorStatusCode;
    message: string;
    data?: Record<string, any> | Record<string, any>[];
    errors?: Record<string, any> | Record<string, any>[];
}

export interface IPagination {
    limit: number;
    skip: number;
}

export interface ISetApiResponse {
    statusCode: HttpSuccessStatusCode | SystemErrorStatusCode;
    message: string;
    options? : ISetApiResponseOptions;
}

export interface ISetApiResponseOptions {
    httpCode?: HttpErrorStatusCode | SystemErrorStatusCode;
    data? : Record<string, any> | Record<string, any>[];
}