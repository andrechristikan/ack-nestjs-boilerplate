export enum HttpSuccessStatusCode {
    OK = 200,
    CREATED = 201,
}

export class ResponseSuccess {
    statusCode: number;
    httpCode: number;
    message: string;
    data?: Record<string, any> | Array<Record<string, any>>;
}

export class Pagination {
    limit: number;
    skip: number;
}
