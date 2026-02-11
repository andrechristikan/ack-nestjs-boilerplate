import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    Notification,
    Prisma,
} from '@prisma/client';

@Injectable()
export class NotificationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

    async findWithPaginationOffset(
        userId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<Notification>> {
        return this.paginationService.offset<Notification>(
            this.databaseService.notification,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                },
            }
        );
    }

    async findWithPaginationCursor(
        userId: string,
        { where, ...params }: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<Notification>> {
        return this.paginationService.cursor<Notification>(
            this.databaseService.notification,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                },
            }
        );
    }

    async existById(
        userId: string,
        notificationId: string
    ): Promise<{
        id: string;
        isRead: boolean;
    } | null> {
        return this.databaseService.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
            select: { id: true, isRead: true },
        });
    }

    async createNewLogin(
        userId: string,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                userId,
                type: EnumNotificationType.security_alert,
                title: 'notification.notify.newLogin.title',
                body: `notification.notify.newLogin.body`,
                data: {
                    loginFrom,
                    loginWith,
                },
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                            {
                                channel: EnumNotificationChannel.push,
                            },
                        ],
                    },
                },
            },
        });
    }

    async markAsRead(
        userId: string,
        notificationId: string
    ): Promise<Notification> {
        return this.databaseService.notification.update({
            where: {
                id: notificationId,
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: this.helperService.dateCreate(),
            },
        });
    }

    async markAllAsRead(userId: string): Promise<Prisma.BatchPayload> {
        return this.databaseService.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: this.helperService.dateCreate(),
            },
        });
    }

    async updateUserSetting(
        userId: string,
        { channel, type, isActive }: NotificationUserSettingRequestDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<void> {
        await this.databaseService.$transaction([
            this.databaseService.user.update({
                where: { id: userId, deletedAt: null },
                data: {
                    updatedBy: userId,
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userUpdateNotificationSetting,
                            ipAddress,
                            userAgent,
                            geoLocation,
                            createdBy: userId,
                        },
                    },
                },
            }),
            this.databaseService.notificationUserSetting.update({
                where: {
                    userId_channel_type: {
                        userId,
                        channel,
                        type,
                    },
                },
                data: {
                    isActive,
                    updatedBy: userId,
                },
            }),
        ]);
    }
}
