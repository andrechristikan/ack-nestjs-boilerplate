import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { INotificationUserSettingUpdate } from '@modules/notification/interfaces/notification.interface';
import type { INotificationUserSettingRepository } from '@modules/notification/interfaces/notification.user-setting-repository.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import type { NotificationUserSetting } from '@generated/prisma-client/client';

@Injectable()
export class NotificationUserSettingRepository implements INotificationUserSettingRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findUserSetting(userId: string): Promise<NotificationUserSetting[]> {
        return this.databaseService.client.notificationUserSetting.findMany({
            where: { userId },
        });
    }

    async createDefaultsInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.notificationUserSetting.createMany({
            data: Object.values(EnumNotificationChannel)
                .map(channel =>
                    Object.values(EnumNotificationType).map(type => ({
                        userId,
                        channel,
                        type,
                        isActive: true,
                    }))
                )
                .flat(),
        });
    }

    async updateUserSetting(
        userId: string,
        { channel, type, isActive }: INotificationUserSettingUpdate
    ): Promise<boolean> {
        const { count } =
            await this.databaseService.client.notificationUserSetting.updateMany(
                {
                    where: { userId, channel, type },
                    data: {
                        isActive,
                    },
                }
            );

        return count > 0;
    }
}
