import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type { SendTemplatedEmailCommandOutput } from '@aws-sdk/client-ses';
import type {
    EnumNotificationEmailProcess,
    EnumNotificationProcess,
    EnumNotificationPushProcess,
    EnumNotificationQueue,
    EnumNotificationSmsProcess,
} from '@modules/notification/enums/notification.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserReauthenticationAction,
    EnumWorkspaceJoinRejectReason,
    Prisma,
} from '@generated/prisma-client/client';
import {
    EnumNotificationKeyPattern,
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { NotificationReadStateSelect } from '@modules/notification/constants/notification.constant';
import type { ITermPolicyPublishPayload } from '@modules/term-policy/interfaces/term-policy.interface';
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

export interface INotificationVerificationMobileNumberContext extends INotificationContextBase {
    verificationId: string;
    otp: string;
    reference: string;
    expiredInMinutes: number;
}

export interface INotificationReauthenticationOtpContext extends INotificationContextBase {
    verificationId: string;
    otp: string;
    action: EnumUserReauthenticationAction;
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

export interface INotificationUserImportResultContext extends INotificationReferenceContext {
    created: number;
    failed: number;
    reasons: string[];
}

export interface INotificationWorkspaceInviteFields {
    workspaceId: string;
    workspaceName: string;
    inviterName: string;
    reference: string;
    workspaceMemberRole: string;
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

export interface INotificationLoginLockedContext extends INotificationContextBase {
    method: EnumNotificationLoginLockedMethod;
    methodLabel: string;
    lockedUntil: string;
}

export interface INotificationContextMap {
    [EnumNotificationKind.welcome]: INotificationContextBase;
    [EnumNotificationKind.welcomeSocial]: INotificationContextBase;
    [EnumNotificationKind.welcomeByAdmin]: INotificationPasswordContext;
    [EnumNotificationKind.verificationEmail]: INotificationVerificationLinkContext;
    [EnumNotificationKind.verificationMobileNumber]: INotificationVerificationMobileNumberContext;
    [EnumNotificationKind.reauthenticationOtp]: INotificationReauthenticationOtpContext;
    [EnumNotificationKind.verifiedEmail]: INotificationReferenceContext;
    [EnumNotificationKind.verifiedMobileNumber]: INotificationVerifiedMobileNumberContext;
    [EnumNotificationKind.temporaryPasswordByAdmin]: INotificationTemporaryPasswordContext;
    [EnumNotificationKind.changePassword]: INotificationContextBase;
    [EnumNotificationKind.forgotPassword]: INotificationVerificationLinkContext;
    [EnumNotificationKind.resetPassword]: INotificationSnapshotContext;
    [EnumNotificationKind.resetMfaByAdmin]: INotificationSnapshotContext;
    [EnumNotificationKind.loginLocked]: INotificationLoginLockedContext;
    [EnumNotificationKind.newDeviceLogin]: INotificationNewDeviceLoginContext;
    [EnumNotificationKind.publishTermPolicy]: INotificationTermPolicyContext;
    [EnumNotificationKind.userAcceptTermPolicy]: INotificationTermPolicyContext;
    [EnumNotificationKind.userImportResult]: INotificationUserImportResultContext;
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

export type INotificationSealedData = INotificationContextBase & {
    snapshot: INotificationSnapshot | null;
    verificationId: string | null;
} & INotificationSealedRecord;

export type INotificationRecipientRecord = {
    userId: string;
    username: string;
    encryptedEmail: string;
    encryptedTokens: string[];
    encryptedMobileNumber: string | null;
    channels: EnumNotificationChannel[];
};

export interface INotificationNotifyPayload {
    kind: EnumNotificationKind;
    context: INotificationSealedData;
    recipient: INotificationRecipientRecord | null;
    notificationId: string | null;
}

export interface INotificationEmailSendPayload {
    kind: EnumNotificationKind;
    notificationId: string;
    userId: string;
    username: string;
    encryptedEmail: string;
    context: INotificationSealedData;
    completedSteps: EnumNotificationStep[];
}

export type INotificationSealedInviteContext = Pick<
    INotificationWorkspaceInviteFields,
    'reference'
> &
    INotificationSealedRecord;

export interface INotificationSmsSendPayload {
    kind: EnumNotificationKind;
    notificationId: string;
    userId: string;
    username: string;
    encryptedMobileNumber: string;
    context: INotificationSealedData;
    completedSteps: EnumNotificationStep[];
}

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
    context: INotificationSealedData;
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

export interface INotificationCreateRecipient {
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

export interface INotificationEmailBulkOutcome {
    sentUserIds: string[];
    failedUserIds: string[];
    unknownCount: number;
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
    | EnumNotificationKind.userAcceptTermPolicy
    | EnumNotificationKind.verificationMobileNumber
>;

export type INotificationTemplateEmail = {
    subject: string;
    htmlBody: string;
};

export interface INotificationNotifyEffect extends IOutboxEffect {
    queue: EnumNotificationQueue.notification;
    name: EnumNotificationProcess.notify;
    data: INotificationNotifyPayload;
}

export interface INotificationEmailPublishTermPolicyEffect extends IOutboxEffect {
    queue: EnumNotificationQueue.notificationEmail;
    name: EnumNotificationEmailProcess.publishTermPolicy;
    data: INotificationEmailBulkQueuePayload<ITermPolicyPublishPayload>;
}

export interface INotificationEmailSendEffect extends IOutboxEffect {
    queue: EnumNotificationQueue.notificationEmail;
    name: EnumNotificationEmailProcess.send;
    data: INotificationEmailSendPayload;
}

export interface INotificationEmailSendUnregisteredEffect extends IOutboxEffect {
    queue: EnumNotificationQueue.notificationEmail;
    name: EnumNotificationEmailProcess.sendUnregistered;
    data: INotificationEmailSendUnregisteredPayload;
}

export interface INotificationPushSendEffect extends IOutboxEffect {
    queue: EnumNotificationQueue.notificationPush;
    name: EnumNotificationPushProcess.send;
    data: INotificationPushSendPayload;
}

export interface INotificationSmsSendEffect extends IOutboxEffect {
    queue: EnumNotificationQueue.notificationSms;
    name: EnumNotificationSmsProcess.send;
    data: INotificationSmsSendPayload;
}

export interface INotificationPushCleanupTokensEffect extends IOutboxEffect {
    queue: EnumNotificationQueue.notificationPush;
    name: EnumNotificationPushProcess.cleanupTokens;
    data: INotificationPushCleanupTokenEncryptedPayload;
}

export interface INotificationEmailSendQueueResponse extends IQueueResponse {
    result: SendTemplatedEmailCommandOutput | null;
}

export interface INotificationEmailSendUnregisteredQueueResponse extends IQueueResponse {
    result: SendTemplatedEmailCommandOutput | null;
}
