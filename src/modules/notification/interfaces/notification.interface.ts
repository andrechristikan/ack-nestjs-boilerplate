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
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';

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

export interface INotificationTermPolicyRecipientState {
    userId: string;
    batchId: string;
    enqueuedAt: Date | null;
}

export interface INotificationTermPolicyRecipientCreate {
    userId: string;
    notificationId: string;
}

export interface INotificationTermPolicyRecipientSend {
    userId: string;
    notificationId: string;
    email: string;
    username: string;
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
    termPolicyId: string;
    type: EnumTermPolicyType;
    version: number;
}

export type INotificationAcceptTermPolicyPayload =
    INotificationPublishTermPolicyPayload;

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

export interface INotificationWelcomeEncryptedPayload extends INotificationVerificationEmailEncryptedPayload {
    verificationNotificationId: string;
}

export interface INotificationBulkQueuePayload<T = null> {
    proceedBy: string;
    data: T;
}

export interface INotificationQueuePayload<
    T = null,
> extends INotificationBulkQueuePayload<T> {
    userId: string;
    notificationId: string;
    completedSteps: EnumNotificationStep[];
}

export interface INotificationSendPushPayload {
    userId: string;
    notificationId: string;
    notificationTokens: string[];
    username: string;
}

export interface INotificationPushQueuePayload<T = null> {
    send: INotificationSendPushPayload;
    data: T;
    completedSteps: EnumNotificationStep[];
    failureTokens: string[] | null;
}

export interface INotificationPushCleanupTokenPayload {
    userId: string;
    failureTokens: string[];
}

export interface INotificationEmailSendPayload {
    userId: string;
    notificationId: string;
    email: string;
    username: string;
    cc: string[];
    bcc: string[];
}

export interface INotificationEmailQueuePayload<T = null> {
    send: INotificationEmailSendPayload;
    data: T;
}

export interface INotificationEmailBulkQueuePayload<T = null> {
    data: T;
    batchId: string;
    proceedBy: string;
}

export interface INotificationEmailSendUnregisteredPayload {
    email: string;
    cc: string[];
    bcc: string[];
}

export interface INotificationEmailUnregisteredQueuePayload<T = null> {
    send: INotificationEmailSendUnregisteredPayload;
    data: T;
}

export interface INotificationStepFailure {
    step: EnumNotificationStep;
    error: string;
}

export interface INotificationStepResult {
    message: string;
    completedSteps: EnumNotificationStep[];
    failedSteps: INotificationStepFailure[];
}

export interface INotificationPushStepResult extends INotificationStepResult {
    failureTokens: string[] | null;
}
