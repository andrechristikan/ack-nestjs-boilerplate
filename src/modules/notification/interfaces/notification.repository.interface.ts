import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationCreate,
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
    createInTx(
        tx: IDatabaseTransactionClient,
        kind: EnumNotificationKind,
        payload: INotificationCreate
    ): Promise<void>;
    findTermPolicyRecipients(
        termPolicyId: string,
        userIds: string[]
    ): Promise<INotificationTermPolicyRecipientState[]>;
    findTermPolicyRecipientsSendableByBatchIds(
        termPolicyId: string,
        batchIds: string[]
    ): Promise<INotificationTermPolicyRecipientState[]>;
    createTermPolicyRecipientsInTx(
        tx: IDatabaseTransactionClient,
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
        at: Date,
        updatedBy: string
    ): Promise<boolean>;
    updateDeliverySentAt(
        notificationId: string,
        channel: EnumNotificationChannel,
        at: Date,
        failureTokens: string[],
        updatedBy: string
    ): Promise<boolean>;
    updateDeliverySentAtInTx(
        tx: IDatabaseTransactionClient,
        notificationId: string,
        channel: EnumNotificationChannel,
        at: Date,
        failureTokens: string[],
        updatedBy: string
    ): Promise<boolean>;
}
