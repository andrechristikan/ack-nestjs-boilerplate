import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    Notification,
    NotificationUserSetting,
    Prisma,
} from '@generated/prisma-client';
import { INotificationUserSettingUpdate } from '@modules/notification/interfaces/notification.interface';

export interface INotificationService {
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePagingReturn<Notification>>;
    getListUserSetting(userId: string): Promise<NotificationUserSetting[]>;
    markAsRead(userId: string, notificationId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<number>;
    updateUserSetting(
        userId: string,
        data: INotificationUserSettingUpdate
    ): Promise<void>;
}
