import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Notification } from '@generated/prisma-client/client';
import { NotificationDefaultAvailableOrderBy } from '@modules/notification/constants/notification.list.constant';
import type { NotificationListRequestDto } from '@modules/notification/dtos/request/notification.list.request.dto';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import type { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationHttpService {
    constructor(
        private readonly notificationDomain: NotificationDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListCursor(
        userId: string,
        query: NotificationListRequestDto
    ): Promise<IResponsePaginationReturn<Notification>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.NotificationWhereInput>(
                query,
                {
                    availableOrderBy: NotificationDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.notificationDomain.getListCursor(
            userId,
            params
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
