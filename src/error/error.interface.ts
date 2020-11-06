import { HttpErrorStatusCode, SystemErrorStatusCode } from 'error/error.constant';

export interface IApiError {
    property?: string;
    statusCode?: SystemErrorStatusCode;
    message?: string;
    httpCode?: HttpErrorStatusCode;
    errors?: Record<string, any>[];
}
