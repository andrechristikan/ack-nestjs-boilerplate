import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    INotificationCreateEntry,
    INotificationReadState,
    INotificationTermPolicyRecipientCreate,
    INotificationTermPolicyRecipientState,
} from '@modules/notification/interfaces/notification.interface';
import {
    EnumNotificationChannel,
    EnumNotificationType,
    Prisma,
} from '@generated/prisma-client/client';
import type { Notification } from '@generated/prisma-client/client';

export interface INotificationRepository {
    findWithPaginationCursor(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>,
        excludedTypes: EnumNotificationType[]
    ): Promise<IResponsePaginationReturn<Notification>>;
    findIsReadById(
        userId: string,
        notificationId: string
    ): Promise<INotificationReadState | null>;
    createMany(entries: INotificationCreateEntry[]): Promise<Notification[]>;
    findTermPolicyRecipients(
        termPolicyId: string,
        userIds: string[]
    ): Promise<INotificationTermPolicyRecipientState[]>;
    findTermPolicyRecipientsSendableByBatchIds(
        termPolicyId: string,
        batchIds: string[]
    ): Promise<INotificationTermPolicyRecipientState[]>;
    createTermPolicyRecipients(
        proceedBy: string,
        termPolicyId: string,
        batchId: string,
        entries: INotificationCreateEntry[],
        recipients: INotificationTermPolicyRecipientCreate[]
    ): Promise<void>;
    claimTermPolicyRecipients(
        termPolicyId: string,
        batchId: string,
        userIds: string[],
        claimNonce: string,
        claimedAt: Date,
        updatedBy: string
    ): Promise<string[]>;
    markTermPolicyRecipientsSent(
        claimNonce: string,
        userIds: string[],
        notificationIds: string[],
        sentAt: Date,
        updatedBy: string
    ): Promise<void>;
    releaseTermPolicyRecipients(
        claimNonce: string,
        userIds: string[],
        updatedBy: string
    ): Promise<void>;
    markAsRead(notificationId: string, userId: string): Promise<boolean>;
    markAllAsRead(
        userId: string,
        excludedTypes: EnumNotificationType[]
    ): Promise<Prisma.BatchPayload>;
    updateDeliveryProcessedAt(
        notificationId: string,
        channel: EnumNotificationChannel,
        at: Date
    ): Promise<boolean>;
    updateDeliverySentAt(
        notificationId: string,
        channel: EnumNotificationChannel,
        at: Date,
        failureTokens: string[]
    ): Promise<boolean>;
}
