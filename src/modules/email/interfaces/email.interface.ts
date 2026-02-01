import { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';

export interface IEmailSendPayload {
    username: string;
    email: string;
    cc?: string[];
    bcc?: string[];
}

export interface IEmailTempPasswordPayload {
    password: string;
    passwordExpiredAt: string;
    passwordCreatedAt: string;
}

export type ICreateByAdminPayload = IEmailTempPasswordPayload;

export interface IEmailVerificationPayload {
    link: string;
    expiredAt: string;
    expiredInMinutes: number;
    reference: string;
}

export type IEmailVerifiedPayload = Pick<
    IEmailVerificationPayload,
    'reference'
>;

export type IEmailForgotPasswordPayload = IEmailVerificationPayload;

export interface IEmailMobileNumberVerifiedPayload extends IEmailVerifiedPayload {
    mobileNumber: string;
}

export interface IEmailNewLoginPayload {
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
    loginAt: Date;
    requestLog: IRequestLog;
}

export interface IEmailWorkerPayload<T = unknown> {
    send: IEmailSendPayload;
    data?: T;
}
