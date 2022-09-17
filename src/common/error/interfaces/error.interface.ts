import { ValidationError } from 'class-validator';
import { ERROR_TYPE } from 'src/common/error/constants/error.enum.constant';
import {
    IMessage,
    IMessageOptionsProperties,
} from 'src/common/message/interfaces/message.interface';

// error default
export interface IErrors {
    readonly message: string | IMessage;
    readonly property: string;
}

// error import
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

// error exception
export interface IErrorException {
    statusCode: number;
    message: string;
    error?: string;
    errors?: ValidationError[] | IValidationErrorImport[];
    errorType?: ERROR_TYPE;
    metadata?: Record<string, any>;
    data?: Record<string, any>;
    properties?: IMessageOptionsProperties;
}

// final error

export interface IErrorHttpFilterMetadata {
    languages: string[];
    timestamp: number;
    timezone: string;
    requestId: string;
    path: string;
    [key: string]: any;
}

export interface IErrorHttpFilter {
    statusCode: number;
    message: string | IMessage;
    error?: string;
    errors?: IErrors[] | IErrorsImport[];
    metadata: IErrorHttpFilterMetadata;
    data?: Record<string, any>;
}
