import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
} from '@prisma/client';

@Injectable()
export class NotificationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService,
        private readonly databaseUtil: DatabaseUtil
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
    ): Promise<{ id: string; isRead: boolean } | null> {
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.welcomeByAdmin.title',
                body: 'notification.notify.welcomeByAdmin.body',
                userId,
                metadata: { username },
                isRead: false,
                priority: EnumNotificationPriority.normal,
                createdBy,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
                            },
                            {
                                channel: EnumNotificationChannel.email,
                            },
                            {
                                channel: EnumNotificationChannel.inApp,
                                processedAt: today,
                                sentAt: today,
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.welcome.title',
                body: 'notification.notify.welcome.body',
                userId,
                metadata: { username },
                isRead: false,
                priority: EnumNotificationPriority.normal,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
                            },
                            {
                                channel: EnumNotificationChannel.email,
                            },
                            {
                                channel: EnumNotificationChannel.inApp,
                                processedAt: today,
                                sentAt: today,
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.welcomeSocial.title',
                body: 'notification.notify.welcomeSocial.body',
                userId,
                metadata: { username },
                isRead: false,
                priority: EnumNotificationPriority.normal,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
                            },
                            {
                                channel: EnumNotificationChannel.email,
                            },
                            {
                                channel: EnumNotificationChannel.inApp,
                                processedAt: today,
                                sentAt: today,
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
        passwordExpiredAt: Date,
        createdBy: string
    ): Promise<Notification> {
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.temporaryPasswordByAdmin.title',
                body: 'notification.notify.temporaryPasswordByAdmin.body',
                userId,
                metadata: { username, passwordExpiredAt },
                isRead: false,
                priority: EnumNotificationPriority.critical,
                createdBy,
                deliveries: {
                    createMany: {
                        data: [
                            { channel: EnumNotificationChannel.email },
                            { channel: EnumNotificationChannel.push },
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.changePassword.title',
                body: 'notification.notify.changePassword.body',
                userId,
                metadata: { username },
                isRead: false,
                priority: EnumNotificationPriority.critical,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            { channel: EnumNotificationChannel.email },
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.verifiedEmail.title',
                body: 'notification.notify.verifiedEmail.body',
                userId,
                metadata: { username },
                isRead: false,
                priority: EnumNotificationPriority.normal,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
                            },
                            {
                                channel: EnumNotificationChannel.email,
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.verificationEmail.title',
                body: 'notification.notify.verificationEmail.body',
                userId,
                metadata: { username },
                isRead: false,
                priority: EnumNotificationPriority.high,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
                            },
                            {
                                channel: EnumNotificationChannel.email,
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.userActivity,
                title: 'notification.notify.mobileNumberVerified.title',
                body: 'notification.notify.mobileNumberVerified.body',
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
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
                            },
                            {
                                channel: EnumNotificationChannel.email,
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.forgotPassword.title',
                body: 'notification.notify.forgotPassword.body',
                userId,
                metadata: { username },
                isRead: false,
                priority: EnumNotificationPriority.critical,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            { channel: EnumNotificationChannel.email },
                            { channel: EnumNotificationChannel.push },
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.resetPassword.title',
                body: 'notification.notify.resetPassword.body',
                userId,
                metadata: { username },
                isRead: false,
                priority: EnumNotificationPriority.critical,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            { channel: EnumNotificationChannel.email },
                            { channel: EnumNotificationChannel.push },
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
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
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.resetTwoFactorByAdmin.title',
                body: 'notification.notify.resetTwoFactorByAdmin.body',
                userId,
                metadata: { username },
                isRead: false,
                priority: EnumNotificationPriority.critical,
                createdBy: updatedBy,
                deliveries: {
                    createMany: {
                        data: [
                            { channel: EnumNotificationChannel.email },
                            { channel: EnumNotificationChannel.push },
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
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
        device: string,
        city: string,
        loginAt: Date
    ): Promise<Notification> {
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.create({
            data: {
                id: notificationId,
                type: EnumNotificationType.securityAlert,
                title: 'notification.notify.newDeviceLogin.title',
                body: 'notification.notify.newDeviceLogin.body',
                userId,
                metadata: {
                    username,
                    loginFrom,
                    loginWith,
                    device,
                    city,
                    loginAt,
                },
                isRead: false,
                priority: EnumNotificationPriority.critical,
                createdBy: userId,
                deliveries: {
                    createMany: {
                        data: [
                            { channel: EnumNotificationChannel.email },
                            { channel: EnumNotificationChannel.push },
                            {
                                channel: EnumNotificationChannel.silent,
                                processedAt: today,
                                sentAt: today,
                            },
                        ],
                    },
                },
            },
        });
    }

    async createManyPublishTermPolicy(
        payloads: INotificationEmailSendPayload[],
        { type, version }: INotificationPublishTermPolicyPayload,
        proceedBy: string
    ): Promise<void> {
        const today = this.helperService.dateCreate();
        await Promise.all(
            payloads.map(payload =>
                this.databaseService.notification.create({
                    data: {
                        id: payload.notificationId,
                        userId: payload.userId,
                        type: EnumNotificationType.transactional,
                        title: 'notification.notify.publishTermPolicy.title',
                        body: 'notification.notify.publishTermPolicy.body',
                        metadata: { type, version },
                        isRead: false,
                        priority: EnumNotificationPriority.normal,
                        createdBy: proceedBy,
                        deliveries: {
                            createMany: {
                                data: [
                                    { channel: EnumNotificationChannel.email },
                                    {
                                        channel: EnumNotificationChannel.silent,
                                        processedAt: today,
                                        sentAt: today,
                                    },
                                ],
                            },
                        },
                    },
                })
            )
        );
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
            where: { userId },
        });
    }

    async findActiveUserSettingByType(
        userIds: string[],
        type: EnumNotificationType,
        channels: EnumNotificationChannel[]
    ): Promise<NotificationUserSetting[]> {
        return this.databaseService.notificationUserSetting.findMany({
            where: {
                userId: {
                    in: userIds,
                },
                type,
                channel: {
                    in: channels,
                },
                isActive: true,
            },
        });
    }

    async updateProcessAt(
        userId: string,
        notificationId: string,
        channel: EnumNotificationChannel
    ): Promise<{ title: string; body: string } | null> {
        const today = this.helperService.dateCreate();
        return this.databaseService.notification.update({
            where: { id: notificationId, userId },
            data: {
                deliveries: {
                    update: {
                        where: {
                            notificationId_channel: {
                                notificationId,
                                channel,
                            },
                        },
                        data: {
                            processedAt: today,
                        },
                    },
                },
            },
            select: { title: true, body: true },
        });
    }

    async updateSentAt(
        userId: string,
        notificationId: string,
        channel: EnumNotificationChannel,
        failureTokens: string[]
    ): Promise<void> {
        const today = this.helperService.dateCreate();
        await this.databaseService.notification.update({
            where: { id: notificationId, userId },
            data: {
                deliveries: {
                    update: {
                        where: {
                            notificationId_channel: {
                                notificationId,
                                channel,
                            },
                        },
                        data: {
                            failureTokens,
                            sentAt: today,
                        },
                    },
                },
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
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            geoLocation:
                                this.databaseUtil.toPlainObject(geoLocation),
                            createdBy: userId,
                        },
                    },
                },
            }),
            this.databaseService.notificationUserSetting.update({
                where: {
                    userId_channel_type: { userId, channel, type },
                },
                data: {
                    isActive,
                    updatedBy: userId,
                },
            }),
        ]);
    }
}
