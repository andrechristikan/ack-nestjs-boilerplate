import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { MessageService } from '@common/message/services/message.service';
import type { IMessageProperties } from '@common/message/interfaces/message.interface';
import { RequestLanguageStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { Notification } from '@generated/prisma-client/client';
import type { NotificationListRequestDto } from '@modules/notification/dtos/request/notification.list.request.dto';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import type { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { Injectable } from '@nestjs/common';
import { NotificationDefaultAvailableOrderBy } from '@modules/notification/constants/notification.list.constant';

@Injectable()
export class NotificationHttpService {
    constructor(
        private readonly notificationDomain: NotificationDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly messageService: MessageService,
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    private toMessageProperties(
        metadata: Prisma.JsonValue
    ): IMessageProperties {
        const properties: IMessageProperties = {};
        if (
            metadata === null ||
            typeof metadata !== 'object' ||
            Array.isArray(metadata)
        ) {
            return properties;
        }

        for (const [key, value] of Object.entries(metadata)) {
            if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
            ) {
                properties[key] = value;
            }
        }

        return properties;
    }

    private resolveRejectReasonLabel(
        properties: IMessageProperties,
        language: string | null
    ): IMessageProperties {
        const code = properties.rejectReasonCode;
        if (typeof code !== 'string') {
            return properties;
        }

        const options = {
            ...(language !== null && { customLanguage: language }),
        };
        const rejectReasonLabel = this.messageService.setMessage(
            `notification.rejectReason.${code}`,
            options
        );

        return { ...properties, rejectReasonLabel };
    }

    async getListCursor(
        userId: string,
        query: NotificationListRequestDto
    ): Promise<IResponsePaginationReturn<Notification>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.NotificationWhereInput>(
                query,
                { availableOrderBy: NotificationDefaultAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.notificationDomain.getListCursor(
            userId,
            params
        );
        const language = this.requestStoreService.get<string>(
            RequestLanguageStoreKey
        );

        const translated = data.map(notification => {
            const metadataProperties = this.toMessageProperties(
                notification.metadata
            );
            const properties = this.resolveRejectReasonLabel(
                metadataProperties,
                language
            );
            const options = {
                ...(language !== null && { customLanguage: language }),
                properties,
            };
            const title = this.messageService.setMessage(
                notification.title,
                options
            );
            const body = this.messageService.setMessage(
                notification.body,
                options
            );

            return { ...notification, title, body };
        });

        return {
            data: translated,
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
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userUpdateNotificationSetting,
                metadata: {
                    channel: data.channel,
                    type: data.type,
                    isActive: data.isActive,
                },
            }),
        ];
        await this.notificationDomain.updateUserSetting(userId, data);
        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}
