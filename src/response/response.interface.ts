import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { IMessageErrors } from 'src/message/message.interface';

export interface IResponseRaw {
    statusCode?: number;
    message?: string;
}
export interface IResponseSuccess extends IResponseRaw {
    statusCode: AppSuccessStatusCode;
    data?: Record<string, any> | Record<string, any>[];
}
export interface IResponseError extends IResponseRaw {
    statusCode: AppErrorStatusCode;
    errors?: IMessageErrors[];
}
