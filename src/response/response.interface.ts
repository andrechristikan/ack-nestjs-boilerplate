import { AppErrorStatusCode } from 'status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'status-code/status-code.success.constant';
import { IMessageErrors } from 'message/message.interface';

export interface IResponseSuccess {
    statusCode: AppSuccessStatusCode;
    message: string;
    data?: Record<string, any> | Record<string, any>[];
}

export type IResponseRaw = Record<string, any>;
export interface IResponseError {
    statusCode: AppErrorStatusCode;
    message: string;
    errors?: IMessageErrors[];
}

