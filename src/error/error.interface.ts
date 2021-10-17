export interface IErrors {
    readonly message: string;
    readonly property: string;
}

export interface IErrorHttpException {
    httpCode: number;
    messagePath: string;
}

export interface IErrorHttpExceptionOptions {
    message?: string;
    errors?: IErrors[];
}
