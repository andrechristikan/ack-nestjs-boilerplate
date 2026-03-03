import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client';

export interface INotificationTemporaryPasswordPayload {
    password: string; // TODO: Need to encode this link
    passwordExpiredAt: string;
    passwordCreatedAt: string;
}

export type INotificationWelcomeByAdminPayload =
    INotificationTemporaryPasswordPayload;

export interface INotificationVerificationEmailPayload {
    link: string; // TODO: Need to encode this link
    expiredAt: string;
    expiredInMinutes: number;
    reference: string;
}

export type INotificationVerifiedEmailPayload = Pick<
    INotificationVerificationEmailPayload,
    'reference'
>;

export interface INotificationForgotPasswordPayload extends INotificationVerificationEmailPayload {
    resendInMinutes: number;
}

export interface INotificationVerifiedMobileNumberPayload extends INotificationVerifiedEmailPayload {
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

export interface INotificationWorkerBulkPayload<T = unknown> {
    proceedBy: string;
    data?: T;
}

export interface INotificationWorkerPayload<
    T = unknown,
> extends INotificationWorkerBulkPayload<T> {
    userId: string;
}

// For push notification

export interface INotificationSendPushPayload {
    userId: string;
    notificationId: string;
    notificationToken: string[];
    username: string;
}

export interface INotificationPushWorkerPayload<T = unknown> {
    send: INotificationSendPushPayload;
    data?: T;
}

// For email notification
export interface INotificationEmailSendPayload {
    userId: string;
    notificationId: string;
    email: string;
    username: string;
    cc?: string[];
    bcc?: string[];
}

export interface INotificationEmailWorkerPayload<T = unknown> {
    send: INotificationEmailSendPayload;
    data?: T;
}

export interface INotificationEmailWorkerBulkPayload<T = unknown> {
    send: INotificationEmailSendPayload[];
    data?: T;
}
