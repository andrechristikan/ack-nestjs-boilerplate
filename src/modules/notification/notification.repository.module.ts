import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
    controllers: [],
    providers: [NotificationRepository, NotificationUserSettingRepository],
    exports: [NotificationRepository, NotificationUserSettingRepository],
    imports: [],
})
export class NotificationRepositoryModule {}
