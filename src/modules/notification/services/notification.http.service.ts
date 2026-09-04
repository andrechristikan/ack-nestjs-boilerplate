import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { NotificationUserSettingDto } from '@modules/notification/dtos/notification.user-setting.dto';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { INotificationHttpService } from '@modules/notification/interfaces/notification.http.service.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationHttpService implements INotificationHttpService {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly notificationUtil: NotificationUtil
    ) {}

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePagingReturn<NotificationResponseDto>> {
        const { data, ...others } =
            await this.notificationService.getListCursor(userId, pagination);

        const notifications: NotificationResponseDto[] =
            this.notificationUtil.mapList(data);

        return {
            data: notifications,
            ...others,
        };
    }

    async getListUserSetting(
        userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        const userSettings =
            await this.notificationService.getListUserSetting(userId);

        const settings: NotificationUserSettingDto[] =
            this.notificationUtil.mapUserSettingList(userSettings);

        return {
            data: {
                settings: settings,
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
