import type { IMessageProperties } from '@common/message/interfaces/message.interface';

export type IAppBaseExceptionMetadata = Record<
    string,
    string | number | boolean | null
>;

export interface IAppBaseExceptionOptions {
    messageProperties?: IMessageProperties;
    metadata?: IAppBaseExceptionMetadata;
    rawError?: unknown;
}
