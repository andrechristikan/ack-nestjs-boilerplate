import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client';

export interface INotificationSendPushPayload {
    userId: string;
    username: string;
}

export interface INotificationSendEmailPayload extends INotificationSendPushPayload {
    email: string;
}

export type INotificationSendPayload = INotificationSendEmailPayload;

export interface INotificationTemporaryPasswordPayload {
    password: string; // TODO: Need to encode this link
    passwordExpiredAt: string;
    passwordCreatedAt: string;
}

export type INotificationCreateByAdminPayload =
    INotificationTemporaryPasswordPayload;

export interface INotificationEmailVerificationPayload {
    link: string; // TODO: Need to encode this link
    expiredAt: string;
    expiredInMinutes: number;
    reference: string;
}

export type INotificationEmailVerifiedPayload = Pick<
    INotificationEmailVerificationPayload,
    'reference'
>;

export interface INotificationForgotPasswordPayload extends INotificationEmailVerificationPayload {
    resendInMinutes: number;
}

export interface INotificationMobileNumberVerifiedPayload extends INotificationEmailVerifiedPayload {
    resendInMinutes: number;
    mobileNumber: string;
}

export interface INotificationNewDeviceLoginPayload {
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
    loginAt: Date;
    requestLog: IRequestLog;
}

export interface INotificationPublishTermPolicyPayload {
    type: EnumTermPolicyType;
    version: number;
}

export interface INotificationWorkerPayload<T = unknown> {
    send: INotificationSendPushPayload;
    data?: T;
}
