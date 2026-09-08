import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Notification, Prisma } from '@generated/prisma-client';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';

export interface INotificationHttpService {
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePagingReturn<Notification>>;
    getListUserSetting(
        userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>>;
    markAsRead(
        userId: string,
        notificationId: string
    ): Promise<IResponseReturn<void>>;
    markAllAsRead(userId: string): Promise<IResponseReturn<void>>;
    updateUserSetting(
        userId: string,
        data: NotificationUserSettingRequestDto
    ): Promise<IResponseReturn<void>>;
}
