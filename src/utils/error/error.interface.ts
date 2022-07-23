import {
    IMessage,
    IMessageOptionsProperties,
} from 'src/message/message.interface';

export interface IErrors {
    readonly message: string | IMessage;
    readonly property: string;
}

export interface IErrorException {
    statusCode: number;
    message: string;
    cause?: string;
    errors?: IErrors[];
    data?: Record<string, any>;
    properties?: IMessageOptionsProperties;
}
