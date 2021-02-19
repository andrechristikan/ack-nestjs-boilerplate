import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { IMessageErrors } from 'src/message/message.interface';

export type IResponseRaw = Record<string, any>;
export interface IResponseSuccess {
    readonly statusCode: AppSuccessStatusCode;
    readonly message: string;
    readonly data?: Record<string, any> | Record<string, any>[];
}
export interface IResponseError {
    readonly statusCode: AppErrorStatusCode;
    readonly message: string;
    readonly errors?: IMessageErrors[];
}
