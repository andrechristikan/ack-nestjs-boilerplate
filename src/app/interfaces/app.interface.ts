import {
    IMessageProperties,
    IMessageValidationError,
} from '@common/message/interfaces/message.interface';

export interface IAppException<T> {
    statusCode: number;
    message: string;
    messageProperties?: IMessageProperties;
    data?: T;
    metadata?: Record<string, string | number>;
    errors?: IMessageValidationError[];
}
