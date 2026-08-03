import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client';

export interface INotificationTemporaryPasswordPayload {
    password: string;
    passwordExpiredAt: string;
    passwordCreatedAt: string;
}

export type INotificationWelcomeByAdminPayload =
    INotificationTemporaryPasswordPayload;

export interface INotificationVerificationEmailPayload {
    link: string;
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
    loginAt: string;
    requestLog: IRequestLog;
}

export interface INotificationPublishTermPolicyPayload {
    type: EnumTermPolicyType;
    version: number;
}

export interface INotificationAcceptTermPolicyPayload extends INotificationPublishTermPolicyPayload {
    termPolicyId: string;
}

export interface INotificationBulkQueuePayload<T = unknown> {
    proceedBy: string;
    data?: T;
}

export interface INotificationQueuePayload<
    T = unknown,
> extends INotificationBulkQueuePayload<T> {
    userId: string;
}

// For push notification

export interface INotificationSendPushPayload {
    userId: string;
    notificationId: string;
    notificationTokens: string[];
    username: string;
}

export interface INotificationPushQueuePayload<T = unknown> {
    send: INotificationSendPushPayload;
    data?: T;
}

export interface INotificationPushCleanupTokenQueuePayload {
    data: {
        userId: string;
        failureTokens: string[];
    };
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

export interface INotificationEmailQueuePayload<T = unknown> {
    send: INotificationEmailSendPayload;
    data?: T;
}

export interface INotificationEmailBulkQueuePayload<T = unknown> {
    send: INotificationEmailSendPayload[];
    data?: T;
}
