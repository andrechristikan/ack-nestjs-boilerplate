export interface IApiError {
    field?: string;
    statusCode?: number;
    message?: string;
    httpCode?: number;
    errors?: Array<Record<string, any>>;
}
