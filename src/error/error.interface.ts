export interface IErrors {
    readonly message: string;
    readonly property: string;
}
export interface IErrorHttpException {
    statusCode: number;
    message: string;
    errors?: IErrors[];
    data?: Record<string, any>;
}
