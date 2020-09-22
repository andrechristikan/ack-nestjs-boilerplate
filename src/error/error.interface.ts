export interface IApiError {
    property?: string;
    statusCode?: number;
    message?: string;
    httpCode?: number;
    errors?: Record<string, any>[];
}
