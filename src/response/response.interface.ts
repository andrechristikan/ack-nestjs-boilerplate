import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { IMessageErrors } from 'src/message/message.interface';

export type IResponseRaw = Record<string, any>;
export interface IResponseSuccess {
    statusCode: AppSuccessStatusCode;
    message: string;
    data?: Record<string, any> | Record<string, any>[];
}
export interface IResponseError {
    statusCode: AppErrorStatusCode;
    message: string;
    errors?: IMessageErrors[];
}
