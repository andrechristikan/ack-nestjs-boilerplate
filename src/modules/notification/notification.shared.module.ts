import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Module } from '@nestjs/common';

@Module({
    imports: [],
    exports: [NotificationRepository, NotificationUtil],
    providers: [NotificationRepository, NotificationUtil],
    controllers: [],
})
export class NotificationSharedModule {}
