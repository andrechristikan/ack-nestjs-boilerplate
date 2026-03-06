import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';

export interface INotificationService {
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.NotificationSelect,
            Prisma.NotificationWhereInput
        >
    ): Promise<IResponsePagingReturn<NotificationResponseDto>>;
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
        data: NotificationUserSettingRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
}
