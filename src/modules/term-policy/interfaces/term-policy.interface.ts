import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type {
    Prisma,
    TermPolicy,
    TermPolicyUserAcceptance,
} from '@generated/prisma-client/client';
import type { TermPolicyRecipientStateSelect } from '@modules/term-policy/constants/term-policy.constant';
import type {
    IUserRecipient,
    IUserRef,
} from '@modules/user/interfaces/user.interface';
import type { INotificationTermPolicyBatchRecipient } from '@modules/notification/interfaces/notification.interface';

export interface ITermPolicyUserAcceptance extends TermPolicyUserAcceptance {
    user: IUserRef;
    termPolicy: TermPolicy;
}

export interface ITermPolicyContentUpload {
    language: EnumMessageLanguage;
    size: number;
    key: string;
}

export interface ITermPolicyContent extends Omit<IAwsS3, 'data'> {
    language: EnumMessageLanguage;
}

export interface ITermPolicyCreate {
    type: EnumTermPolicyType;
    version: number;
    contents: ITermPolicyContentUpload[];
}

export interface ITermPolicyContentPresign {
    type: EnumTermPolicyType;
    version: number;
    language: EnumMessageLanguage;
    size: number;
}

export interface ITermPolicyDeleteContentPayload {
    keys: string[];
}

export interface ITermPolicyAcceptanceCreate {
    userId: string;
    types: EnumTermPolicyType[];
    createdBy: string;
}

export interface ITermPolicyAcceptanceRow {
    userId: string;
    termPolicyId: string;
    createdBy: string;
    acceptedAt: Date;
}

export type ITermPolicyRef = Pick<TermPolicy, 'id' | 'type' | 'version'>;

export type ITermPolicyRefAcceptance = ITermPolicyRef & {
    userAcceptances: { id: string }[];
};

export interface ITermPolicyPending {
    termPolicies: ITermPolicyRef[];
}

export type ITermPolicyActivityLogSubject = Pick<
    TermPolicy,
    'id' | 'type' | 'version'
>;

export interface ITermPolicyDeleteContentEffect extends IOutboxEffect {
    queue: EnumTermPolicyQueue.termPolicy;
    name: EnumTermPolicyProcess.deleteContent;
    data: ITermPolicyDeleteContentPayload;
}

export interface ITermPolicyPublishPayload {
    termPolicyId: string;
    type: EnumTermPolicyType;
    version: number;
    recipientCutoffAt: string;
    resendNonce: string | null;
}

export type ITermPolicyPublishInput = Omit<
    ITermPolicyPublishPayload,
    'resendNonce'
>;

export interface ITermPolicyBulkQueuePayload<T> {
    proceedBy: string;
    data: T;
}

export interface ITermPolicyPublishEffect extends IOutboxEffect {
    queue: EnumTermPolicyQueue.termPolicy;
    name: EnumTermPolicyProcess.publish;
    data: ITermPolicyBulkQueuePayload<ITermPolicyPublishPayload>;
}

export type ITermPolicyRecipientState = Prisma.TermPolicyRecipientGetPayload<{
    select: typeof TermPolicyRecipientStateSelect;
}>;

export interface ITermPolicyRecipientCreate {
    userId: string;
    notificationId: string;
}

export type ITermPolicyRecipientUser = IUserRecipient;

export interface ITermPolicyRecipientPage {
    users: ITermPolicyRecipientUser[];
    freshUsers: ITermPolicyRecipientUser[];
    pendingBatchIds: string[];
}

export interface ITermPolicyRecipientPending {
    sendableMarkers: ITermPolicyRecipientState[];
    offPageUserIds: string[];
}

export interface ITermPolicyRecipientBatch {
    batchId: string;
    recipients: INotificationTermPolicyBatchRecipient[];
}

export interface ITermPolicyRecipientClaim {
    claimNonce: string;
    userIds: string[];
}

export interface ITermPolicyDeleteContentQueueResponse extends IQueueResponse {
    keys: string[];
}

export interface ITermPolicyPublishQueueResponse extends IQueueResponse {
    candidateCounts: number;
    createdCounts: number;
    batches: number;
}
