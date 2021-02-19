import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';

export interface IMessage extends Omit<IMessageRaw, 'statusCode'> {
    readonly statusCode: AppErrorStatusCode | AppSuccessStatusCode;
}

export interface IMessageRaw {
    readonly message: string;
    readonly statusCode: string;
}

export interface IErrorsRaw {
    readonly property: string;
    readonly statusCode: AppErrorStatusCode;
}

export type IErrors = IErrorsRaw;

export interface IMessageErrors extends Omit<IErrorsRaw, 'statusCode'> {
    readonly message: string;
}

export type IRequestErrors = IMessageErrors;
