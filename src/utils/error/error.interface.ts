import { ValidationError } from 'class-validator';
import {
    IMessage,
    IMessageOptionsProperties,
} from 'src/message/message.interface';

export interface IErrors {
    readonly message: string | IMessage;
    readonly property: string;
}

export interface IErrorsImport {
    row: number;
    file?: string;
    errors: IErrors[];
}

export interface IValidationErrorImport {
    row: number;
    file?: string;
    errors: ValidationError[];
}

export interface IErrorException {
    statusCode: number;
    message: string;
    cause?: string;
    errors?: ValidationError[] | IValidationErrorImport[];
    errorFromImport?: boolean;
    data?: Record<string, any>;
    properties?: IMessageOptionsProperties;
}
