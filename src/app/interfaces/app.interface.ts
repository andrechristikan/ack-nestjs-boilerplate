import {
    IMessageProperties,
    IMessageValidationError,
    IMessageValidationImportError,
} from '@common/message/interfaces/message.interface';

export interface IAppException<T> {
    statusCode: number;
    message: string;
    messageProperties?: IMessageProperties;
    data?: T;
    metadata?: Record<string, string | number>;
    errors?: IMessageValidationError[];
}

export interface IAppImportException<T>
    extends Omit<IAppException<T>, 'errors'> {
    errors?: IMessageValidationImportError[];
}
