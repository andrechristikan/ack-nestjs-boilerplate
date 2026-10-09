import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    INotificationCreateEntry,
    INotificationTermPolicyRecipientCreate,
    INotificationTermPolicyRecipientSend,
    INotificationTermPolicyRecipientState,
} from '@modules/notification/interfaces/notification.interface';
import {
    EnumNotificationChannel,
    Prisma,
} from '@generated/prisma-client/client';
import type { Notification } from '@generated/prisma-client/client';

export interface INotificationRepository {
    findWithPaginationCursor(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePaginationReturn<Notification>>;
    findIsReadById(
        userId: string,
        notificationId: string
    ): Promise<{ isRead: boolean } | null>;
    createMany(entries: INotificationCreateEntry[]): Promise<Notification[]>;
    findTermPolicyRecipients(
        termPolicyId: string,
        userIds: string[]
    ): Promise<INotificationTermPolicyRecipientState[]>;
    createTermPolicyRecipients(
        proceedBy: string,
        termPolicyId: string,
        batchId: string,
        entries: INotificationCreateEntry[],
        recipients: INotificationTermPolicyRecipientCreate[]
    ): Promise<void>;
    markTermPolicyRecipientsEnqueued(
        termPolicyId: string,
        batchIds: string[],
        enqueuedAt: Date,
        updatedBy: string
    ): Promise<void>;
    findTermPolicyRecipientsUnsent(
        termPolicyId: string,
        batchId: string
    ): Promise<INotificationTermPolicyRecipientSend[]>;
    markTermPolicyRecipientsSent(
        termPolicyId: string,
        batchId: string,
        userIds: string[],
        sentAt: Date,
        updatedBy: string
    ): Promise<void>;
    markAsRead(userId: string, notificationId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<Prisma.BatchPayload>;
    updateProcessAt(
        userId: string,
        notificationId: string,
        channel: EnumNotificationChannel
    ): Promise<Notification>;
    updateSentAt(
        userId: string,
        notificationId: string,
        channel: EnumNotificationChannel,
        failureTokens: string[]
    ): Promise<void>;
}
