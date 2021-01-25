import { AppErrorStatusCode } from 'status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'status-code/status-code.success.constant';

export interface IMessage {
    message: string;
    statusCode: AppErrorStatusCode | AppSuccessStatusCode;
}

export interface IRawMessage {
    message: string;
    statusCode: string;
}

export interface IErrors {
    property: string;
    statusCode: AppErrorStatusCode;
}

export interface IMessageErrors {
    property: string;
    message: string;
}

export interface IRequestErrors {
    property: string;
    message: string;
}
