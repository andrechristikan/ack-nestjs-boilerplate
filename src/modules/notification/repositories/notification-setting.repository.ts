import { DatabaseService } from '@common/database/services/database.service';
import { Injectable } from '@nestjs/common';
import {
    EnumNotificationChannel,
    EnumNotificationSettingType,
} from '@prisma/client';

@Injectable()
export class NotificationSettingRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async isEnabled(
        userId: string,
        channel: EnumNotificationChannel,
        type: EnumNotificationSettingType
    ): Promise<boolean> {
        const setting =
            await this.databaseService.notificationSetting.findUnique({
                where: {
                    userId_channel_type: {
                        userId,
                        channel,
                        type,
                    },
                },
                select: {
                    enabled: true,
                },
            });

        return setting?.enabled ?? true;
    }
}
