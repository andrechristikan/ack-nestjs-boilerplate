import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { IMessageErrors } from 'src/message/message.interface';

export type IResponseRaw = Record<string, any>;
export interface IResponseSuccess extends Pick<IResponse, 'data' | 'message'> {
    readonly statusCode: AppSuccessStatusCode;
}
export interface IResponseError extends Pick<IResponse, 'errors' | 'message'> {
    readonly statusCode: AppErrorStatusCode;
}
export interface IResponse {
    readonly statusCode: AppSuccessStatusCode | AppErrorStatusCode;
    readonly message: string;
    readonly errors?: IMessageErrors[];
    readonly data?: Record<string, any> | Record<string, any>[];
}
