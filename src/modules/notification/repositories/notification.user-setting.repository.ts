import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { INotificationUserSettingUpdate } from '@modules/notification/interfaces/notification.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationType,
    NotificationUserSetting,
} from '@generated/prisma-client';

@Injectable()
export class NotificationUserSettingRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil
    ) {}

    async findUserSetting(userId: string): Promise<NotificationUserSetting[]> {
        return this.databaseService.client.notificationUserSetting.findMany({
            where: { userId },
        });
    }

    async findActiveUserSettingByType(
        userIds: string[],
        type: EnumNotificationType,
        channels: EnumNotificationChannel[]
    ): Promise<NotificationUserSetting[]> {
        return this.databaseService.client.notificationUserSetting.findMany({
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

    async updateUserSetting(
        userId: string,
        { channel, type, isActive }: INotificationUserSettingUpdate,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<void> {
        await this.databaseService.client.$transaction([
            this.databaseService.client.user.update({
                where: { id: userId, deletedAt: null },
                data: {
                    updatedBy: userId,
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userUpdateNotificationSetting,
                            description: this.activityLogUtil.getDescription(
                                EnumActivityLogAction.userUpdateNotificationSetting,
                                { channel, type, isActive }
                            ),
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
            this.databaseService.client.notificationUserSetting.update({
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
