import { IMessage } from 'src/common/message/interfaces/message.interface';

export class ResponseDefaultDto<T = Record<string, any>> {
    readonly statusCode: number;
    readonly message: string | IMessage;
    readonly metadata?: Record<string, any>;
    readonly data?: T;
}
