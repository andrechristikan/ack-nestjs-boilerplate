import { ValidationError } from 'class-validator';
import { ERROR_TYPE } from 'src/common/error/constants/error.enum.constant';
import { IMessage } from 'src/common/message/interfaces/message.interface';
import { IResponseCustomPropertyMetadata } from 'src/common/response/interfaces/response.interface';

// error default
export interface IErrors {
    readonly message: string | IMessage;
    readonly property: string;
}

// error import
export interface IErrorsImport {
    row: number;
    file?: string;
    sheet?: number;
    errors: IErrors[];
}

export interface IValidationErrorImport extends Omit<IErrorsImport, 'errors'> {
    errors: ValidationError[];
}

// error exception

export type IErrorCustomPropertyMetadata = Pick<
    IResponseCustomPropertyMetadata,
    'messageProperties'
>;

export interface IErrorMetadata {
    customProperty?: IErrorCustomPropertyMetadata;
    [key: string]: any;
}

export interface IErrorException {
    statusCode: number;
    message: string;
    errors?: ValidationError[] | IValidationErrorImport[];
    data?: Record<string, any>;
    _error?: string;
    _errorType?: ERROR_TYPE;
    _metadata?: IErrorMetadata;
}

export interface IErrorHttpFilter
    extends Omit<IErrorException, '_errorType' | 'message'> {
    message: string | IMessage;
}
