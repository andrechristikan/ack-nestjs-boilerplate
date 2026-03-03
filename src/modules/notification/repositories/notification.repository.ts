import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import {
    INotificationEmailSendPayload,
    INotificationPublishTermPolicyPayload,
} from '@modules/notification/interfaces/notification.interface';
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
        notificationId: string,
        userId: string,
        username: string,
        createdBy: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
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
                            {
                                channel: EnumNotificationChannel.inApp,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createTemporaryPasswordByAdmin(
        notificationId: string,
        userId: string,
        username: string,
        createdBy: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
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
                            {
                                channel: EnumNotificationChannel.inApp,
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

    async createWelcome(
        notificationId: string,
        userId: string,
        username: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
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
                            {
                                channel: EnumNotificationChannel.inApp,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createWelcomeSocial(
        notificationId: string,
        userId: string,
        username: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
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
                            {
                                channel: EnumNotificationChannel.inApp,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createResetPassword(
        notificationId: string,
        userId: string,
        username: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
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
                            {
                                channel: EnumNotificationChannel.push,
                            },
                            {
                                channel: EnumNotificationChannel.silent,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createResetTwoFactorByAdmin(
        notificationId: string,
        userId: string,
        username: string,
        updatedBy: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
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
                            {
                                channel: EnumNotificationChannel.silent,
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

    async createNewDeviceLogin(
        notificationId: string,
        userId: string,
        username: string,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        userAgent: UserAgent
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
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
                            {
                                channel: EnumNotificationChannel.inApp,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createManyPublishTermPolicy(
        notificationId: string,
        { type, version }: INotificationPublishTermPolicyPayload,
        publishedBy: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
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
                            {
                                channel: EnumNotificationChannel.inApp,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createChangePassword(
        notificationId: string,
        userId: string,
        username: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.changePassword.title',
                body: `notification.notify.changePassword.body`,
                userId,
                metadata: {
                    username,
                },
                isRead: false,
                priority: EnumNotificationPriority.high,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                            {
                                channel: EnumNotificationChannel.silent,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createVerifiedEmail(
        notificationId: string,
        userId: string,
        username: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.verifiedEmail.title',
                body: `notification.notify.verifiedEmail.body`,
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
                            {
                                channel: EnumNotificationChannel.silent,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createVerificationEmail(
        notificationId: string,
        userId: string,
        username: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.verificationEmail.title',
                body: `notification.notify.verificationEmail.body`,
                userId,
                metadata: {
                    username,
                },
                isRead: false,
                priority: EnumNotificationPriority.high,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                            {
                                channel: EnumNotificationChannel.silent,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createMobileNumberVerified(
        notificationId: string,
        userId: string,
        username: string,
        mobileNumber: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.mobileNumberVerified.title',
                body: `notification.notify.mobileNumberVerified.body`,
                userId,
                metadata: {
                    username,
                    mobileNumber: this.helperService.censorString(mobileNumber),
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
                            {
                                channel: EnumNotificationChannel.silent,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createForgotPassword(
        notificationId: string,
        userId: string,
        username: string
    ): Promise<Notification> {
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.forgotPassword.title',
                body: `notification.notify.forgotPassword.body`,
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
                            {
                                channel: EnumNotificationChannel.silent,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createPublishTermPolicy(
        payloads: INotificationEmailSendPayload[],
        { type, version }: INotificationPublishTermPolicyPayload,
        proceedBy: string
    ): Promise<void> {
        const data: Prisma.NotificationCreateManyInput[] = payloads.map(
            payload => ({
                userId: payload.userId,
                type: EnumNotificationType.transactional,
                title: 'notification.notify.publishTermPolicy.title',
                body: `notification.notify.publishTermPolicy.body`,
                metadata: {
                    type,
                    version,
                },
                isRead: false,
                priority: EnumNotificationPriority.normal,
                createdBy: proceedBy,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.email,
                            },
                            {
                                channel: EnumNotificationChannel.inApp,
                            },
                            {
                                channel: EnumNotificationChannel.silent,
                            },
                        ],
                    },
                },
            })
        );

        await this.databaseService.notification.createMany({
            data,
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
