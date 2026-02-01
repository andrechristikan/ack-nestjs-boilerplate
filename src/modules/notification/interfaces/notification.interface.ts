import { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';

export interface INotificationSendPayload {
    userId: string;
    username: string;
}

export interface INotificationNewLoginPayload {
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
    loginAt: Date;
    requestLog: IRequestLog;
}

export interface INotificationWorkerPayload<T = unknown> {
    send: INotificationSendPayload;
    data?: T;
}
