import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationCreate,
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
    create(
        kind: EnumNotificationKind,
        payload: INotificationCreate
    ): Promise<Notification>;
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
    ): Promise<{ title: string; body: string } | null>;
    updateSentAt(
        userId: string,
        notificationId: string,
        channel: EnumNotificationChannel,
        failureTokens: string[]
    ): Promise<void>;
}
