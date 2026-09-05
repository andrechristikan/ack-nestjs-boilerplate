import { IMessageProperties } from '@common/message/interfaces/message.interface';

export interface IAppBaseExceptionOptions {
    messageProperties?: IMessageProperties;
    metadata?: Record<string, unknown>;
    rawError?: unknown;
    data?: unknown;
}
