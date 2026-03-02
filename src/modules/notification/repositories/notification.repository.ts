import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { INotificationPublishTermPolicyPayload } from '@modules/notification/interfaces/notification.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    Notification,
    NotificationUserSetting,
    Prisma,
    UserAgent,
} from '@prisma/client';

@Injectable()
export class NotificationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

    async findWithPaginationCursor(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<
            Prisma.NotificationSelect,
            Prisma.NotificationWhereInput
        >
    ): Promise<IResponsePagingReturn<Notification>> {
        return this.paginationService.cursor<
            Notification,
            Prisma.NotificationSelect,
            Prisma.NotificationWhereInput
        >(this.databaseService.notification, {
            ...params,
            where: {
                ...where,
                userId,
            },
        });
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

    async createWelcomeByAdmin(
        userId: string,
        username: string,
        createdBy: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.welcomeByAdmin.title',
                body: `notification.notify.welcomeByAdmin.body`,
                userId,
                metadata: {
                    username,
                },
                isRead: false,
                priority: EnumNotificationPriority.normal,
                createdBy,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createTemporaryPasswordByAdmin(
        userId: string,
        username: string,
        createdBy: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.temporaryPasswordByAdmin.title',
                body: `notification.notify.temporaryPasswordByAdmin.body`,
                userId,
                metadata: {
                    username,
                },
                isRead: false,
                priority: EnumNotificationPriority.critical,
                createdBy,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createWelcome(
        userId: string,
        username: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.welcome.title',
                body: `notification.notify.welcome.body`,
                userId,
                metadata: {
                    username,
                },
                isRead: false,
                priority: EnumNotificationPriority.normal,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createWelcomeSocial(
        userId: string,
        username: string,
        loginWith: EnumUserLoginWith,
        loginFrom: EnumUserLoginFrom
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.welcome.title',
                body: `notification.notify.welcome.body`,
                userId,
                metadata: {
                    username,
                    loginWith,
                    loginFrom,
                },
                isRead: false,
                priority: EnumNotificationPriority.normal,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createResetPassword(
        userId: string,
        username: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.resetPassword.title',
                body: `notification.notify.resetPassword.body`,
                userId,
                metadata: {
                    username,
                },
                isRead: false,
                priority: EnumNotificationPriority.critical,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createResetTwoFactorByAdmin(
        userId: string,
        username: string,
        updatedBy: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.resetTwoFactorByAdmin.title',
                body: `notification.notify.resetTwoFactorByAdmin.body`,
                userId,
                metadata: {
                    username,
                },
                createdBy: updatedBy,
                isRead: false,
                priority: EnumNotificationPriority.critical,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createNewDeviceLogin(
        userId: string,
        username: string,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        userAgent: UserAgent
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.newDeviceLogin.title',
                body: `notification.notify.newDeviceLogin.body`,
                userId,
                metadata: {
                    username,
                    loginFrom,
                    loginWith,
                    userAgent,
                },
                isRead: false,
                priority: EnumNotificationPriority.critical,
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

    async createPublishTermPolicy(
        { type, version }: INotificationPublishTermPolicyPayload,
        publishedBy: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                type: EnumNotificationType.transactional,
                title: 'notification.notify.publishTermPolicy.title',
                body: `notification.notify.publishTermPolicy.body`,
                userId: null,
                metadata: {
                    type,
                    version,
                },
                isRead: false,
                priority: EnumNotificationPriority.normal,
                createdBy: publishedBy,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
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

    async findUserSetting(userId: string): Promise<NotificationUserSetting[]> {
        return this.databaseService.notificationUserSetting.findMany({
            where: {
                userId,
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
