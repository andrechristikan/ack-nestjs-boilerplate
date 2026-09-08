import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [NotificationRepository, NotificationUserSettingRepository],
    exports: [NotificationRepository, NotificationUserSettingRepository],
    imports: [],
})
export class NotificationRepositoryModule {}
