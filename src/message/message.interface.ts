import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';

export interface IMessage extends Omit<IMessageRaw, 'statusCode'> {
    statusCode: AppErrorStatusCode | AppSuccessStatusCode;
}

export interface IMessageRaw {
    message: string;
    statusCode: string;
}

export interface IErrorsRaw {
    property: string;
    statusCode: AppErrorStatusCode;
}

export type IErrors = IErrorsRaw;

export interface IMessageErrors extends Omit<IErrorsRaw, 'statusCode'> {
    message: string;
}

export type IRequestErrors = IMessageErrors;
