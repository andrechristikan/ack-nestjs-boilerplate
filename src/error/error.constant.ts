export enum HttpErrorStatusCode {
    MOVED_PERMANENTLY = 301,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    METHOD_NOT_ALLOWED = 405,
    NOT_ACCEPTABLE = 406,
    REQUEST_TIMEOUT = 408,
    UNSUPPORTED_MEDIA_TYPE = 415,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    NOT_IMPLEMENTED = 501,
    BAD_GATEWAY = 502,
    SERVICE_UNAVAILABLE = 503,
}

export enum SystemErrorStatusCode {
    // ? FORM ERROR

    // ! USER
    USER_NOT_FOUND = 3100,
    USER_EXIST = 3101,
    USER_MOBILE_NUMBER_EXIST = 3102,
    USER_EMAIL_EXIST = 3103,

    // ! COUNTRY
    COUNTRY_NOT_FOUND = 3110,
    COUNTRY_MOBILE_NUMBER_CODE_EXIST = 3111,
    COUNTRY_CODE_EXIST = 3112,
    COUNTRY_EXIST = 3113,

    // ? FATAL ERROR
    GENERAL_ERROR = 10000,
}

export class ApiError {
    field?: string;
    statusCode?: number;
    message?: string;
    httpCode?: number;
    errors?: Array<Record<string, any>>;
}
