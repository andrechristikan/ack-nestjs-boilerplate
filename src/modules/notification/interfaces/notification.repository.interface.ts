import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import {
    INotificationCreate,
    INotificationCreateEntry,
} from '@modules/notification/interfaces/notification.interface';
import {
    EnumNotificationChannel,
    Notification,
    Prisma,
} from '@generated/prisma-client';

export interface INotificationRepository {
    findWithPaginationCursor(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePagingReturn<Notification>>;
    findIsReadById(
        userId: string,
        notificationId: string
    ): Promise<{ isRead: boolean } | null>;
    create(
        kind: EnumNotificationKind,
        payload: INotificationCreate
    ): Promise<Notification>;
    createMany(entries: INotificationCreateEntry[]): Promise<Notification[]>;
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
