import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Notification, Prisma } from '@generated/prisma-client';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { INotificationHttpService } from '@modules/notification/interfaces/notification.http.service.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationHttpService implements INotificationHttpService {
    constructor(private readonly notificationService: NotificationService) {}

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePagingReturn<Notification>> {
        const { data, ...others } =
            await this.notificationService.getListCursor(userId, pagination);

        return {
            data,
            ...others,
        };
    }

    async getListUserSetting(
        userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        const settings =
            await this.notificationService.getListUserSetting(userId);

        return {
            data: {
                settings,
            },
        };
    }

    async markAsRead(
        userId: string,
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        await this.notificationService.markAsRead(userId, notificationId);

        return {};
    }

    async markAllAsRead(userId: string): Promise<IResponseReturn<void>> {
        const count = await this.notificationService.markAllAsRead(userId);

        return {
            metadata: {
                messageProperties: {
                    count,
                },
            },
        };
    }

    async updateUserSetting(
        userId: string,
        data: NotificationUserSettingRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.notificationService.updateUserSetting(userId, data);

        return {};
    }
}
