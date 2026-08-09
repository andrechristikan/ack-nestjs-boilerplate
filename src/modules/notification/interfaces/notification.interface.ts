import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
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

export interface INotificationWorkspaceInvitePayload {
    workspaceId: string;
    workspaceName: string;
    inviterName: string;
    workspaceMemberRole: EnumWorkspaceMemberRole;
    encryptedInviteAcceptLink: string;
    reference: string;
    expiredAt: string;
}

export type INotificationWorkspaceInviteUnregisteredPayload =
    INotificationWorkspaceInvitePayload;

export interface INotificationWorkspaceJoinRequestPayload {
    workspaceId: string;
    workspaceName: string;
    requesterName: string;
    encryptedJoinRequestReviewLink: string;
}

export interface INotificationWorkspaceJoinAcceptedPayload {
    workspaceId: string;
    workspaceName: string;
}

export interface INotificationWorkspaceJoinRejectedPayload {
    workspaceId: string;
    workspaceName: string;
    rejectReasonCode: EnumWorkspaceJoinRejectReason;
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

export interface INotificationEmailSendUnregisteredPayload {
    email: string;
    cc?: string[];
    bcc?: string[];
}

export interface INotificationEmailUnregisteredQueuePayload<T = unknown> {
    send: INotificationEmailSendUnregisteredPayload;
    data?: T;
}
