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
    EnumNotificationKeyPattern,
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { NotificationReadStateSelect } from '@modules/notification/constants/notification.constant';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import type { NotificationUserSetting } from '@generated/prisma-client/client';

export type INotificationReadState = Prisma.NotificationGetPayload<{
    select: typeof NotificationReadStateSelect;
}>;

export interface INotificationContextBase {
    userId: string;
    proceedBy: string;
}

export interface INotificationPasswordContext extends INotificationContextBase {
    password: string;
    passwordExpiredAt: string;
    passwordCreatedAt: string;
}

export type INotificationSnapshot = {
    username: string;
    encryptedEmail: string;
    encryptedTokens: string[];
};

export interface INotificationSnapshotContext extends INotificationContextBase {
    snapshot: INotificationSnapshot;
}

export interface INotificationTemporaryPasswordContext
    extends INotificationPasswordContext, INotificationSnapshotContext {}

export interface INotificationVerificationLinkContext extends INotificationContextBase {
    link: string;
    reference: string;
    expiredAt: string;
    expiredInMinutes: number;
}

export interface INotificationReferenceContext extends INotificationContextBase {
    reference: string;
}

export interface INotificationVerifiedMobileNumberContext extends INotificationReferenceContext {
    mobileNumber: string;
}

export interface INotificationUserAgentDisplay {
    browser: string;
    deviceDetail: string;
    os: string;
}

export interface INotificationNewDeviceLoginContext
    extends INotificationContextBase, INotificationUserAgentDisplay {
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
    loginAt: string;
    device: string;
    city: string;
    ipAddress: string;
}

export interface INotificationTermPolicyContext extends INotificationContextBase {
    termPolicyId: string;
    type: EnumTermPolicyType;
    version: number;
}

export interface INotificationWorkspaceInviteFields {
    workspaceId: string;
    workspaceName: string;
    inviterName: string;
    reference: string;
    workspaceMemberRole: EnumWorkspaceMemberRole;
    expiredAt: string;
    inviteAcceptLink: string;
}

export interface INotificationWorkspaceInviteContext
    extends INotificationContextBase, INotificationWorkspaceInviteFields {}

export interface INotificationWorkspaceJoinRequestContext extends INotificationContextBase {
    workspaceId: string;
    workspaceName: string;
    requesterName: string;
    joinRequestId: string;
    joinRequestReviewLink: string;
}

export interface INotificationWorkspaceJoinAcceptedContext extends INotificationContextBase {
    workspaceId: string;
    workspaceName: string;
    joinRequestId: string;
}

export interface INotificationWorkspaceJoinRejectedContext extends INotificationWorkspaceJoinAcceptedContext {
    rejectReasonCode: EnumWorkspaceJoinRejectReason;
    rejectReasonLabel: string;
}

export interface INotificationContextMap {
    [EnumNotificationKind.welcome]: INotificationContextBase;
    [EnumNotificationKind.welcomeSocial]: INotificationContextBase;
    [EnumNotificationKind.welcomeByAdmin]: INotificationPasswordContext;
    [EnumNotificationKind.verificationEmail]: INotificationVerificationLinkContext;
    [EnumNotificationKind.verifiedEmail]: INotificationReferenceContext;
    [EnumNotificationKind.verifiedMobileNumber]: INotificationVerifiedMobileNumberContext;
    [EnumNotificationKind.temporaryPasswordByAdmin]: INotificationTemporaryPasswordContext;
    [EnumNotificationKind.changePassword]: INotificationContextBase;
    [EnumNotificationKind.forgotPassword]: INotificationVerificationLinkContext;
    [EnumNotificationKind.resetPassword]: INotificationSnapshotContext;
    [EnumNotificationKind.resetTwoFactorByAdmin]: INotificationSnapshotContext;
    [EnumNotificationKind.newDeviceLogin]: INotificationNewDeviceLoginContext;
    [EnumNotificationKind.publishTermPolicy]: INotificationTermPolicyContext;
    [EnumNotificationKind.userAcceptTermPolicy]: INotificationTermPolicyContext;
    [EnumNotificationKind.workspaceInvite]: INotificationWorkspaceInviteContext;
    [EnumNotificationKind.workspaceJoinRequest]: INotificationWorkspaceJoinRequestContext;
    [EnumNotificationKind.workspaceJoinAccepted]: INotificationWorkspaceJoinAcceptedContext;
    [EnumNotificationKind.workspaceJoinRejected]: INotificationWorkspaceJoinRejectedContext;
}

export type INotificationContext =
    INotificationContextMap[EnumNotificationKind];

export type INotificationContextField<K extends EnumNotificationKind> = Extract<
    keyof INotificationContextMap[K],
    string
>;

export interface INotificationKindContract<
    K extends EnumNotificationKind = EnumNotificationKind,
> {
    type: EnumNotificationType;
    priority: EnumNotificationPriority;
    isMandatory: boolean;
    title: string;
    body: string;
    pendingChannels: EnumNotificationChannel[];
    deliveredChannels: EnumNotificationChannel[];
    queuePriority: EnumQueuePriority;
    secrets: INotificationContextField<K>[];
    keyPattern: EnumNotificationKeyPattern | null;
    metadataFields: INotificationContextField<K>[];
    templateFields: INotificationContextField<K>[];
    dateFields: INotificationContextField<K>[];
}

export type INotificationKeyPatterns = Record<
    EnumNotificationKeyPattern,
    string
>;

export type INotificationSealedRecord = Record<string, Prisma.JsonValue>;

export type INotificationSealedContext = INotificationContextBase &
    INotificationSealedRecord;

export type INotificationRecipientRecord = {
    userId: string;
    username: string;
    encryptedEmail: string;
    encryptedTokens: string[];
    channels: EnumNotificationChannel[];
};

export interface INotificationNotifyPayload {
    kind: EnumNotificationKind;
    context: INotificationSealedContext;
    recipient: INotificationRecipientRecord | null;
    notificationId: string | null;
}

export interface INotificationEmailSendPayload {
    kind: EnumNotificationKind;
    notificationId: string;
    userId: string;
    username: string;
    encryptedEmail: string;
    context: INotificationSealedContext;
    completedSteps: EnumNotificationStep[];
}

export type INotificationSealedInviteContext = Pick<
    INotificationWorkspaceInviteFields,
    'reference'
> &
    INotificationSealedRecord;

export interface INotificationEmailSendUnregisteredPayload {
    encryptedEmail: string;
    context: INotificationSealedInviteContext;
}

export interface INotificationPushSendPayload {
    kind: EnumNotificationKind;
    notificationId: string;
    userId: string;
    username: string;
    encryptedTokens: string[];
    context: INotificationSealedContext;
    completedSteps: EnumNotificationStep[];
    encryptedPendingTokens: string[] | null;
    encryptedFailureTokens: string[] | null;
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
    channels: EnumNotificationChannel[];
}

export interface INotificationCreateEntry {
    kind: EnumNotificationKind;
    payload: INotificationCreate;
}

export interface INotificationTermPolicyRecipientState {
    userId: string;
    notificationId: string;
    batchId: string;
    sentAt: Date | null;
    claimedAt: Date | null;
}

export type INotificationTermPolicyUser = IUserRecipient;

export interface INotificationTermPolicyPage {
    users: INotificationTermPolicyUser[];
    freshUsers: INotificationTermPolicyUser[];
    pendingBatchIds: string[];
}

export interface INotificationTermPolicyPending {
    sendableMarkers: INotificationTermPolicyRecipientState[];
    offPageUserIds: string[];
}

export interface INotificationTermPolicyRecipientCreate {
    userId: string;
    notificationId: string;
}

export interface INotificationTermPolicyBatchRecipient {
    userId: string;
    notificationId: string;
    email: string;
    username: string;
}

export interface INotificationTermPolicyBatchRecipientEncryptedPayload {
    userId: string;
    notificationId: string;
    encryptedEmail: string;
    username: string;
}

export interface INotificationUserSettingUpdate {
    channel: EnumNotificationChannel;
    type: EnumNotificationType;
    isActive: boolean;
}

export interface INotificationAcceptTermPolicyPayload {
    termPolicyId: string;
    type: EnumTermPolicyType;
    version: number;
}

export interface INotificationPublishTermPolicyPayload extends INotificationAcceptTermPolicyPayload {
    recipientCutoffAt: string;
    resendNonce: string | null;
}

export interface INotificationBulkQueuePayload<T = null> {
    proceedBy: string;
    data: T;
}

export interface INotificationPushCleanupTokenEncryptedPayload {
    userId: string;
    encryptedFailureTokens: string[];
}

export interface INotificationEmailBulkQueuePayload<T = null> {
    data: T;
    batchId: string;
    proceedBy: string;
    recipients: INotificationTermPolicyBatchRecipientEncryptedPayload[];
}

export interface INotificationStepFailure {
    step: EnumNotificationStep;
    rawError: Error;
}

export interface INotificationPushTokenPair {
    encrypted: string;
    token: string;
}

export interface INotificationPushSendOutcome {
    encryptedFailureTokens: string[] | null;
    encryptedPendingTokens: string[] | null;
    failure: INotificationStepFailure | null;
}

export type INotificationUserSettingPreference = Pick<
    NotificationUserSetting,
    'channel' | 'type' | 'isActive'
>;

export type INotificationPublishTermPolicyInput = Omit<
    INotificationPublishTermPolicyPayload,
    'resendNonce'
>;

export type INotificationKindContracts = {
    [K in EnumNotificationKind]: INotificationKindContract<K>;
};

export type INotificationEmailPublishTermPolicyResult = {
    message: string;
};

export type INotificationPushCleanupTokensResult = {
    message: string;
    countRequestedTokens: number;
    countRemovedTokens: number;
};

export type INotificationPushCleanupStaleTokensResult = {
    message: string;
    countRemovedTokens: number;
};

export type INotificationTemplateName = Exclude<
    EnumNotificationKind,
    EnumNotificationKind.userAcceptTermPolicy
>;

export type INotificationTemplateEmail = {
    subject: string;
    htmlBody: string;
};
