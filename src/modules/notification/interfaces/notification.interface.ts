import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';

export interface INotificationKindContract {
    type: EnumNotificationType;
    priority: EnumNotificationPriority;
    title: string;
    body: string;
    pendingChannels: EnumNotificationChannel[];
    deliveredChannels: EnumNotificationChannel[];
}

export interface INotificationSettingContract {
    type: EnumNotificationType;
    channels: EnumNotificationChannel[];
}

export interface INotificationCreate {
    id: string;
    userId: string;
    metadata: Prisma.InputJsonValue;
    createdBy: string;
}

export interface INotificationCreateEntry {
    kind: EnumNotificationKind;
    payload: INotificationCreate;
}

export interface INotificationUserSettingUpdate {
    channel: EnumNotificationChannel;
    type: EnumNotificationType;
    isActive: boolean;
}

export interface INotificationTemporaryPasswordPayload {
    password: string;
    passwordExpiredAt: string;
    passwordCreatedAt: string;
}

export interface INotificationTemporaryPasswordEncryptedPayload extends Omit<
    INotificationTemporaryPasswordPayload,
    'password'
> {
    encryptedPassword: string;
}

export type INotificationTemporaryPasswordPushPayload = Omit<
    INotificationTemporaryPasswordPayload,
    'password'
>;

export type INotificationWelcomeByAdminPayload =
    INotificationTemporaryPasswordPayload;

export type INotificationWelcomeByAdminEncryptedPayload =
    INotificationTemporaryPasswordEncryptedPayload;

export interface INotificationVerificationEmailPayload {
    link: string;
    expiredAt: string;
    expiredInMinutes: number;
    reference: string;
}

export interface INotificationVerificationEmailEncryptedPayload extends Omit<
    INotificationVerificationEmailPayload,
    'link'
> {
    encryptedLink: string;
}

export type INotificationVerifiedEmailPayload = Pick<
    INotificationVerificationEmailPayload,
    'reference'
>;

export interface INotificationForgotPasswordPayload extends INotificationVerificationEmailPayload {
    resendInMinutes: number;
}

export interface INotificationForgotPasswordEncryptedPayload extends INotificationVerificationEmailEncryptedPayload {
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
    inviteAcceptLink: string;
    reference: string;
    expiredAt: string;
}

export interface INotificationWorkspaceInviteEncryptedPayload extends Omit<
    INotificationWorkspaceInvitePayload,
    'inviteAcceptLink'
> {
    encryptedInviteAcceptLink: string;
}

export type INotificationWorkspaceInvitePushPayload = Omit<
    INotificationWorkspaceInvitePayload,
    'inviteAcceptLink'
>;

export type INotificationWorkspaceInviteUnregisteredPayload =
    INotificationWorkspaceInvitePayload;

export type INotificationWorkspaceInviteUnregisteredEncryptedPayload =
    INotificationWorkspaceInviteEncryptedPayload;

export interface INotificationWorkspaceJoinRequestPayload {
    workspaceId: string;
    workspaceName: string;
    requesterName: string;
    joinRequestReviewLink: string;
}

export interface INotificationWorkspaceJoinRequestEncryptedPayload extends Omit<
    INotificationWorkspaceJoinRequestPayload,
    'joinRequestReviewLink'
> {
    encryptedJoinRequestReviewLink: string;
}

export type INotificationWorkspaceJoinRequestPushPayload = Omit<
    INotificationWorkspaceJoinRequestPayload,
    'joinRequestReviewLink'
>;

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
