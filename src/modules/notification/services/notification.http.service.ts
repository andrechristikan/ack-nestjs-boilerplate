import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Notification } from '@generated/prisma-client/client';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import type { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationHttpService {
    constructor(private readonly notificationDomain: NotificationDomain) {}

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePagingReturn<Notification>> {
        const { data, ...others } = await this.notificationDomain.getListCursor(
            userId,
            pagination
        );

        return {
            data,
            ...others,
        };
    }

    async getListUserSetting(
        userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        const settings =
            await this.notificationDomain.getListUserSetting(userId);

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
        await this.notificationDomain.markAsRead(userId, notificationId);

        return {};
    }

    async markAllAsRead(userId: string): Promise<IResponseReturn<void>> {
        const count = await this.notificationDomain.markAllAsRead(userId);

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
        await this.notificationDomain.updateUserSetting(userId, data);

        return {};
    }
}
